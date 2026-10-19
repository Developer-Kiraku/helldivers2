'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Camera, Grid3X3, Rows3, Search, SquarePlus, SlidersHorizontal, Images, Heart, MessageCircle } from 'lucide-react';
import { Button, Input } from './ui';
import { boards } from '@/lib/data';
import { emptyBoardFilters, matchesBoardFilters } from '@/lib/board-search.mjs';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import Avatar from './Avatar';
import Nickname from './Nickname';
import BoardSearchFilter from './BoardSearchFilter';
import HelstagramPost from './HelstagramPost';
import './helstagram.css';

export default function HelstagramPage() {
  const { posts } = useCommunity();
  const allPosts = posts.helstagram;
  const [category, setCategory] = useState('전체'), [view, setView] = useState('feed'), [mine, setMine] = useState(false), [count, setCount] = useState(10);
  const [query, setQuery] = useState(''), [searchOpen, setSearchOpen] = useState(false), [filters, setFilters] = useState({...emptyBoardFilters}), [filterOpen, setFilterOpen] = useState(false);
  const filtered = allPosts.filter(post => (!mine || post.own) && (category === '전체' || post.category === category) && matchesBoardFilters(post, filters));
  const visible = filtered.slice(0, count), hasFilters = Object.values(filters).some(Boolean);
  const photographers = [...new Map(allPosts.map(post => [post.authorId, post])).values()].slice(0, 5);
  function apply(next) { setFilters(next); setQuery(next.title); setCount(10); setFilterOpen(false); }
  return <AccessGate><div className="helstagram-page">
    <header className="helsta-heading"><div><h1>Helstagram<span aria-hidden="true">.</span></h1><p>우리의 강하, 한 장의 기록.</p></div><div><Button type="button" className="helsta-icon-button" aria-label="사진 검색" aria-expanded={searchOpen} onClick={() => setSearchOpen(value => !value)}><Search size={25}/></Button><Link className="helsta-upload" href="/boards/helstagram/write" aria-label="사진 올리기"><SquarePlus size={25}/><span>사진 올리기</span></Link></div></header>
    <div className="helsta-layout"><div className="helsta-main">
      <nav className="helsta-topics" aria-label="사진 분류">{['전체', ...boards.helstagram.categories].map(value => { const cover = allPosts.find(post => value === '전체' || post.category === value)?.images[0]; return <Button type="button" key={value} className={`helsta-topic ${category === value ? 'selected' : ''}`} aria-pressed={category === value} onClick={() => { setCategory(value); setCount(10); }}><span className="helsta-topic-ring">{cover ? <img src={cover} alt=""/> : <Camera size={26}/>}</span><span>{value === '전체' ? '모든 순간' : value}</span></Button>; })}</nav>
      <div className="helsta-feed-toolbar"><div className="helsta-scope" aria-label="사진 범위"><Button type="button" className={!mine ? 'selected' : ''} aria-pressed={!mine} onClick={() => { setMine(false); setCount(10); }}>모두의 사진</Button><Button type="button" className={mine ? 'selected' : ''} aria-pressed={mine} onClick={() => { setMine(true); setCount(10); }}>내 사진</Button></div><div className="helsta-view-switch" aria-label="보기 방식"><Button type="button" className="helsta-icon-button" aria-label="피드 보기" aria-pressed={view === 'feed'} onClick={() => setView('feed')}><Rows3 size={20}/></Button><Button type="button" className="helsta-icon-button" aria-label="사진 모아보기" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><Grid3X3 size={20}/></Button></div></div>
      {searchOpen && <form className="helsta-search" onSubmit={event => { event.preventDefault(); apply({...filters, title:query.trim()}); }}><Input aria-label="사진 제목 검색" placeholder="사진 제목으로 검색" value={query} onChange={event => setQuery(event.target.value)}/><Button type="submit" aria-label="사진 검색 실행"><Search size={19}/></Button><Button type="button" aria-label="사진 검색 필터" aria-haspopup="dialog" aria-expanded={filterOpen} onClick={() => setFilterOpen(true)}><SlidersHorizontal size={19}/></Button></form>}
      {hasFilters && <div className="helsta-filter-summary"><span>검색 결과 {filtered.length}개</span><Button type="button" className="helsta-text-button" onClick={() => apply({...emptyBoardFilters})}>검색 초기화</Button></div>}
      <section className={view === 'grid' ? 'helsta-explore-grid' : 'helsta-feed'} aria-label="헬스타그램 게시글">{visible.map(post => view === 'feed' ? <HelstagramPost key={post.id} post={post}/> : <Link key={post.id} href={`/boards/helstagram/${post.id}`} className="helsta-grid-photo" aria-label={`${post.title}, 좋아요 ${post.likes}개, 댓글 ${post.comments}개`}><img src={post.images[0]} alt={post.title} loading="lazy"/>{post.images.length > 1 && <Images className="helsta-grid-multiple" size={20}/>}<span className="helsta-grid-stats"><span><Heart size={20} fill="currentColor"/>{post.likes}</span><span><MessageCircle size={20} fill="currentColor"/>{post.comments}</span></span></Link>)}</section>
      {!filtered.length && <div className="helsta-empty"><span><Camera size={38}/></span><h2>{mine ? '나만의 첫 순간을 남겨보세요' : hasFilters || category !== '전체' ? '아직 이곳에 담긴 사진이 없어요' : '우리의 첫 사진을 기다려요'}</h2><p>{hasFilters ? '다른 검색어와 조건으로 찾아보세요.' : '분대와 함께한 순간부터 오늘의 스크린샷까지.'}</p><Link href="/boards/helstagram/write">첫 사진 올리기</Link></div>}
      {filtered.length > count && <Button type="button" className="helsta-more" onClick={() => setCount(value => value + 10)}>사진 더 보기</Button>}
      {filtered.length > 0 && filtered.length <= count && <p className="helsta-feed-end">모든 순간을 둘러봤어요 <Heart size={14}/></p>}
    </div><aside className="helsta-sidebar"><Link href="/profile" className="helsta-my-profile"><Avatar own size="large"/><div><strong><Nickname own/></strong><span>나의 강하 기록</span></div><span>내 정보</span></Link><div className="helsta-sidebar-heading"><h2>함께 기록하는 대원들</h2><span>{photographers.length}명</span></div>{photographers.map(post => <div className="helsta-photographer" key={post.authorId}><Avatar name={post.author} own={post.own} photo={post.authorPhoto}/><div><strong><Nickname name={post.author} role={post.authorRole} own={post.own}/></strong><span>공유한 순간 {allPosts.filter(item => item.authorId === post.authorId).length}개</span></div><Camera size={17}/></div>)}{!photographers.length && <p className="helsta-sidebar-note">대원들의 사진이 모이면<br/>이곳에서 함께 만나볼 수 있어요.</p>}<div className="helsta-sidebar-note"><p>오늘의 작전도, 평범한 하루도.<br/>동료들과 함께 기억해요.</p><span>HELLDIVERS 2 COMMUNITY</span></div></aside></div>
    {filterOpen && <BoardSearchFilter value={filters} onApply={apply} onClose={() => setFilterOpen(false)}/>}
  </div></AccessGate>;
}
