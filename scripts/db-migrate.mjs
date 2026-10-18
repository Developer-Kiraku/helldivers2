import {createPool,migrate} from '../src/lib/server/postgres.mjs';
const pool=createPool();
try{await migrate(pool);console.log('PostgreSQL schema ready')}finally{await pool.end()}
