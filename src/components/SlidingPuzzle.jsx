'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Puzzle, Trophy, Timer, Move, Play, RotateCcw, Check, Medal } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { Button, Select } from './ui';
import useRefreshOnReturn from '../hooks/useRefreshOnReturn';
import {
  movePuzzle,
  puzzleSolved,
  puzzleTime,
  puzzleMonth,
  solvedPuzzle,
} from '@/lib/sliding-puzzle.mjs';

export default function SlidingPuzzle() {
  const { api, actualRole, role, refresh } = useCommunity();
  const router = useRouter(),
    search = useSearchParams();
  const month = search.get('month') || puzzleMonth();
  const [ranks, setRanks] = useState(null),
    [version, reload] = useState(0);
  const [rankError, setRankError] = useState(''),
    [error, setError] = useState('');
  const [run, setRun] = useState(null),
    [board, setBoard] = useState(solvedPuzzle);
  const [moves, setMoves] = useState([]),
    [phase, setPhase] = useState('idle');
  const [elapsed, setElapsed] = useState(0),
    [result, setResult] = useState(null);
  const started = useRef(0),
    pending = useRef(false);
  useRefreshOnReturn(() => reload((v) => v + 1));
  useEffect(() => {
    let active = true;
    setRankError('');
    api('games/sliding-puzzle?month=' + encodeURIComponent(month))
      .then((data) => {
        if (active) setRanks(data);
      })
      .catch((err) => {
        if (active) setRankError(err.message);
      });
    return () => {
      active = false;
    };
  }, [api, month, version]);
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => setElapsed(Date.now() - started.current), 50);
    return () => clearInterval(timer);
  }, [phase]);
  async function start() {
    if (pending.current) return;
    const previousPhase = phase;
    pending.current = true;
    setPhase('starting');
    setError('');
    try {
      const data = await api('games/sliding-puzzle/start', { method: 'POST' });
      setRun(data.run);
      setBoard(data.run.board);
      setMoves([]);
      setResult(null);
      started.current = Date.now();
      setElapsed(0);
      setPhase('playing');
    } catch (err) {
      setError(err.message);
      setPhase(previousPhase);
    } finally {
      pending.current = false;
    }
  }
  async function finish(history) {
    if (pending.current) return;
    pending.current = true;
    setPhase('saving');
    setError('');
    try {
      const data = await api('games/sliding-puzzle/finish', {
        method: 'POST',
        body: { runId: run.id, moves: history },
      });
      setResult(data);
      setElapsed(data.record.elapsedMs);
      setPhase('done');
      router.replace('/games/sliding-puzzle?month=' + data.record.month, { scroll: false });
      reload((v) => v + 1);
      await refresh();
    } catch (err) {
      setPhase('retry');
      setError(err.message);
    } finally {
      pending.current = false;
    }
  }
  function slide(tile) {
    if (phase !== 'playing' || pending.current || actualRole !== role) return;
    const next = movePuzzle(board, tile);
    if (!next) return;
    const history = [...moves, tile];
    setBoard(next);
    setMoves(history);
    if (puzzleSolved(next)) {
      setElapsed(Date.now() - started.current);
      void finish(history);
    }
  }
  const playing = phase === 'playing',
    locked = actualRole !== role || phase === 'starting' || phase === 'saving';
  return (
    <section className="puzzle-page">
      <header className="puzzle-heading">
        <span className="eyebrow">SUPER EARTH · TRAINING</span>
        <h1>
          <Puzzle size={28} />
          슬라이딩 퍼즐
        </h1>
        <p>빈칸 옆 숫자를 움직여 1부터 15까지 순서대로 맞춰보세요.</p>
      </header>
      <div className="puzzle-layout">
        <section className="puzzle-console" aria-label="슬라이딩 퍼즐 게임">
          <div className="puzzle-status">
            <div>
              <Timer size={16} />
              <span>
                경과 시간<strong aria-label="경과 시간">{puzzleTime(elapsed)}</strong>
              </span>
            </div>
            <div>
              <Move size={16} />
              <span>
                이동 횟수
                <strong>
                  {moves.length}
                  <small> 회</small>
                </strong>
              </span>
            </div>
          </div>
          <div
            className="puzzle-board"
            role="group"
            aria-label="4 곱하기 4 퍼즐. 빈칸 옆 숫자를 선택하세요."
            tabIndex={0}
            onKeyDown={(event) => {
              const offsets = { ArrowUp: 4, ArrowDown: -4, ArrowLeft: 1, ArrowRight: -1 };
              if (!(event.key in offsets)) return;
              event.preventDefault();
              const tile = board[board.indexOf(0) + offsets[event.key]];
              slide(tile);
            }}
          >
            {board.map((tile) =>
              tile ? (
                <button
                  type="button"
                  key={tile}
                  className={
                    'puzzle-tile' + (playing && movePuzzle(board, tile) ? ' can-move' : '')
                  }
                  aria-label={tile + '번 타일'}
                  disabled={!playing || locked}
                  onClick={() => slide(tile)}
                >
                  {tile}
                </button>
              ) : (
                <span key="blank" className="puzzle-blank" aria-label="빈칸">
                  <Puzzle size={30} />
                </span>
              ),
            )}
          </div>
          <p className="puzzle-controls-hint">클릭·터치 또는 방향키로 이동</p>
          <Button type="button" className="puzzle-start" disabled={locked} onClick={start}>
            {run ? <RotateCcw size={17} /> : <Play size={17} />}
            {phase === 'starting' ? '준비 중…' : run ? '다시 시작' : '게임 시작'}
          </Button>
          {phase === 'saving' && (
            <p role="status" className="puzzle-save-status">
              기록을 등록하고 있습니다…
            </p>
          )}
          {result && (
            <div className="puzzle-result" role="status">
              <Check size={20} />
              <div>
                <strong>퍼즐 클리어!</strong>
                <p>
                  {result.improved ? '이번 달 최고 기록을 갱신했습니다.' : '기록을 등록했습니다.'}{' '}
                  월간 {result.rank}위
                </p>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {phase === 'retry' && (
            <Button type="button" onClick={() => finish(moves)}>
              기록 등록 다시 시도
            </Button>
          )}
          <p className="puzzle-rules">
            기록은 게임 시작부터 서버에 클리어가 접수될 때까지 측정됩니다. 1시간 안에 완성하면 자동
            등록됩니다.
          </p>
        </section>
        <section className="puzzle-ranking" aria-label="월별 랭킹">
          <header>
            <h2>
              <Trophy size={21} />
              월간 랭킹
            </h2>
            <Select
              aria-label="랭킹 월"
              value={month}
              onChange={(e) =>
                router.replace('/games/sliding-puzzle?month=' + e.target.value, { scroll: false })
              }
            >
              {[...new Set([month, ...(ranks?.months || [puzzleMonth()])])]
                .sort()
                .reverse()
                .map((m) => (
                  <option key={m} value={m}>
                    {m.replace('-', '년 ')}월
                  </option>
                ))}
            </Select>
          </header>
          <p className="puzzle-rules">
            한국 시간 기준 · 회원별 월간 최고 기록
            <br />
            클리어 시간 → 이동 횟수 → 먼저 달성한 순서
          </p>
          {rankError && (
            <p className="form-error" role="alert">
              {rankError} <button onClick={() => reload((v) => v + 1)}>다시 시도</button>
            </p>
          )}
          {!ranks && !rankError && <p role="status">랭킹을 불러오는 중…</p>}
          {ranks && ranks.month === month && (
            <>
              {ranks.mine && (
                <div className="puzzle-my-record">
                  <Medal size={19} />
                  <span>
                    내 최고 기록 <strong>{ranks.mine.rank}위</strong>
                  </span>
                  <b>
                    {puzzleTime(ranks.mine.elapsedMs)}
                    <small>{ranks.mine.moves}회 이동</small>
                  </b>
                </div>
              )}
              <div className="puzzle-rank-table">
                <table>
                  <thead>
                    <tr>
                      <th>순위</th>
                      <th>대원</th>
                      <th>클리어 시간</th>
                      <th>이동</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranks.rankings.map((row) => (
                      <tr key={row.rank} className={row.own ? 'is-own' : ''}>
                        <td>
                          <span
                            className={
                              row.rank <= 3
                                ? 'puzzle-medal podium-' + row.rank
                                : 'puzzle-rank-number'
                            }
                          >
                            {row.rank}
                          </span>
                        </td>
                        <td>
                          {row.nickname}
                          {row.own && <small className="puzzle-me">나</small>}
                        </td>
                        <td>{puzzleTime(row.elapsedMs)}</td>
                        <td>
                          {row.moves}
                          <small>회</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!ranks.total && (
                <div className="puzzle-empty">
                  <Trophy size={32} />
                  <strong>이번 달 첫 기록의 주인공이 되어보세요.</strong>
                </div>
              )}
              <p className="puzzle-rules">
                {ranks.total}명 참여 · 상위 50명 표시 · 3위 안 진입과 순위 하락은 알림으로
                안내합니다.
              </p>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
