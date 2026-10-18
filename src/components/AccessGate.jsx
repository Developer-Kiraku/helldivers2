'use client';
import Link from 'next/link';
import { useCommunity } from './CommunityProvider';
import Icon from './Icon';
export default function AccessGate({children,operator=false}){
 const {signedIn,canWriteNotice,ready}=useCommunity();
 if(!ready)return <div className="empty-state" role="status">회원 정보를 확인하고 있습니다…</div>;
 if(!signedIn)return <section className="access-panel"><h1>로그인이 필요합니다.</h1><Link href="/login" className="button primary">로그인</Link></section>;
 if(operator&&!canWriteNotice)return <section className="access-panel"><Icon name="lock" size={40}/><h1>운영진 전용입니다.</h1><p>공지사항은 운영자와 부운영자만 작성할 수 있습니다.</p><Link className="button secondary" href="/boards/notice">목록으로</Link></section>;
 return children;
}
