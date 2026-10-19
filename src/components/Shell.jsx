'use client';
import Nickname from './Nickname';
import {Button} from './ui';

import Link from 'next/link';
import { usePathname,useRouter } from 'next/navigation';
import { useEffect,useRef,useState } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';
import { useCommunity } from './CommunityProvider';
import { DiscordLink,KakaoChatLink } from './CommunityLinks';
import { isStaff,roleLabels } from '@/lib/roles';
import {LogIn,LogOut,Menu} from 'lucide-react';
import Modal from './Modal';
import MobileBottomNav from './MobileBottomNav';

function MobileBrandHeader({signedIn,logout,role}) {
 const [busy,setBusy]=useState(false),[open,setOpen]=useState(false);
 const pathname=usePathname();
 useEffect(()=>setOpen(false),[pathname]);
 async function signOut(){if(busy)return;setBusy(true);try{await logout();setOpen(false)}finally{setBusy(false)}}
 return <><header className="mobile-brand-header"><Link href="/" className="mobile-brand" aria-label="대시보드로 이동"><img src="/images/helldivers-logo.png" alt="HELLDIVERS II"/><span>HELLDIVERS 2 COMMUNITY</span></Link><Button type="button" className="mobile-auth-action" onClick={()=>setOpen(true)} aria-label="전체 메뉴 열기" aria-haspopup="dialog" aria-expanded={open}><Menu size={28} strokeWidth={2} aria-hidden="true"/></Button></header>{open&&<Modal className="full-menu-modal" title="전체 메뉴" onClose={()=>setOpen(false)}><nav className="full-menu" aria-label="전체 메뉴">{menu.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} aria-current={pathname===item.href?'page':undefined}><Icon name={item.icon}/><span>{item.label}</span></Link>)}{signedIn&&isStaff(role)&&<><div className="nav-section-caption">운영 관리</div><Link href="/admin/users" onClick={()=>setOpen(false)}><Icon name="users"/>회원 리스트</Link><Link href="/admin/approvals" onClick={()=>setOpen(false)}><Icon name="approvals"/>요청 승인 목록</Link></>}<div className="full-menu-divider"/><div className="sidebar-community-links"><KakaoChatLink/><DiscordLink/></div><div className="full-menu-divider"/>{signedIn?<><Link href="/profile" onClick={()=>setOpen(false)}><Avatar own/><span><Nickname own/> · 내 정보</span></Link><Button type="button" onClick={signOut} disabled={busy}><LogOut size={18}/>{busy?'로그아웃 중':'로그아웃'}</Button></>:<><Link href="/login" onClick={()=>setOpen(false)}><LogIn size={18}/>로그인</Link><Link href="/signup" onClick={()=>setOpen(false)}><Icon name="users"/>회원가입</Link></>}</nav></Modal>}</>;
}
const menu=[{href:'/',label:'대시보드',icon:'home'},{href:'/boards/notice',label:'공지사항',icon:'flag'},{href:'/boards/guide',label:'공략브리핑',icon:'target'},{href:'/boards/talk',label:'헬다이버톡',icon:'talk'},{href:'/boards/helstagram',label:'헬스타그램',icon:'camera'},{href:'/boards/qna',label:'질문상담실',icon:'question'}];
export default function Shell({children,previewSkeleton=false}){
 const pathname=usePathname(),router=useRouter();const {signedIn,role,profile,logout}=useCommunity();
 const [device,setDevice]=useState('pc'),[isFrame,setIsFrame]=useState(false),[previewRoute,setPreviewRoute]=useState(pathname);const frame=useRef(null);
 useEffect(()=>{setIsFrame(window.parent!==window)},[]);
 useEffect(()=>{setPreviewRoute(pathname);if(window.parent!==window)window.parent.postMessage({type:'helldivers-preview-route',path:pathname},window.location.origin)},[pathname]);
 useEffect(()=>{const listener=event=>{if(event.origin===window.location.origin&&event.source===frame.current?.contentWindow&&event.data?.type==='helldivers-preview-route'&&typeof event.data.path==='string'&&event.data.path.startsWith('/')&&!event.data.path.startsWith('//'))setPreviewRoute(event.data.path)};window.addEventListener('message',listener);return()=>window.removeEventListener('message',listener)},[]);
 const active=href=>href==='/'?pathname==='/':pathname.startsWith(href);
 if(!signedIn)return <><MobileBrandHeader signedIn={false}/><main id="main-content" className="guest-content">{children}</main></>;
 const mobile=device==='mobile'&&!isFrame;
 return <div className={`site-shell ${mobile?'show-mobile-preview':''}`}><a className="skip-link" href="#main-content">본문 바로가기</a><aside className="sidebar"><Link href="/" className="site-brand"><img src="/images/helldivers-logo.png" alt="HELLDIVERS II"/><span>HELLDIVERS 2 COMMUNITY</span></Link><nav className="desktop-nav" aria-label="주 메뉴">{menu.map(item=><Link key={item.href} href={item.href} className={active(item.href)?'active':''}><Icon name={item.icon}/><span>{item.label}</span></Link>)}{isStaff(role)&&<><div className="nav-section-caption">운영 관리</div><Link href="/admin/users" className={active('/admin/users')?'active':''}><Icon name="users"/><span>회원 리스트</span></Link><Link href="/admin/approvals" className={active('/admin/approvals')?'active':''}><Icon name="approvals"/><span>요청 승인 목록</span></Link></>}</nav><div className="sidebar-bottom"><div className="sidebar-community-links"><KakaoChatLink/><DiscordLink/></div><div className="sidebar-account"><Avatar own/><div><Link href="/profile" className="account-name"><Nickname own/> 님</Link><small>{roleLabels[role]}</small><div className="account-actions"><Link href="/profile"><Icon name="settings" size={14}/>내 정보</Link><Button onClick={logout}><Icon name="logout" size={14}/>로그아웃</Button></div></div></div></div></aside><MobileBrandHeader signedIn={signedIn} logout={logout} role={role}/><div className="main-column">{!isFrame&&<section className="preview-controls"><span>{roleLabels[role]} · <Nickname own/></span><div className="segmented" aria-label="화면 크기"><Button className={device==='pc'?'selected':''} onClick={()=>{setDevice('pc');if(previewRoute!==pathname)router.push(previewRoute)}}><Icon name="desktop" size={16}/>PC</Button><Button className={device==='mobile'?'selected':''} onClick={()=>setDevice('mobile')}><Icon name="mobile" size={16}/>모바일</Button></div></section>}{mobile?<div className="phone-preview"><iframe ref={frame} src={previewRoute} title="전체 사이트 모바일 화면"/></div>:<main id="main-content" className="page-content">{children}</main>}</div><MobileBottomNav boards={menu.filter(item=>item.href.startsWith('/boards/')&&item.href!=='/boards/notice')}/></div>;
}
