'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Camera, Search, SquarePlus, Heart } from 'lucide-react';
import { Button, Input, Label } from './ui';
import { matchesBoardFilters } from '@/lib/board-search.mjs';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import Avatar from './Avatar';
import Nickname from './Nickname';
import HelstagramPost from './HelstagramPost';
import './helstagram.css';

export default function HelstagramPage() {
  const { posts } = useCommunity();
  const allPosts = posts.helstagram;
  const [count, setCount] = useState(10);
  const [draft, setDraft] = useState({author:'', content:''}), [filters, setFilters] = useState({author:'', content:''});
  const filtered = allPosts.filter(post => matchesBoardFilters({...post, content:[post.title, post.content].filter(Boolean).join('\n')}, filters));
  const visible = filtered.slice(0, count), hasFilters = Object.values(filters).some(Boolean);
  const photographers = [...new Map(allPosts.map(post => [post.authorId, post])).values()].slice(0, 5);
  function apply(next) { setFilters(next); setDraft(next); setCount(10); }
  return <AccessGate><div className="helstagram-page">
    <header className="helsta-heading"><div><h1>Helstagram<span aria-hidden="true">.</span></h1><p>우리의 강하, 한 장의 기록.</p></div><div><Link className="helsta-upload" href="/boards/helstagram/write" aria-label="사진 올리기"><SquarePlus size={25}/><span>사진 올리기</span></Link></div></header>
    <div className="helsta-layout"><div className="helsta-main">
      <form className="helsta-simple-search" aria-label="헬스타그램 검색" onSubmit={event => { event.preventDefault(); apply({author:draft.author.trim(), content:draft.content.trim()}); }}>
        <Label htmlFor="helsta-author-search">닉네임<Input id="helsta-author-search" aria-label="닉네임 검색" placeholder="닉네임 검색" value={draft.author} onChange={event => setDraft(current => ({...current, author:event.target.value}))} maxLength={100}/></Label>
        <Label htmlFor="helsta-content-search">내용<Input id="helsta-content-search" aria-label="내용 검색" placeholder="내용 검색" value={draft.content} onChange={event => setDraft(current => ({...current, content:event.target.value}))} maxLength={200}/></Label>
        <Button type="submit"><Search size={17}/>검색</Button>
      </form>
      {hasFilters && <div className="helsta-filter-summary"><span>검색 결과 {filtered.length}개</span><Button type="button" className="helsta-text-button" onClick={() => apply({author:'', content:''})}>검색 초기화</Button></div>}
      <section className="helsta-feed" aria-label="헬스타그램 게시글">{visible.map(post => <HelstagramPost key={post.id} post={post}/>)}</section>
      {!filtered.length && <div className="helsta-empty"><span><Camera size={38}/></span><h2>{hasFilters ? '검색된 사진이 없어요' : '우리의 첫 사진을 기다려요'}</h2><p>{hasFilters ? '다른 검색어와 조건으로 찾아보세요.' : '분대와 함께한 순간부터 오늘의 스크린샷까지.'}</p><Link href="/boards/helstagram/write">첫 사진 올리기</Link></div>}
      {filtered.length > count && <Button type="button" className="helsta-more" onClick={() => setCount(value => value + 10)}>사진 더 보기</Button>}
      {filtered.length > 0 && filtered.length <= count && <p className="helsta-feed-end">모든 순간을 둘러봤어요 <Heart size={14}/></p>}
    </div><aside className="helsta-sidebar"><Link href="/profile" className="helsta-my-profile"><Avatar own size="large"/><div><strong><Nickname own/></strong><span>나의 강하 기록</span></div><span>내 정보</span></Link><div className="helsta-sidebar-heading"><h2>함께 기록하는 대원들</h2><span>{photographers.length}명</span></div>{photographers.map(post => <div className="helsta-photographer" key={post.authorId}><Avatar name={post.author} own={post.own} photo={post.authorPhoto}/><div><strong><Nickname name={post.author} role={post.authorRole} own={post.own}/></strong><span>공유한 순간 {allPosts.filter(item => item.authorId === post.authorId).length}개</span></div><Camera size={17}/></div>)}{!photographers.length && <p className="helsta-sidebar-note">대원들의 사진이 모이면<br/>이곳에서 함께 만나볼 수 있어요.</p>}<div className="helsta-sidebar-note"><p>오늘의 작전도, 평범한 하루도.<br/>동료들과 함께 기억해요.</p><span>HELLDIVERS 2 COMMUNITY</span></div></aside></div>
  </div></AccessGate>;
}
