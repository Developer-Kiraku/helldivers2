import pg from 'pg';

// Entity tables retain the existing domain objects, including nested poll data.
// One database row lock serializes domain transactions across server processes.
export const collections = {
  users: ['hd_users', (row) => row.id],
  posts: ['hd_posts', (row) => row.id],
  comments: ['hd_comments', (row) => row.id],
  notifications: ['hd_notifications', (row) => row.id],
  puzzleRuns: ['hd_puzzle_runs', (row) => row.id],
  puzzleRecords: ['hd_puzzle_records', (row) => row.id],
  puzzleRewards: ['hd_puzzle_rewards', (row) => row.id],
  diceGames: ['hd_dice_games', (row) => row.id],
  dicePresence: ['hd_dice_presence', (row) => row.id],
  rpsRounds: ['hd_rps_rounds', (row) => row.id],
  stratagemRuns: ['hd_stratagem_runs', (row) => row.id],
  pointLedger: ['hd_point_ledger', (row) => row.id],
  pointGrants: ['hd_point_grants', (row) => row.id],
  messages: ['hd_messages', (row) => row.id],
  votes: ['hd_votes', (row) => JSON.stringify([row.userId, row.postId])],
  requests: ['hd_requests', (row) => row.id],
  sessions: ['hd_sessions', (row) => row.tokenHash],
  audit: ['hd_audit', (row) => row.id],
  pendingRegistrations: ['hd_registrations', (row) => row.ticketHash],
};
export function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw Error('DATABASE_URL is required');
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw Error('DATABASE_URL must use PostgreSQL');
  const privateHost =
    ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) ||
    !url.hostname.includes('.');
  const mode = process.env.DATABASE_SSL || 'auto';
  if (!['auto', 'verify-full', 'disable'].includes(mode)) throw Error('Invalid DATABASE_SSL');
  if (!privateHost && (mode === 'disable' || url.searchParams.get('sslmode') === 'disable'))
    throw Error('External database connections require verified TLS');
  const tls = mode === 'verify-full' || (!privateHost && mode !== 'disable');
  if (tls) {
    for (const key of ['sslmode', 'uselibpqcompat', 'sslcert', 'sslkey', 'sslrootcert'])
      url.searchParams.delete(key);
  }
  return new pg.Pool({
    connectionString: url.href,
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: true,
    application_name: 'helldivers2',
    ...(tls
      ? {
          ssl: {
            rejectUnauthorized: true,
            ...(process.env.DATABASE_CA_CERT
              ? { ca: process.env.DATABASE_CA_CERT.replaceAll('\\n', '\n') }
              : {}),
          },
        }
      : {}),
  });
}
export async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(18420, 1)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS hd_meta (id integer PRIMARY KEY CHECK(id=1), data jsonb NOT NULL)',
    );
    await client.query("INSERT INTO hd_meta(id,data) VALUES(1,'{}') ON CONFLICT DO NOTHING");
    for (const [table] of Object.values(collections))
      await client.query(
        `CREATE TABLE IF NOT EXISTS ${table} (id text PRIMARY KEY, position integer NOT NULL, data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'))`,
      );
    await client.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS hd_users_login ON hd_users ((data->>'loginId')) WHERE data->>'loginId' IS NOT NULL",
    );
    await client.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS hd_users_kakao ON hd_users ((data->'kakao'->>'id')) WHERE data->'kakao'->>'id' IS NOT NULL",
    );
    await client.query("CREATE INDEX IF NOT EXISTS hd_posts_board ON hd_posts ((data->>'board'))");
    await client.query(
      "CREATE INDEX IF NOT EXISTS hd_comments_post ON hd_comments ((data->>'postId'))",
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS hd_sessions_user ON hd_sessions ((data->>'userId'))",
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
function rowsFor(db, key) {
  const getId = collections[key][1],
    rows = new Map();
  for (const [position, item] of (db[key] || []).entries()) {
    const id = getId(item);
    if (!id || rows.has(id)) throw Error(`Invalid or duplicate record in ${key}`);
    rows.set(id, { position, json: JSON.stringify(item) });
  }
  return rows;
}
const metadataFor = (db) =>
  Object.fromEntries(Object.entries(db).filter(([key]) => !collections[key]));
const snapshot = (db, keys = Object.keys(collections)) =>
  Object.fromEntries(keys.map((key) => [key, rowsFor(db, key)]));
async function load(client, metadata, keys) {
  const db = { ...metadata };
  // Keep the same locked snapshot without a network round trip for every table.
  const union = keys
    .map((key) => `SELECT '${key}' AS collection,position,id,data FROM ${collections[key][0]}`)
    .join(' UNION ALL ');
  const { rows } = await client.query(
    `SELECT collection,data FROM (${union}) AS entities ORDER BY collection,position,id`,
  );
  for (const key of keys) db[key] = [];
  for (const row of rows) db[row.collection].push(row.data);
  return db;
}
async function save(client, db, previous = {}, keys = Object.keys(collections), previousMetadata) {
  for (const key of Object.keys(collections))
    if (!keys.includes(key) && db[key] !== undefined)
      throw Error('Collection outside transaction scope: ' + key);
  for (const key of keys) {
    const [table] = collections[key];
    const before = previous[key] || new Map(),
      after = rowsFor(db, key);
    const removed = [...before.keys()].filter((id) => !after.has(id));
    if (removed.length)
      await client.query(`DELETE FROM ${table} WHERE id=ANY($1::text[])`, [removed]);
    for (const [id, row] of after) {
      const old = before.get(id);
      if (old?.json === row.json && old.position === row.position) continue;
      await client.query(
        `INSERT INTO ${table}(id,position,data) VALUES($1,$2,$3::jsonb) ON CONFLICT(id) DO UPDATE SET position=EXCLUDED.position,data=EXCLUDED.data`,
        [id, row.position, row.json],
      );
    }
  }
  const metadata = JSON.stringify(metadataFor(db));
  if (metadata !== previousMetadata)
    await client.query('UPDATE hd_meta SET data=$1::jsonb WHERE id=1', [metadata]);
}
export async function postgresTransaction(
  pool,
  callback,
  { write = true, seed, settle = () => false, collections: selected } = {},
) {
  const keys = selected ? [...new Set(selected)] : Object.keys(collections);
  if (!keys.length || keys.some((key) => !Object.hasOwn(collections, key)))
    throw Error('Invalid transaction scope');
  const client = await pool.connect();
  let done = false;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT data FROM hd_meta WHERE id=1 FOR UPDATE');
    if (!rows.length) throw Error('Database is not initialized. Run npm run db:migrate');
    let db = await load(client, rows[0].data, keys);
    if (!db.schemaVersion) {
      db = seed
        ? seed()
        : {
            schemaVersion: 1,
            ...Object.fromEntries(Object.keys(collections).map((key) => [key, []])),
          };
      await save(client, db);
      if (selected)
        db = { ...metadataFor(db), ...Object.fromEntries(keys.map((key) => [key, db[key] || []])) };
    }
    const before = snapshot(db, keys);
    const beforeMetadata = JSON.stringify(metadataFor(db));
    const settled = settle(db);
    if (settled) await save(client, db, before, keys, beforeMetadata);
    const baseline = settled ? snapshot(db, keys) : before;
    const baselineMetadata = settled ? JSON.stringify(metadataFor(db)) : beforeMetadata;
    await client.query('SAVEPOINT domain_operation');
    try {
      const result = await callback(db);
      if (write) await save(client, db, baseline, keys, baselineMetadata);
      await client.query('COMMIT');
      done = true;
      return result;
    } catch (error) {
      // Keep automatic membership expiry even when the API request is rejected.
      await client.query('ROLLBACK TO SAVEPOINT domain_operation');
      await client.query('COMMIT');
      done = true;
      throw error;
    }
  } catch (error) {
    if (!done) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export async function importJson(pool, db) {
  if (db.schemaVersion !== 1 || !Array.isArray(db.users) || !Array.isArray(db.posts))
    throw Error('Unsupported community JSON file');
  await migrate(pool);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT data FROM hd_meta WHERE id=1 FOR UPDATE');
    if (rows[0].data.schemaVersion) throw Error('Import requires an empty destination database');
    for (const [table] of Object.values(collections)) {
      const result = await client.query(`SELECT 1 FROM ${table} LIMIT 1`);
      if (result.rowCount) throw Error('Import requires empty entity tables');
    }
    // Sessions and OAuth registration tickets are deliberately not transferred.
    await save(client, { ...db, sessions: [], pendingRegistrations: [] });
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
