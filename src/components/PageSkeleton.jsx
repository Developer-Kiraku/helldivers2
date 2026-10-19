'use client';
import {usePathname} from 'next/navigation';

function Block({className=''}){return <div className={`skeleton-block ${className}`}/>}
function Heading(){return <div className="sk-heading"><Block className="sk-kicker"/><Block className="sk-title"/><Block className="sk-description"/></div>}
function Card(){return <div className="sk-card"><div className="sk-author"><Block className="sk-avatar"/><Block className="sk-name"/></div><Block className="sk-subtitle"/><Block/><Block className="sk-short"/></div>}
function Rows(){return <div className="sk-card">{Array.from({length:5},(_,i)=><div className="sk-row" key={i}><Block className="sk-badge"/><Block/><Block className="sk-name"/></div>)}</div>}
export function CommentsSkeleton(){return <div className="page-skeleton sk-comments" role="status" aria-label="댓글을 불러오는 중" aria-busy="true"><span className="sr-only">댓글을 불러오는 중입니다.</span><div aria-hidden="true">{[0,1].map(i=><div className="sk-comment" key={i}><div className="sk-author"><Block className="sk-avatar"/><Block className="sk-name"/></div><Block className="sk-description"/></div>)}</div></div>}

export default function PageSkeleton({path}){
 const pathname=usePathname();const route=path||pathname;
 const auth=route==='/login'||route==='/signup';
 const editor=/\/(write|edit)$/.test(route);
 const board=route.startsWith('/boards/');
 const article=board&&!editor&&route.split('/').filter(Boolean).length>2;
 const feed=/^\/boards\/(talk|qna|helstagram)$/.test(route);
 let content;
 if(auth)content=<div className="sk-auth"><div className="sk-card sk-auth-art"><Block className="sk-title"/><Block className="sk-media"/></div><div className="sk-card"><Heading/><Block className="sk-control"/><Block/><Block className="sk-control"/><Block className="sk-control"/></div></div>;
 else if(route==='/')content=<><div className="sk-card sk-hero"><Block className="sk-title"/><Block className="sk-title"/><Block className="sk-description"/><div className="sk-controls"><Block/><Block/></div></div><div className="sk-grid sk-stats">{[0,1,2].map(i=><div className="sk-card" key={i}><Block className="sk-name"/><Block className="sk-subtitle"/></div>)}</div><div className="sk-grid"><Rows/><Rows/></div><Card/></>;
 else if(editor)content=<><Heading/><div className="sk-card"><div className="sk-controls"><Block className="sk-control"/><Block className="sk-control"/></div><Block className="sk-control"/><Block className="sk-editor"/><div className="sk-controls"><Block/><Block/></div></div></>;
 else if(route==='/boards/helstagram')content=<div style={{maxWidth:540,width:'100%',margin:'0 auto'}}><Heading/><div className="sk-controls" style={{margin:'24px 0'}}><Block className="sk-control"/><Block className="sk-control"/></div><div className="sk-stack">{[0,1].map(i=><div key={i} className="sk-stack"><div className="sk-author"><Block className="sk-avatar"/><Block className="sk-name"/></div><Block className="sk-media"/><Block className="sk-short"/><Block/></div>)}</div></div>;
 else if(article)content=<><Block className="sk-name"/><div className="sk-card"><Heading/><div className="sk-author"><Block className="sk-avatar"/><Block className="sk-name"/></div><Block/><Block/><Block className="sk-description"/><Block className="sk-media"/></div><Card/></>;
 else if(route==='/profile')content=<><Heading/><div className="sk-profile"><Card/><div className="sk-stack"><Card/><Card/></div></div></>;
 else if(route.startsWith('/admin/'))content=<><Heading/><div className="sk-controls"><Block className="sk-control"/><Block className="sk-control"/></div><div className="sk-grid"><Card/><Card/><Card/><Card/></div></>;
 else content=<><Heading/><div className="sk-controls"><Block className="sk-badge"/><Block className="sk-badge"/><Block className="sk-badge"/></div><Block className="sk-control"/>{feed?<><Card/><Card/><Card/></>:<Rows/>}</>;
 return <section className={`page-skeleton ${auth?'sk-auth-page':''}`} role="status" aria-label="페이지를 불러오는 중" aria-busy="true"><span className="sr-only">페이지를 불러오는 중입니다.</span><div className="sk-stack" aria-hidden="true">{content}</div></section>;
}
