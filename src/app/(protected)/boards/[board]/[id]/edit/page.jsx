import {notFound,redirect} from 'next/navigation';
import {boards} from '@/lib/data';
import {requirePageUser} from '@/lib/server/auth';
import {readStore} from '@/lib/server/store';
import BoardEditor from '@/components/BoardEditor';
export default async function Page({params}){const {board,id}=await params;if(!boards[board])notFound();const user=await requirePageUser();const post=await readStore(db=>db.posts.find(post=>post.id===id&&post.board===board&&!post.deletedAt));if(!post)notFound();if(post.authorId!==user.id)redirect(`/boards/${board}/${id}`);return <BoardEditor board={board} id={id}/>;}
