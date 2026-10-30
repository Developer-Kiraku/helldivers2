'use client';
import Nickname from './Nickname';
import { LoadoutDisplay } from './Loadout';
import { ActionLink, Button, Input } from './ui';

import Link from 'next/link';
import { useState } from 'react';
import { boards } from '@/lib/data';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import IdentityStrip from './IdentityStrip';
import Avatar from './Avatar';
import Icon from './Icon';
import FeedPostCard from './FeedPostCard';
import BoardSearchFilter from './BoardSearchFilter';
import { SlidersHorizontal } from 'lucide-react';
import { emptyBoardFilters, matchesBoardFilters } from '@/lib/board-search.mjs';
import HelstagramPage from './HelstagramPage';

const batchSize = 10;

export default function BoardPage({ board }) {
  return board === 'helstagram' ? <HelstagramPage /> : <StandardBoardPage board={board} />;
}

function StandardBoardPage({ board }) {
  const config = boards[board];
  const isFeed = board === 'talk' || board === 'qna' || board === 'helstagram';
  const { posts, profile, canWriteNotice } = useCommunity();
  const [category, setCategory] = useState('전체');
  const [showDrafts, setShowDrafts] = useState(false);
  const [input, setInput] = useState('');
  const [filters, setFilters] = useState({ ...emptyBoardFilters });
  const [filterOpen, setFilterOpen] = useState(false);
  const search = Object.values(filters).some(Boolean);
  const [page, setPage] = useState({ board, count: batchSize });
  const filtered = posts[board].filter(
    (post) =>
      (board !== 'tierlist' || (post.status === 'draft') === showDrafts) &&
      (category === '전체' || category === post.category) &&
      matchesBoardFilters(post, filters),
  );
  function applyFilters(next) {
    setFilters(next);
    setInput(next.title);
    setPage({ board, count: batchSize });
    setFilterOpen(false);
  }
  const visibleCount = page.board === board ? page.count : batchSize;
  const visiblePosts = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visiblePosts.length;
  return (
    <AccessGate>
      <div className="board-page">
        <IdentityStrip />
        <header className="page-heading">
          <div>
            <div className="eyebrow">{config.eyebrow}</div>
            <h1>{config.label}</h1>
            <p>{config.description}</p>
          </div>
          {(board !== 'notice' || canWriteNotice) && (
            <div>
              <ActionLink className="button primary" href={`/boards/${board}/write`}>
                <Icon name="plus" size={16} />
                {board === 'helstagram' ? '사진 올리기' : '글쓰기'}
              </ActionLink>
            </div>
          )}
        </header>
        {board === 'tierlist' && (
          <div className="category-tabs" aria-label="게시 상태">
            <Button
              type="button"
              className={!showDrafts ? 'selected' : ''}
              aria-pressed={!showDrafts}
              onClick={() => {
                setShowDrafts(false);
                setPage({ board, count: batchSize });
              }}
            >
              게시된 티어리스트
            </Button>
            <Button
              type="button"
              className={showDrafts ? 'selected' : ''}
              aria-pressed={showDrafts}
              onClick={() => {
                setShowDrafts(true);
                setPage({ board, count: batchSize });
              }}
            >
              내 임시저장 ({posts[board].filter((post) => post.status === 'draft').length})
            </Button>
          </div>
        )}
        <div className="category-tabs" aria-label="게시글 분류">
          {['전체', ...config.categories].map((value) => (
            <Button
              className={category === value ? 'selected' : ''}
              aria-pressed={category === value}
              key={value}
              onClick={() => {
                setCategory(value);
                setPage({ board, count: batchSize });
              }}
            >
              {value}
            </Button>
          ))}
        </div>
        <div className="board-toolbar">
          <span>
            전체 <strong>{filtered.length}</strong>개의 게시글
          </span>
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters({ ...filters, title: input.trim() });
            }}
          >
            <Input
              aria-label="게시글 제목 검색"
              placeholder="제목으로 검색"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <Button aria-label="검색">
              <Icon name="search" size={17} />
            </Button>
            <Button
              type="button"
              className="board-filter-trigger"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
              필터{search && <span className="filter-active-dot" aria-label="검색 조건 적용 중" />}
            </Button>
          </form>
        </div>
        {search && (
          <div className="board-active-filters" aria-label="적용된 검색 조건">
            {[
              ['from', '시작일'],
              ['to', '종료일'],
              ['author', '작성자'],
              ['title', '제목'],
              ['content', '내용'],
            ]
              .filter(([key]) => filters[key])
              .map(([key, label]) => (
                <span key={key}>
                  {label}: {filters[key]}
                </span>
              ))}
            <Button type="button" onClick={() => applyFilters({ ...emptyBoardFilters })}>
              검색 초기화
            </Button>
          </div>
        )}
        {isFeed ? (
          <div className="feed-layout feed-layout-full">
            <section
              className={board === 'helstagram' ? 'talk-feed helstagram-feed' : 'talk-feed'}
              aria-label={`${config.label} 게시글`}
            >
              {visiblePosts.map((post) => (
                <FeedPostCard key={post.id} post={post} board={board} />
              ))}
              {!filtered.length && (
                <div className="empty-state">
                  {search || category !== '전체'
                    ? '검색 결과가 없습니다.'
                    : board === 'helstagram'
                      ? '아직 사진이 없습니다. 첫 강하의 순간을 공유해보세요.'
                      : board === 'qna'
                        ? '아직 질문이 없습니다. 동료에게 첫 질문을 남겨보세요.'
                        : '아직 게시글이 없습니다. 첫 이야기를 남겨보세요.'}
                </div>
              )}
            </section>
          </div>
        ) : board === 'tierlist' ? (
          <section
            className="tier-list-table"
            aria-label={showDrafts ? '내 임시저장 목록' : '티어리스트 목록'}
          >
            <div className="tier-list-row tier-list-head" aria-hidden="true">
              <span>글제목</span>
              <span>분류</span>
              <span>종족</span>
              <span>작성일시</span>
              <span>추천</span>
              <span>조회</span>
            </div>
            {visiblePosts.map((post) => (
              <Link className="tier-list-row" key={post.id} href={`/boards/tierlist/${post.id}`}>
                <strong className="tier-list-title">{post.title}</strong>
                <span className="badge">{post.category}</span>
                <span>{post.tierList.faction}</span>
                <time dateTime={post.createdAt}>
                  {new Date(post.createdAt).toLocaleString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </time>
                <span>
                  <span className="tier-mobile-label">추천 </span>
                  {post.likes}
                </span>
                <span>
                  <span className="tier-mobile-label">조회 </span>
                  {post.views}
                </span>
              </Link>
            ))}
            {!filtered.length && (
              <div className="empty-state">
                {showDrafts ? '임시저장한 티어리스트가 없습니다.' : '게시된 티어리스트가 없습니다.'}
              </div>
            )}
          </section>
        ) : board === 'loadout' ? (
          <section className="loadout-list" aria-label="로드아웃 목록">
            {visiblePosts.map((post) => (
              <article className="loadout-card" key={post.id}>
                <Link href={`/boards/loadout/${post.id}`}>
                  <span className="badge">{post.category}</span>
                  <h2>{post.title}</h2>
                  <LoadoutDisplay value={post.loadout} compact />
                </Link>
                <p>
                  <Nickname name={post.author} role={post.authorRole} own={post.own} /> ·{' '}
                  {post.date} · 댓글 {post.comments} · 추천 {post.likes}
                </p>
              </article>
            ))}
            {!filtered.length && (
              <div className="empty-state">아직 로드아웃이 없습니다. 첫 세팅을 공유해보세요.</div>
            )}
          </section>
        ) : (
          <section className="board-table" aria-label={`${config.label} 목록`}>
            <div className="board-columns table-head" aria-hidden="true">
              <span>번호</span>
              <span>분류</span>
              <span>제목</span>
              <span>작성자</span>
              <span>작성일</span>
              <span className="desktop-metric">조회</span>
              <span className="desktop-metric">추천</span>
            </div>
            {visiblePosts.map((post, index) => (
              <Link
                className={`board-columns board-row ${post.pinned ? 'pinned' : ''}`}
                key={post.id}
                href={`/boards/${board}/${post.id}`}
              >
                <span className="row-number">
                  {String(filtered.length - index).padStart(2, '0')}
                </span>
                <span className="badge">{post.category}</span>
                <span className="board-title">
                  {board !== 'notice' && post.poll && <Icon name="poll" size={16} />}{' '}
                  <span className="post-title-text" title={post.title}>
                    {post.title}
                  </span>
                  <em>[{post.comments}]</em>
                </span>
                <span className="board-author">
                  <Avatar name={post.author} own={post.own} photo={post.authorPhoto} />
                  <span>
                    <Nickname name={post.author} role={post.authorRole} own={post.own} />
                  </span>
                </span>
                <time>
                  {post.date === '방금 전' ? post.date : post.date.slice(5)}
                  <span className="board-mobile-views">
                    {' '}
                    · 조회 {Number(post.views || 0).toLocaleString('ko-KR')}
                  </span>
                </time>
                <span className="desktop-metric">{post.views}</span>
                <span className="desktop-metric">{post.likes}</span>
              </Link>
            ))}
            {!filtered.length && <div className="empty-state">검색 결과가 없습니다.</div>}
          </section>
        )}
        <div className="board-load-more">
          <p className="board-list-progress" role="status" aria-live="polite">
            {filtered.length > 0 && `${filtered.length}개 중 ${visiblePosts.length}개 표시`}
          </p>
          {remaining > 0 && (
            <Button
              type="button"
              className="load-more-button"
              onClick={() => setPage({ board, count: visibleCount + batchSize })}
            >
              <Icon name="plus" size={17} />
              더보기 <span>남은 글 {remaining}개</span>
            </Button>
          )}
        </div>
        {filterOpen && (
          <BoardSearchFilter
            value={filters}
            onApply={applyFilters}
            onClose={() => setFilterOpen(false)}
          />
        )}
      </div>
    </AccessGate>
  );
}
