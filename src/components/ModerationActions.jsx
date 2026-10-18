'use client';
import {ActionLink,Button,Label,TextArea} from './ui';

import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useCommunity} from './CommunityProvider';
import Modal from './Modal';
export default function ModerationActions({post}){
 const {api,refresh,notify}=useCommunity(),router=useRouter();const [action,setAction]=useState(null),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event){event.preventDefault();setBusy(true);setError('');try{if(action==='delete'){await api(`posts/${post.id}`,{method:'DELETE',body:{reason}});await refresh();notify('게시글을 삭제했습니다.');router.push(`/boards/${post.board}`)}else{await api('admin/requests',{method:'POST',body:{type:'post_delete',targetId:post.id,reason}});notify('운영자에게 삭제 요청을 보냈습니다.')}setAction(null)}catch(error){setError(error.message)}finally{setBusy(false)}}
 if(!post.canEdit&&!post.canDelete&&!post.canRequestDelete)return null;
 return <><div className="moderation-actions">{post.canEdit&&<ActionLink className="button secondary" href={`/boards/${post.board}/${post.id}/edit`}>수정</ActionLink>}{post.canDelete&&<Button className="button danger-outline" onClick={()=>{setAction('delete');setReason('');setError('')}}>삭제</Button>}{post.canRequestDelete&&<Button className="button secondary" onClick={()=>{setAction('request');setReason('');setError('')}}>운영자에게 삭제 요청</Button>}</div>{action&&<Modal title={action==='delete'?'게시글 삭제':'게시글 삭제 요청'} onClose={()=>setAction(null)}><form onSubmit={submit}><p>{post.title}</p><Label htmlFor="moderation-reason">{action==='delete'?'삭제':'요청'} 사유</Label><TextArea id="moderation-reason" value={reason} onChange={e=>setReason(e.target.value)} required minLength={2} maxLength={1000}/><p className="field-hint">{action==='delete'?'삭제하면 게시판 목록에서 즉시 숨겨집니다.':'운영자가 승인해야 게시글이 삭제됩니다.'}</p><p className="form-error" role="alert">{error}</p><div className="form-actions"><Button type="button" className="button secondary" onClick={()=>setAction(null)}>취소</Button><Button className="button primary" disabled={busy}>{busy?'처리 중…':action==='delete'?'삭제하기':'요청 보내기'}</Button></div></form></Modal>}</>;
}
