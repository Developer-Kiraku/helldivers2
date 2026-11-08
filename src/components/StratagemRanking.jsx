'use client';
import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { Button } from './ui';
import useRefreshOnReturn from '@/hooks/useRefreshOnReturn';
import { puzzleTime } from '@/lib/sliding-puzzle.mjs';

export default function StratagemRanking({ refreshKey }) {
  const { api } = useCommunity();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(10);
  const refresh = useCallback(
    async (signal) => {
      try {
        const result = await api('games/stratagem/rankings', { signal });
        if (!signal?.aborted) {
          setData(result);
          setError('');
        }
      } catch (error) {
        if (!signal?.aborted) setError(error.message);
      }
    },
    [api],
  );
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh, refreshKey]);
  useRefreshOnReturn(() => refresh());
  const record = (row) => (
    <>
      <span>
        {row.nickname}
        {row.own && <small> 나</small>}
      </span>
      <strong>{row.stage}단계</strong>
      <time>{puzzleTime(row.elapsedMs)}</time>
    </>
  );
  return (
    <section className="stratagem-ranking" aria-label="스트라타젬 히어로 랭킹">
      <header>
        <h2>
          <Trophy size={21} /> 클리어 랭킹
        </h2>
        <span>전체 기간 · 개인 최고 기록</span>
      </header>
      <p>
        클리어 단계가 높을수록, 같은 단계에서는 누적 클리어 시간이 빠를수록 상위에 기록됩니다. 단계
        사이 선택 시간은 제외합니다.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error} <Button onClick={() => refresh()}>다시 확인</Button>
        </p>
      )}
      {!data && !error && <p role="status">랭킹을 불러오는 중…</p>}
      {data && (
        <>
          {data.mine?.rank && (
            <div className="stratagem-rank-mine">
              <b>내 기록 · {data.mine.rank}위</b>
              <strong>{data.mine.stage}단계</strong>
              <time>{puzzleTime(data.mine.elapsedMs)}</time>
            </div>
          )}
          <div className="stratagem-rank-head">
            <span>순위</span>
            <span>대원</span>
            <span>클리어</span>
            <span>누적 시간</span>
          </div>
          <ol>
            {data.rankings.slice(0, limit).map((row) => (
              <li key={row.id} className={row.own ? 'is-own' : ''}>
                <b className={row.rank <= 3 ? 'is-podium' : ''}>{row.rank}</b>
                {record(row)}
              </li>
            ))}
          </ol>
          {!data.rankings.length && (
            <p className="stratagem-rank-empty">첫 단계를 클리어하고 첫 기록을 남겨보세요.</p>
          )}
          {data.rankings.length > limit && (
            <Button onClick={() => setLimit((value) => value + 10)}>10명 더 보기</Button>
          )}
          {!!data.unranked.length && (
            <div className="stratagem-rank-separate">
              <h3>순위 제외 기록</h3>
              {data.unranked.map((row) => (
                <div key={row.id}>{record(row)}</div>
              ))}
            </div>
          )}
        </>
      )}
      <small>
        업데이트 후 새 도전의 단계별 완료 기록부터 집계됩니다. 이후 단계에서 실패해도 이미 클리어한
        기록은 유지됩니다.
      </small>
    </section>
  );
}
