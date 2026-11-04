'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Coins, Trophy } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import Avatar from './Avatar';
import Nickname from './Nickname';
import { Button } from './ui';
import useRefreshOnReturn from '@/hooks/useRefreshOnReturn';
import { puzzleTime } from '@/lib/sliding-puzzle.mjs';

function RankingPanel({ kind }) {
  const { api } = useCommunity();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [version, reload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const month = useRef(null);
  const puzzle = kind === 'puzzle';
  const title = puzzle ? '퍼즐 랭킹' : '포인트 랭킹';
  useRefreshOnReturn(() => reload((value) => value + 1));
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(`rankings/${kind}?page=${page}`)
      .then((result) => {
        if (!active) return;
        if (month.current && month.current !== result.month && page !== 1) {
          month.current = result.month;
          setData(null);
          setPage(1);
          return;
        }
        month.current = result.month;
        setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, kind, page, version]);
  const monthLabel = data?.month
    ? `${data.month.slice(0, 4)}년 ${Number(data.month.slice(5))}월`
    : '이번 달';
  return (
    <section className="panel home-ranking-panel" aria-label={title} aria-busy={loading}>
      <header className="section-heading">
        <div>
          <h2>
            {puzzle ? <Trophy size={20} /> : <Coins size={20} />}
            {title}
          </h2>
          <p>{puzzle ? `${monthLabel} · 클리어 시간순` : '현재 보유 포인트 기준'}</p>
        </div>
        {puzzle && <Link href="/games/sliding-puzzle">게임하기 ↗</Link>}
      </header>
      {!data && loading ? (
        <div className="home-ranking-loading" role="status" aria-label={`${title} 불러오는 중`}>
          {Array.from({ length: 5 }, (_, index) => (
            <div className="skeleton-block" key={index} />
          ))}
        </div>
      ) : data?.rankings.length ? (
        <ol className="home-ranking-list">
          {data.rankings.map((row) => (
            <li key={row.id} className={row.own ? 'is-own' : ''}>
              <span
                className={`home-ranking-position${row.rank <= 3 ? ` podium-${row.rank}` : ''}`}
                aria-label={`${row.rank}위`}
              >
                {row.rank}
              </span>
              <div className="home-ranking-member">
                <Avatar name={row.nickname} photo={row.photo} own={row.own} />
                <Nickname name={row.nickname} role={row.role} own={row.own} />
                {row.own && <small className="home-ranking-me">나</small>}
              </div>
              <div className="home-ranking-value">
                <strong>
                  {puzzle ? puzzleTime(row.elapsedMs) : row.points.toLocaleString('ko-KR')}
                  {!puzzle && <small> P</small>}
                </strong>
                {puzzle && <small>{row.moves.toLocaleString('ko-KR')}회 이동</small>}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        data && (
          <p className="home-ranking-empty">
            {puzzle ? '이번 달 첫 기록을 남겨보세요.' : '아직 등록된 대원이 없습니다.'}
          </p>
        )
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {(data?.hasMore || error) && (
        <Button
          type="button"
          className="home-ranking-more"
          disabled={loading}
          aria-label={error ? `${title} 다시 시도` : `${title} 5명 더보기`}
          onClick={() => (error ? reload((value) => value + 1) : setPage((value) => value + 1))}
        >
          {loading ? (
            '불러오는 중…'
          ) : error ? (
            '다시 시도'
          ) : (
            <>
              <ChevronDown size={16} />
              더보기{' '}
              <small>
                {data.rankings.length} / {data.total}명
              </small>
            </>
          )}
        </Button>
      )}
    </section>
  );
}

export default function DashboardRankings() {
  const { user } = useCommunity();
  return (
    <div className="home-rankings-grid">
      {['points', 'puzzle'].map((kind) => (
        <RankingPanel key={`${user?.id}:${kind}`} kind={kind} />
      ))}
    </div>
  );
}
