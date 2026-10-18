'use client';

import Link from 'next/link';
import { useState } from 'react';
import { boards } from '@/lib/data';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import IdentityStrip from './IdentityStrip';
import Avatar from './Avatar';
import Icon from './Icon';
import VoteButtons from './VoteButtons';

export default function BoardPage({ board }) {
  const config = boards[board];
  const { posts, profile, canWriteNotice, notify } = useCommunity();
  const [category, setCategory] = useState('전체');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const filtered = posts[board].filter(post => (category === '전체' || category === post.category) && post.title.includes(search));
  return <AccessGate><div className="board-page"><IdentityStrip /><header className="page-heading"><div><div className="eyebrow">{config.eyebrow}</div><h1>{config.label}</h1><p>{config.description}</p></div>{(board !== 'notice' || canWriteNotice) && <div><Link className="button primary" href={`/boards/${board}/write`}><Icon name="plus" size={16} />글쓰기</Link>{board === 'notice' && <small className="permission-caption">운영자 · 부운영자 전용</small>}</div>}</header>
    <div className="category-tabs" aria-label="게시글 분류">{['전체', ...config.categories].map(value => <button className={category === value ? 'selected' : ''} aria-pressed={category === value} key={value} onClick={() => setCategory(value)}>{value}</button>)}</div>
    <div className="board-toolbar"><span>전체 <strong>{filtered.length}</strong>개의 게시글</span><form className="search-form" onSubmit={event => { event.preventDefault(); setSearch(input.trim()); }}><input aria-label="게시글 제목 검색" placeholder="제목으로 검색" value={input} onChange={event => setInput(event.target.value)} /><button aria-label="검색"><Icon name="search" size={17} /></button></form></div>
    {board === 'talk' ? <div className="feed-layout"><section className="talk-feed" aria-label="헬다이버톡 게시글">{filtered.map(post => <article className="talk-card" key={post.id}>
      <div className="post-meta"><span className="badge">{post.category}</span><Avatar name={post.author} own={post.own} photo={post.authorPhoto} /><span>{post.own ? profile.nickname : post.author}</span><span>· {post.date}</span></div>
      <h2><Link href={`/boards/talk/${post.id}`}>{post.title}</Link></h2><p>{post.content}</p>{post.image && <Link href={`/boards/talk/${post.id}`} className="post-image"><img src={post.image} alt="함께 강하한 분대를 표현한 일러스트" /></Link>}
      <footer className="talk-card-footer"><VoteButtons postId={post.id} likes={post.likes} dislikes={post.dislikes} myVote={post.myVote} /><Link href={`/boards/talk/${post.id}`}><Icon name="talk" size={16} />댓글 {post.comments}</Link><button onClick={() => notify('공유 기능을 연결할 위치입니다.')}><Icon name="arrow" size={16} />공유</button></footer>
    </article>)}{!filtered.length && <div className="empty-state">검색 결과가 없습니다.</div>}</section><aside className="panel community-rules"><div className="eyebrow">WELCOME, HELLDIVER</div><h2>혼자보다 함께 강하.</h2><p>퇴근 후 잠깐이어도 괜찮아요.<br />서로의 시간을 존중하는 커뮤니티입니다.</p><hr /><h3>작전실 이용 규칙</h3><ul><li>서로 존중하는 말투 사용하기</li><li>스포일러는 미리 표시하기</li><li>분류에 맞는 글 작성하기</li><li>함께하는 동료 배려하기</li></ul></aside></div> : <section className="board-table" aria-label={`${config.label} 목록`}>
      <div className="board-columns table-head" aria-hidden="true"><span>번호</span><span>분류</span><span>제목</span><span>작성자</span><span>작성일</span><span className="desktop-metric">조회</span><span className="desktop-metric">추천</span></div>
      {filtered.map((post,index) => <Link className={`board-columns board-row ${post.pinned ? 'pinned' : ''}`} key={post.id} href={`/boards/${board}/${post.id}`}><span className="row-number">{post.pinned ? <Icon name="flag" size={15} /> : String(filtered.length-index).padStart(2, '0')}</span><span className="badge">{post.category}</span><span className="board-title">{post.title}<em>[{post.comments}]</em></span><span className="board-author"><Avatar name={post.author} own={post.own} photo={post.authorPhoto} /><span>{post.own ? profile.nickname : post.author}</span></span><time>{post.date === '방금 전' ? post.date : post.date.slice(5)}</time><span className="desktop-metric">{post.views}</span><span className="desktop-metric">{post.likes}</span></Link>)}
      {!filtered.length && <div className="empty-state">검색 결과가 없습니다.</div>}
    </section>}
    <nav className="pagination" aria-label="페이지 선택"><button disabled aria-label="이전 페이지">‹</button><button className="current" aria-current="page">1</button><button disabled aria-label="다음 페이지">›</button></nav>
    {board !== 'talk' && <p className="muted-callout">{board === 'notice' ? '공지사항 작성은 운영자와 부운영자만 가능합니다.' : '로그인한 모든 회원이 공략을 작성할 수 있습니다. 분류는 관리자 페이지에서 관리합니다.'}</p>}
    <p className="design-note">회원 전용 게시판 · 게시글과 변경 내용은 JSON 저장소에 보관됩니다.</p>
  </div></AccessGate>;
}
