'use client';
import {ActionLink,Button,Input} from './ui';


import Link from 'next/link';
import { useState } from 'react';
import { boards } from '@/lib/data';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import IdentityStrip from './IdentityStrip';
import Avatar from './Avatar';
import Icon from './Icon';
import FeedPostCard from './FeedPostCard';

export default function BoardPage({ board }) {
  const config = boards[board];
  const isFeed = board === 'talk' || board === 'qna';
  const { posts, profile, canWriteNotice } = useCommunity();
  const [category, setCategory] = useState('전체');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const filtered = posts[board].filter(post => (category === '전체' || category === post.category) && post.title.includes(search));
  return <AccessGate><div className="board-page"><IdentityStrip /><header className="page-heading"><div><div className="eyebrow">{config.eyebrow}</div><h1>{config.label}</h1><p>{config.description}</p></div>{(board !== 'notice' || canWriteNotice) && <div><ActionLink className="button primary" href={`/boards/${board}/write`}><Icon name="plus" size={16} />글쓰기</ActionLink>{board === 'notice' && <small className="permission-caption">운영자 · 부운영자 전용</small>}</div>}</header>
    <div className="category-tabs" aria-label="게시글 분류">{['전체', ...config.categories].map(value => <Button className={category === value ? 'selected' : ''} aria-pressed={category === value} key={value} onClick={() => setCategory(value)}>{value}</Button>)}</div>
    <div className="board-toolbar"><span>전체 <strong>{filtered.length}</strong>개의 게시글</span><form className="search-form" onSubmit={event => { event.preventDefault(); setSearch(input.trim()); }}><Input aria-label="게시글 제목 검색" placeholder="제목으로 검색" value={input} onChange={event => setInput(event.target.value)} /><Button aria-label="검색"><Icon name="search" size={17} /></Button></form></div>
    {isFeed ? <div className="feed-layout feed-layout-full"><section className="talk-feed" aria-label={`${config.label} 게시글`}>{filtered.map(post => <FeedPostCard key={post.id} post={post} board={board} />)}{!filtered.length && <div className="empty-state">{search || category !== '전체' ? '검색 결과가 없습니다.' : board === 'qna' ? '아직 질문이 없습니다. 동료에게 첫 질문을 남겨보세요.' : '아직 게시글이 없습니다. 첫 이야기를 남겨보세요.'}</div>}</section></div> : <section className="board-table" aria-label={`${config.label} 목록`}>
      <div className="board-columns table-head" aria-hidden="true"><span>번호</span><span>분류</span><span>제목</span><span>작성자</span><span>작성일</span><span className="desktop-metric">조회</span><span className="desktop-metric">추천</span></div>
      {filtered.map((post,index) => <Link className={`board-columns board-row ${post.pinned ? 'pinned' : ''}`} key={post.id} href={`/boards/${board}/${post.id}`}><span className="row-number">{post.pinned ? <Icon name="flag" size={15} /> : String(filtered.length-index).padStart(2, '0')}</span><span className="badge">{post.category}</span><span className="board-title">{post.poll && <Icon name="poll" size={16}/>} <span className="post-title-text" title={post.title}>{post.title}</span><em>[{post.comments}]</em></span><span className="board-author"><Avatar name={post.author} own={post.own} photo={post.authorPhoto} /><span>{post.own ? profile.nickname : post.author}</span></span><time>{post.date === '방금 전' ? post.date : post.date.slice(5)}</time><span className="desktop-metric">{post.views}</span><span className="desktop-metric">{post.likes}</span></Link>)}
      {!filtered.length && <div className="empty-state">검색 결과가 없습니다.</div>}
    </section>}
    <nav className="pagination" aria-label="페이지 선택"><Button disabled aria-label="이전 페이지">‹</Button><Button className="current" aria-current="page">1</Button><Button disabled aria-label="다음 페이지">›</Button></nav>
    {!isFeed && <p className="muted-callout">{board === 'notice' ? '공지사항 작성은 운영자와 부운영자만 가능합니다.' : '로그인한 모든 회원이 공략을 작성할 수 있습니다. 분류는 관리자 페이지에서 관리합니다.'}</p>}
    <p className="design-note">회원 전용 게시판 · 게시글과 변경 내용은 JSON 저장소에 보관됩니다.</p>
  </div></AccessGate>;
}
