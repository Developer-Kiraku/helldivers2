import pg from 'pg';

// Entity tables retain the existing domain objects, including nested poll data.
// One database row lock serializes domain transactions across server processes.
export const collections = {
 users: ['hd_users',row=>row.id], posts:['hd_posts',row=>row.id],
 comments:['hd_comments',row=>row.id], votes:['hd_votes',row=>JSON.stringify([row.userId,row.postId])],
 requests:['hd_requests',row=>row.id], sessions:['hd_sessions',row=>row.tokenHash],
 audit:['hd_audit',row=>row.id], pendingRegistrations:['hd_registrations',row=>row.ticketHash],
};
export function createPool(connectionString=process.env.DATABASE_URL) {
 if(!connectionString)throw Error('DATABASE_URL is required');
 const url=new URL(connectionString);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw Error('DATABASE_URL must use PostgreSQL');
 const privateHost=['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname)||!url.hostname.includes('.');
 const mode=process.env.DATABASE_SSL||'auto';
 if(!['auto','verify-full','disable'].includes(mode))throw Error('Invalid DATABASE_SSL');
 if(!privateHost&&(mode==='disable'||url.searchParams.get('sslmode')==='disable'))throw Error('External database connections require verified TLS');
 const tls=mode==='verify-full'||(!privateHost&&mode!=='disable');
 if(tls){for(const key of ['sslmode','uselibpqcompat','sslcert','sslkey','sslrootcert'])url.searchParams.delete(key)}
 return new pg.Pool({connectionString:url.href,max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000,allowExitOnIdle:true,application_name:'helldivers2',...(tls?{ssl:{rejectUnauthorized:true,...(process.env.DATABASE_CA_CERT?{ca:process.env.DATABASE_CA_CERT.replaceAll('\\n','\n')}:{})}}:{})});
}
export async function migrate(pool) {
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(18420, 1)');
  await client.query('CREATE TABLE IF NOT EXISTS hd_meta (id integer PRIMARY KEY CHECK(id=1), data jsonb NOT NULL)');
  await client.query("INSERT INTO hd_meta(id,data) VALUES(1,'{}') ON CONFLICT DO NOTHING");
  for(const [table] of Object.values(collections))await client.query(`CREATE TABLE IF NOT EXISTS ${table} (id text PRIMARY KEY, position integer NOT NULL, data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'))`);
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS hd_users_login ON hd_users ((data->>'loginId')) WHERE data->>'loginId' IS NOT NULL");
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS hd_users_kakao ON hd_users ((data->'kakao'->>'id')) WHERE data->'kakao'->>'id' IS NOT NULL");
  await client.query("CREATE INDEX IF NOT EXISTS hd_posts_board ON hd_posts ((data->>'board'))");
  await client.query("CREATE INDEX IF NOT EXISTS hd_comments_post ON hd_comments ((data->>'postId'))");
  await client.query("CREATE INDEX IF NOT EXISTS hd_sessions_user ON hd_sessions ((data->>'userId'))");
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
function rowsFor(db,key) {
 const getId=collections[key][1],rows=new Map();
 for(const [position,item] of (db[key]||[]).entries()) {
  const id=getId(item);if(!id||rows.has(id))throw Error(`Invalid or duplicate record in ${key}`);
  rows.set(id,{position,json:JSON.stringify(item)});
 }
 return rows;
}
const snapshot=db=>Object.fromEntries(Object.keys(collections).map(key=>[key,rowsFor(db,key)]));
async function load(client,metadata) {
 const db={...metadata};
 for(const [key,[table]] of Object.entries(collections)){const {rows}=await client.query(`SELECT data FROM ${table} ORDER BY position,id`);db[key]=rows.map(row=>row.data)}
 return db;
}
async function save(client,db,previous={}) {
 for(const [key,[table]] of Object.entries(collections)) {
  const before=previous[key]||new Map(),after=rowsFor(db,key);
  const removed=[...before.keys()].filter(id=>!after.has(id));
  if(removed.length)await client.query(`DELETE FROM ${table} WHERE id=ANY($1::text[])`,[removed]);
  for(const [id,row] of after) {
   const old=before.get(id);if(old?.json===row.json&&old.position===row.position)continue;
   await client.query(`INSERT INTO ${table}(id,position,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO UPDATE SET position=EXCLUDED.position,data=EXCLUDED.data`,[id,row.position,row.json]);
  }
 }
 const metadata=Object.fromEntries(Object.entries(db).filter(([key])=>!collections[key]));
 await client.query('UPDATE hd_meta SET data=$1::jsonb WHERE id=1',[JSON.stringify(metadata)]);
}
export async function postgresTransaction(pool,callback,{write=true,seed,settle=()=>false}={}) {
 const client=await pool.connect();let done=false;
 try {
  await client.query('BEGIN');
  const {rows}=await client.query('SELECT data FROM hd_meta WHERE id=1 FOR UPDATE');
  if(!rows.length)throw Error('Database is not initialized. Run npm run db:migrate');
  let db=await load(client,rows[0].data);
  if(!db.schemaVersion){db=seed?seed():{schemaVersion:1,...Object.fromEntries(Object.keys(collections).map(key=>[key,[]]))};await save(client,db)}
  const before=snapshot(db);
  if(settle(db))await save(client,db,before);
  const baseline=snapshot(db);
  await client.query('SAVEPOINT domain_operation');
  try {
   const result=await callback(db);
   if(write)await save(client,db,baseline);
   await client.query('COMMIT');done=true;return result;
  }catch(error){
   // Keep automatic membership expiry even when the API request is rejected.
   await client.query('ROLLBACK TO SAVEPOINT domain_operation');
   await client.query('COMMIT');done=true;throw error;
  }
 }catch(error){if(!done)await client.query('ROLLBACK');throw error}finally{client.release()}
}
export async function importJson(pool,db) {
 if(db.schemaVersion!==1||!Array.isArray(db.users)||!Array.isArray(db.posts))throw Error('Unsupported community JSON file');
 await migrate(pool);
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const {rows}=await client.query('SELECT data FROM hd_meta WHERE id=1 FOR UPDATE');
  if(rows[0].data.schemaVersion)throw Error('Import requires an empty destination database');
  for(const [table] of Object.values(collections)){const result=await client.query(`SELECT 1 FROM ${table} LIMIT 1`);if(result.rowCount)throw Error('Import requires empty entity tables')}
  // Sessions and OAuth registration tickets are deliberately not transferred.
  await save(client,{...db,sessions:[],pendingRegistrations:[]});
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
