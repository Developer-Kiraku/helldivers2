import {spawn} from 'node:child_process';
import {createPool,migrate} from '../src/lib/server/postgres.mjs';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required on Render; refusing to use ephemeral JSON storage');
const pool=createPool();try{await migrate(pool)}finally{await pool.end()}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port',process.env.PORT||'10000'],{stdio:'inherit',env:process.env});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{process.exitCode=code??1});
child.on('error',()=>{console.error('Failed to start web server');process.exitCode=1});
