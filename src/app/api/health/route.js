import {readStore} from '@/lib/server/store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {
 try{await readStore(()=>null);return Response.json({ok:true,storage:process.env.DATABASE_URL?'postgresql':'json'},{headers:{'Cache-Control':'no-store'}})}
 catch{return Response.json({ok:false},{status:503,headers:{'Cache-Control':'no-store'}})}
}
