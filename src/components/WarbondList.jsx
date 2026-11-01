'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, Search, X } from 'lucide-react';

const filters = [
  ['all', '전체'],
  ['standard', '기본'],
  ['premium', '프리미엄'],
  ['legendary', '전설'],
];
export default function WarbondList({ warbonds }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const normalized = query.toLocaleLowerCase().replace(/\s/g, '');
  const visible = warbonds.filter(
    (item) =>
      (type === 'all' || type === item.type) &&
      item.searchText.toLocaleLowerCase().replace(/\s/g, '').includes(normalized),
  );
  return (
    <div className="warbond-library">
      <header className="warbond-heading">
        <div>
          <span className="warbond-eyebrow">WARBOND ARCHIVE</span>
          <h1>전쟁 채권 사전</h1>
          <p>장비부터 꾸미기 아이템까지, 채권의 모든 보상을 한곳에서.</p>
        </div>
        <span className="warbond-count">
          <BookOpen size={18} aria-hidden="true" /> {warbonds.length}개 채권
        </span>
      </header>
      <div className="warbond-tools">
        <div className="warbond-filters" aria-label="채권 종류">
          {filters.map(([id, label]) => (
            <button type="button" key={id} aria-pressed={type === id} onClick={() => setType(id)}>
              {label}
              <span>
                {id === 'all'
                  ? warbonds.length
                  : warbonds.filter((item) => item.type === id).length}
              </span>
            </button>
          ))}
        </div>
        <label className="warbond-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">채권 또는 보상 검색</span>
          <input
            type="search"
            placeholder="채권 또는 보상 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" aria-label="검색 지우기" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
        </label>
      </div>
      <p className="warbond-results" role="status">
        {visible.length}개 채권
      </p>
      <div className="warbond-list">
        {visible.map((item) => (
          <Link className="warbond-list-item" key={item.id} href={`/warbonds/${item.slug}`}>
            <div className="warbond-cover">
              <img src={item.src} alt="" width="640" height="320" loading="lazy" />
            </div>
            <div className="warbond-list-copy">
              <span className={`warbond-badge is-${item.type}`}>{item.typeLabel}</span>
              <h2>{item.label}</h2>
              <span className="warbond-english">{item.name}</span>
              <div className="warbond-list-meta">
                <span>{item.pageCount}페이지</span>
                <span>보상 {item.rewardCount}개</span>
                <span>메달 {item.totalMedals.toLocaleString('ko-KR')}</span>
              </div>
            </div>
            <div className="warbond-list-action">
              <span>
                {item.price === 0 ? (
                  '기본 제공'
                ) : (
                  <>
                    <img
                      src="/warbonds/super-credits.webp"
                      alt="슈퍼 크레딧"
                      width="22"
                      height="22"
                    />
                    {item.price.toLocaleString('ko-KR')}
                  </>
                )}
              </span>
              <ArrowUpRight size={22} aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
      {!visible.length && (
        <div className="warbond-empty">
          <Search size={28} aria-hidden="true" />
          <h2>일치하는 채권이 없습니다.</h2>
          <p>다른 채권 이름이나 장비 이름으로 검색해 보세요.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setType('all');
            }}
          >
            전체 채권 보기
          </button>
        </div>
      )}
    </div>
  );
}
