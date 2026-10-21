import fs from 'node:fs/promises';
import { createPool, importJson } from '../src/lib/server/postgres.mjs';
const file = process.argv[2];
if (!file) throw Error('Usage: npm run db:import -- path/to/db.json');
const pool = createPool();
try {
  await importJson(pool, JSON.parse(await fs.readFile(file, 'utf8')));
  console.log('Imported community data into empty PostgreSQL database. Sessions were excluded.');
} finally {
  await pool.end();
}
