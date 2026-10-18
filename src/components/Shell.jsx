'use client';
import {Button} from './ui';

import Link from 'next/link';
import { usePathname,useRouter } from 'next/navigation';
import { useEffect,useRef,useState } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';
import { useCommunity } from './CommunityProvider';
import { DiscordLink,KakaoChatLink } from './CommunityLinks';
import { isStaff,roleLabels } from '@/lib/roles';
import {LogIn,LogOut} from 'lucide-react';

function MobileBrandHeader({signedIn,logout}) {
 const [busy,setBusy]=useState(false);
 async function signOut(){if(busy)return;setBusy(true);try{await logout()}finally{setBusy(false)}}
 return <header className="mobile-brand-header"><Link href="/" className="mobile-brand" aria-label="대시보드로 이동"><img src="/images/helldivers-logo.png" alt="HELLDIVERS II"/><span>HELLDIVERS 2 COMMUNITY</span></Link>{signedIn?<Button type="button" className="mobile-auth-action" onClick={signOut} disabled={busy} aria-label={busy?'로그아웃 중':'로그아웃'} title="로그아웃"><LogOut size={18} aria-hidden="true"/><span>{busy?'처리 중':'로그아웃'}</span></Button>:<Link className="mobile-auth-action" href="/login" aria-label="로그인" title="로그인"><LogIn size={18} aria-hidden="true"/><span>로그인</span></Link>}</header>;
}
const menu=[{href:'/',label:'대시보드',icon:'home'},{href:'/boards/notice',label:'공지사항',icon:'flag'},{href:'/boards/guide',label:'공략브리핑',icon:'target'},{href:'/boards/talk',label:'헬다이버톡',icon:'talk'},{href:'/boards/qna',label:'질문상담실',icon:'question'}];
export default function Shell({children,previewSkeleton=false}){
 const pathname=usePathname(),router=useRouter();const {signedIn,role,profile,logout}=useCommunity();
 const [device,setDevice]=useState('pc'),[isFrame,setIsFrame]=useState(false),[previewRoute,setPreviewRoute]=useState(pathname);const frame=useRef(null);
 useEffect(()=>{setIsFrame(window.parent!==window)},[]);
 useEffect(()=>{setPreviewRoute(pathname);if(window.parent!==window)window.parent.postMessage({type:'helldivers-preview-route',path:pathname},window.location.origin)},[pathname]);
 useEffect(()=>{const listener=event=>{if(event.origin===window.location.origin&&event.source===frame.current?.contentWindow&&event.data?.type==='helldivers-preview-route'&&typeof event.data.path==='string'&&event.data.path.startsWith('/')&&!event.data.path.startsWith('//'))setPreviewRoute(event.data.path)};window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener)},[]);
 const active=href=>href==='/'?pathname==='/':pathname.startsWith(href);
 if(!signedIn)return <><MobileBrandHeader signedIn={false}/><main id="main-content" className="guest-content">{children}</main></>;
 const mobile=device==='mobile'&&!isFrame;
 return <div className={`site-shell ${mobile?'show-mobile-preview':''}`}><a className="skip-link" href="#main-content">본문 바로가기</a><aside className="sidebar"><Link href="/" className="site-brand"><img src="/images/helldivers-logo.png" alt="HELLDIVERS II"/><span>HELLDIVERS 2 COMMUNITY</span></Link><nav className="desktop-nav" aria-label="주 메뉴">{menu.map(item=><Link key={item.href} href={item.href} className={active(item.href)?'active':''}><Icon name={item.icon}/><span>{item.label}</span></Link>)}{isStaff(role)&&<><div className="nav-section-caption">운영 관리</div><Link href="/admin/users" className={active('/admin/users')?'active':''}><Icon name="users"/><span>회원 리스트</span></Link><Link href="/admin/approvals" className={active('/admin/approvals')?'active':''}><Icon name="approvals"/><span>요청 승인 목록</span></Link></>}</nav><div className="sidebar-bottom"><div className="sidebar-community-links"><KakaoChatLink/><DiscordLink/></div><div className="sidebar-account"><Avatar own/><div><Link href="/profile" className="account-name">{profile.nickname} 님</Link><small>{roleLabels[role]}</small><div className="account-actions"><Link href="/profile"><Icon name="settings" size={14}/>내 정보</Link><Button onClick={logout}><Icon name="logout" size={14}/>로그아웃</Button></div></div></div></div></aside><MobileBrandHeader signedIn={signedIn} logout={logout}/><div className="main-column">{!isFrame&&<section className="preview-controls"><span>{roleLabels[role]} · {profile.nickname}</span><div className="segmented" aria-label="화면 크기"><Button className={device==='pc'?'selected':''} onClick={()=>{setDevice('pc');if(previewRoute!==pathname)router.push(previewRoute)}}><Icon name="desktop" size={16}/>PC</Button><Button className={device==='mobile'?'selected':''} onClick={()=>setDevice('mobile')}><Icon name="mobile" size={16}/>모바일</Button></div></section>}{mobile?<div className="phone-preview"><iframe ref={frame} src={previewRoute} title="전체 사이트 모바일 화면"/></div>:<main id="main-content" className="page-content">{children}</main>}</div><nav className="mobile-nav" aria-label="모바일 메뉴">{menu.filter(item=>item.href!=='/').map(item=><Link key={item.href} aria-label={item.label} className={active(item.href)?'active':''} href={item.href}><Icon name={item.icon}/><span>{item.label}</span></Link>)}<Link href="/profile"><Avatar own/><span>내 정보</span></Link></nav></div>;
}
