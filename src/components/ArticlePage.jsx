'use client';
import {Button,Label,TextArea} from './ui';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {boards} from '@/lib/data';
import {useCommunity} from './CommunityProvider';
import AccessGate from './AccessGate';
import {CommentsSkeleton} from './PageSkeleton';
import IdentityStrip from './IdentityStrip';
import Avatar from './Avatar';
import Icon from './Icon';
import VoteButtons from './VoteButtons';
import ModerationActions from './ModerationActions';
export default function ArticlePage({board,id}){
 const {posts,profile,api,notify}=useCommunity();const post=posts[board].find(item=>item.id===id||item.id===`${board}-${id}`);
 const [commentsLoading,setCommentsLoading]=useState(true);
 const [comments,setComments]=useState([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let alive=true;setCommentsLoading(true);if(post)api(`posts/${post.id}`).then(data=>{if(alive)setComments(data.comments)}).catch(error=>{if(alive)setError(error.message)}).finally(()=>{if(alive)setCommentsLoading(false)});return()=>{alive=false}},[post?.id,api]);
 async function addComment(event){event.preventDefault();if(!post||!draft.trim())return;setBusy(true);try{const data=await api(`posts/${post.id}/comments`,{method:'POST',body:{body:draft}});setComments(current=>[...current,data.comment]);setDraft('');notify('댓글을 등록했습니다.')}catch(error){setError(error.message)}finally{setBusy(false)}}
 async function share(){try{await navigator.clipboard.writeText(location.href);notify('게시글 주소를 복사했습니다.')}catch{notify('브라우저 주소창의 링크를 복사해주세요.')}}
 return <AccessGate><div className="article-page"><IdentityStrip/><Link className="back-link" href={`/boards/${board}`}><Icon name="back" size={16}/>{boards[board].label} 목록으로</Link>{!post?<div className="empty-state"><h1>게시글을 찾을 수 없습니다.</h1><p>삭제되었거나 접근할 수 없는 게시글입니다.</p></div>:<><article className="article-paper"><span className="badge">{post.category}</span><h1>{post.title}</h1><div className="article-meta"><span className="author-inline"><Avatar name={post.author} own={post.own} photo={post.authorPhoto}/>{post.own?profile.nickname:post.author}</span><time>{post.date}</time><span>댓글 {comments.length}</span></div><div className="article-copy">{post.bodyHtml?<div dangerouslySetInnerHTML={{__html:post.bodyHtml}}/>:<><p className="preserve-lines">{post.content}</p>{post.images?.map((src,index)=><img className="article-image" key={`${post.id}-${index}`} src={src} alt={`본문 이미지 ${index+1}`}/>)}</>}</div><div className="article-votes"><VoteButtons postId={post.id} likes={post.likes} dislikes={post.dislikes} myVote={post.myVote}/></div><ModerationActions post={post}/><footer className="article-actions"><Link href={`/boards/${board}`}><Icon name="back" size={15}/>목록으로</Link><Button onClick={share}>공유 ↗</Button></footer></article><section className="comment-panel"><h2>댓글 <span>{comments.length}</span></h2>{commentsLoading?<CommentsSkeleton/>:<ul className="comments-list">{comments.map(comment=><li key={comment.id}><div className="author-inline"><Avatar name={comment.author} own={comment.own} photo={comment.authorPhoto}/><strong>{comment.own?profile.nickname:comment.author}</strong></div><p>{comment.body}</p><time>{new Date(comment.createdAt).toLocaleString('ko-KR')}</time></li>)}</ul>}<form onSubmit={addComment}><Label htmlFor="comment-body">댓글 작성</Label><TextArea id="comment-body" placeholder="동료에게 따뜻한 한마디를 남겨주세요." value={draft} onChange={e=>setDraft(e.target.value)} required maxLength={1000}/><p className="form-error" role="alert">{error}</p><div className="form-actions"><Button className="button primary" disabled={busy}>{busy?'등록 중…':'댓글 등록'}</Button></div></form></section></>}</div></AccessGate>;
}
