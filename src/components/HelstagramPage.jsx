'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Camera, Search, Plus, X, Heart } from 'lucide-react';
import { Button, Input } from './ui';
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
  const [searchType, setSearchType] = useState('content'), [draft, setDraft] = useState('');
  const [filters, setFilters] = useState({author:'', content:''});
  const filtered = allPosts.filter(post => matchesBoardFilters({...post, content:[post.title, post.content].filter(Boolean).join('\n')}, filters));
  const visible = filtered.slice(0, count), hasFilters = Object.values(filters).some(Boolean);
  const photographers = [...new Map(allPosts.map(post => [post.authorId, post])).values()].slice(0, 5);
  function apply() { setFilters({author:'', content:'', [searchType]:draft.trim()}); setCount(10); }
  function reset() { setFilters({author:'', content:''}); setDraft(''); setCount(10); }
  return <AccessGate><div className="helstagram-page">
    <h1 className="sr-only">헬스타그램</h1>
    <div className="helsta-layout"><div className="helsta-main">
      <form className="helsta-search-panel" role="search" aria-label="헬스타그램 검색" onSubmit={event => { event.preventDefault(); apply(); }}>
        <div className="helsta-search-top"><div className="helsta-search-modes" role="group" aria-label="검색 대상">{[['content','내용'],['author','닉네임']].map(([value,label]) => <Button key={value} type="button" aria-pressed={searchType === value} onClick={() => setSearchType(value)}>{label}</Button>)}</div><Link className="helsta-create" href="/boards/helstagram/write"><Plus size={17}/><span>사진 올리기</span></Link></div>
        <div className="helsta-search-field"><Search size={19} aria-hidden="true"/><Input aria-label={searchType === 'author' ? '닉네임 검색' : '내용 검색'} placeholder={searchType === 'author' ? '찾고 싶은 대원의 닉네임' : '어떤 순간을 찾고 있나요?'} value={draft} onChange={event => setDraft(event.target.value)} maxLength={200}/>{draft && <Button type="button" className="helsta-clear-search" aria-label="검색어 지우기" onClick={() => setDraft('')}><X size={15}/></Button>}<Button type="submit" className="helsta-search-submit">검색</Button></div>
      </form>
      {hasFilters && <div className="helsta-filter-summary" role="status"><span>{filters.author ? '닉네임' : '내용'} · “{filters.author || filters.content}” <strong>{filtered.length}개</strong></span><Button type="button" className="helsta-text-button" onClick={reset}>초기화</Button></div>}
      <section className="helsta-feed" aria-label="헬스타그램 게시글">{visible.map(post => <HelstagramPost key={post.id} post={post}/>)}</section>
      {!filtered.length && <div className="helsta-empty"><span><Camera size={38}/></span><h2>{hasFilters ? '검색된 사진이 없어요' : '우리의 첫 사진을 기다려요'}</h2><p>{hasFilters ? '다른 검색어와 조건으로 찾아보세요.' : '분대와 함께한 순간부터 오늘의 스크린샷까지.'}</p><Link href="/boards/helstagram/write">첫 사진 올리기</Link></div>}
      {filtered.length > count && <Button type="button" className="helsta-more" onClick={() => setCount(value => value + 10)}>사진 더 보기</Button>}
      {filtered.length > 0 && filtered.length <= count && <p className="helsta-feed-end">모든 순간을 둘러봤어요 <Heart size={14}/></p>}
    </div><aside className="helsta-sidebar"><Link href="/profile" className="helsta-my-profile"><Avatar own size="large"/><div><strong><Nickname own/></strong><span>나의 강하 기록</span></div><span>내 정보</span></Link><div className="helsta-sidebar-heading"><h2>함께 기록하는 대원들</h2><span>{photographers.length}명</span></div>{photographers.map(post => <div className="helsta-photographer" key={post.authorId}><Avatar name={post.author} own={post.own} photo={post.authorPhoto}/><div><strong><Nickname name={post.author} role={post.authorRole} own={post.own}/></strong><span>공유한 순간 {allPosts.filter(item => item.authorId === post.authorId).length}개</span></div><Camera size={17}/></div>)}{!photographers.length && <p className="helsta-sidebar-note">대원들의 사진이 모이면<br/>이곳에서 함께 만나볼 수 있어요.</p>}<div className="helsta-sidebar-note"><p>오늘의 작전도, 평범한 하루도.<br/>동료들과 함께 기억해요.</p><span>HELLDIVERS 2 COMMUNITY</span></div></aside></div>
  </div></AccessGate>;
}
