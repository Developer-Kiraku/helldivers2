'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Grid3X3, Trophy, Timer, Move, Play, Square, Check, Medal } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { Button, Select } from './ui';
import useRefreshOnReturn from '../hooks/useRefreshOnReturn';
import { puzzleRequest } from '@/lib/puzzle-request.mjs';
import {
  slidePuzzle,
  puzzleTime,
  puzzleMonth,
  solvedPuzzle,
  puzzleMonthlyPrizes,
  puzzleSolved,
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
  const [board, setBoard] = useState(solvedPuzzle);
  const [moves, setMoves] = useState(0),
    [phase, setPhaseState] = useState('idle');
  const [elapsed, setElapsed] = useState(0),
    [result, setResult] = useState(null);
  const started = useRef(0),
    pending = useRef(false);
  const consoleRef = useRef(null);
  const moveQueue = useRef([]),
    packetRef = useRef(null),
    moving = useRef(false),
    visualBoard = useRef(board),
    verifiedRun = useRef(null),
    touchActivation = useRef(false);
  const generation = useRef(0),
    controllers = useRef(new Set()),
    phaseRef = useRef('idle');
  function setPhase(value) {
    phaseRef.current = value;
    setPhaseState(value);
  }
  const request = (path, options) => puzzleRequest(api, path, options, controllers.current);
  const cancelRequests = () => controllers.current.forEach((controller) => controller.abort());
  useEffect(
    () => () => {
      ++generation.current;
      controllers.current.forEach((controller) => controller.abort());
    },
    [],
  );
  const [clockStarted, setClockStarted] = useState(false);
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
    if (phase !== 'playing' || !clockStarted) return;
    const timer = setInterval(() => setElapsed(Date.now() - started.current), 50);
    return () => clearInterval(timer);
  }, [phase, clockStarted]);
  useEffect(() => {
    if (phase !== 'playing' || actualRole !== role) return;
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => {
      if (media.matches)
        consoleRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      document.documentElement.classList.toggle('puzzle-scroll-locked', media.matches);
    };
    update();
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
      document.documentElement.classList.remove('puzzle-scroll-locked');
    };
  }, [phase, actualRole, role]);
  function complete(data, token) {
    if (token !== generation.current) return;
    setResult(data);
    setElapsed(data.record.elapsedMs);
    setMoves(data.record.moves);
    setClockStarted(false);
    setError('');
    setPhase('done');
    router.replace('/games/sliding-puzzle?month=' + data.record.month, { scroll: false });
    reload((value) => value + 1);
    // A bootstrap refresh must never keep the game controls locked.
    void Promise.resolve(refresh()).catch(() => {});
  }
  function applyRun(current, token) {
    if (token !== generation.current) return;
    verifiedRun.current = current;
    visualBoard.current = current.board;
    setBoard(current.board);
    setMoves(current.moves);
    if (current.result) {
      complete(current.result, token);
    } else if (current.stopped) {
      setPhase('idle');
      setClockStarted(false);
    } else if (current.completedAt) {
      void finish(current);
    } else {
      if (current.startedAt) {
        started.current = Date.now() - current.elapsedMs;
        setElapsed(current.elapsedMs);
        setClockStarted(true);
      }
      setPhase('playing');
    }
  }
  async function stop() {
    const current = verifiedRun.current;
    if (!current || ['idle', 'done', 'starting', 'stopping'].includes(phaseRef.current)) return;
    const token = ++generation.current;
    cancelRequests();
    moveQueue.current = [];
    packetRef.current = null;
    moving.current = false;
    pending.current = true;
    setPhase('stopping');
    setClockStarted(false);
    setError('');
    try {
      const data = await request('games/sliding-puzzle/stop', {
        method: 'POST',
        body: { runId: current.id },
      });
      if (token !== generation.current) return;
      if (data.run.result) complete(data.run.result, token);
      else {
        verifiedRun.current = null;
        setPhase('idle');
      }
    } catch (err) {
      if (token !== generation.current) return;
      verifiedRun.current = null;
      setPhase('idle');
      setError(
        '서버의 정지 확인을 받지 못했습니다. 다시 시작하면 새 게임으로 진행됩니다. ' + err.message,
      );
    } finally {
      if (token === generation.current) pending.current = false;
    }
  }
  async function start() {
    if (pending.current) return;
    const token = ++generation.current;
    cancelRequests();
    pending.current = true;
    setPhase('starting');
    setError('');
    try {
      const data = await request('games/sliding-puzzle/start', { method: 'POST' });
      if (token !== generation.current) return;
      setBoard(data.run.board);
      verifiedRun.current = data.run;
      visualBoard.current = data.run.board;
      moveQueue.current = [];
      packetRef.current = null;
      setMoves(0);
      setResult(null);
      started.current = 0;
      setClockStarted(false);
      setElapsed(0);
      setPhase('playing');
    } catch (err) {
      if (token !== generation.current) return;
      setError(err.message);
      setPhase('idle');
    } finally {
      if (token === generation.current) pending.current = false;
    }
  }
  async function finish(current = verifiedRun.current) {
    if (!current) return;
    const token = generation.current;
    if (current.result) return complete(current.result, token);
    if (pending.current) return;
    pending.current = true;
    setPhase('saving');
    setClockStarted(false);
    setError('');
    try {
      const data = await request('games/sliding-puzzle/finish', {
        method: 'POST',
        body: { runId: current.id },
      });
      complete(data, token);
    } catch (err) {
      if (token !== generation.current) return;
      setPhase('retry');
      setError(err.message);
    } finally {
      if (token === generation.current) pending.current = false;
    }
  }
  function acknowledge(current, packet) {
    if (current.result || current.stopped) {
      moveQueue.current = [];
      packetRef.current = null;
    } else if (current.step === packet.step + packet.tiles.length) {
      moveQueue.current.splice(0, packet.tiles.length);
      packetRef.current = null;
    } else if (current.step !== packet.step) {
      throw new Error(
        '이동 순서가 달라졌습니다. 다른 화면에서 같은 퍼즐을 진행 중인지 확인해주세요.',
      );
    } else {
      verifiedRun.current = current;
      return false;
    }
    verifiedRun.current = current;
    return true;
  }
  async function recover() {
    if (pending.current || !verifiedRun.current) return;
    const token = generation.current;
    pending.current = true;
    setPhase('checking');
    setError('');
    let current;
    try {
      current = (
        await request(
          'games/sliding-puzzle/state?runId=' + encodeURIComponent(verifiedRun.current.id),
        )
      ).run;
      if (token !== generation.current) return;
      if (packetRef.current) acknowledge(current, packetRef.current);
      verifiedRun.current = current;
    } catch (err) {
      current = null;
      if (token === generation.current) {
        setPhase('sync-error');
        setError(err.message);
      }
    } finally {
      if (token === generation.current) pending.current = false;
    }
    if (!current || token !== generation.current) return;
    if (moveQueue.current.length && !current.result && !current.stopped) {
      setPhase(puzzleSolved(visualBoard.current) ? 'checking' : 'playing');
      void flushMoves();
    } else applyRun(current, token);
  }
  async function flushMoves() {
    if (moving.current || pending.current) return;
    const token = generation.current;
    moving.current = true;
    pending.current = true;
    setError('');
    try {
      while (moveQueue.current.length && token === generation.current) {
        const current = verifiedRun.current;
        const packet = packetRef.current || {
          runId: current.id,
          step: current.step,
          tiles: moveQueue.current.slice(0, 128),
        };
        packetRef.current = packet;
        let confirmed = false,
          failure;
        for (let attempt = 0; attempt < 2 && !confirmed; attempt++) {
          try {
            const data = await request('games/sliding-puzzle/move', {
              method: 'POST',
              body: packet,
            });
            if (token !== generation.current) return;
            confirmed = acknowledge(data.run, packet);
          } catch (err) {
            if (token !== generation.current) return;
            failure = err;
            try {
              const data = await request(
                'games/sliding-puzzle/state?runId=' + encodeURIComponent(packet.runId),
              );
              if (token !== generation.current) return;
              confirmed = acknowledge(data.run, packet);
            } catch (stateError) {
              if (token !== generation.current) return;
              failure = stateError;
            }
          }
        }
        if (!confirmed) {
          setPhase('sync-error');
          setClockStarted(false);
          setError(
            (failure?.message || '서버에서 이동을 확인하지 못했습니다.') +
              ' 이동 내역은 보관 중입니다. 게임 상태 다시 확인을 눌러 이어서 처리해주세요.',
          );
          return;
        }
        const verified = verifiedRun.current;
        if (verified.startedAt && phaseRef.current === 'playing') {
          started.current = Date.now() - verified.elapsedMs;
          setElapsed(verified.elapsedMs);
          setClockStarted(true);
        }
        if (verified.stopped || verified.completedAt) {
          moveQueue.current = [];
          packetRef.current = null;
          break;
        }
      }
    } finally {
      if (token === generation.current) {
        moving.current = false;
        pending.current = false;
      }
    }
    if (token === generation.current && verifiedRun.current) applyRun(verifiedRun.current, token);
  }
  function slide(tile) {
    if (phaseRef.current !== 'playing' || actualRole !== role) return;
    const movement = slidePuzzle(visualBoard.current, tile);
    if (!movement) return;
    visualBoard.current = movement.board;
    setBoard(movement.board);
    setMoves((value) => value + movement.moves.length);
    moveQueue.current.push(tile);
    if (puzzleSolved(movement.board)) {
      setPhase('checking');
      setClockStarted(false);
    }
    void flushMoves();
  }
  const playing = phase === 'playing',
    canStop = ['playing', 'checking', 'saving', 'sync-error'].includes(phase),
    locked = actualRole !== role || ['starting', 'stopping'].includes(phase);
  return (
    <section className="puzzle-page">
      <header className="puzzle-heading">
        <span className="eyebrow">SUPER EARTH · TRAINING</span>
        <h1>
          <Grid3X3 size={28} />
          슬라이딩 퍼즐
        </h1>
        <p>빈칸 옆 숫자를 움직여 1부터 15까지 순서대로 맞춰보세요.</p>
      </header>
      <div className="puzzle-layout">
        <section
          ref={consoleRef}
          className={'puzzle-console' + (canStop ? ' is-playing' : '')}
          aria-label="슬라이딩 퍼즐 게임"
        >
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
                  {moves}
                  <small> 회</small>
                </strong>
              </span>
            </div>
          </div>
          <div
            className="puzzle-board"
            role="group"
            aria-label="4 곱하기 4 퍼즐. 빈칸과 같은 줄의 숫자를 선택하세요."
            onDragStart={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
            tabIndex={0}
            onKeyDown={(event) => {
              const offsets = { ArrowUp: 4, ArrowDown: -4, ArrowLeft: 1, ArrowRight: -1 };
              if (!(event.key in offsets)) return;
              event.preventDefault();
              const tile = board[board.indexOf(0) + offsets[event.key]];
              slide(tile);
            }}
          >
            {solvedPuzzle().map((tile) =>
              tile ? (
                <button
                  type="button"
                  draggable={false}
                  key={tile}
                  style={{
                    '--tile-column': board.indexOf(tile) % 4,
                    '--tile-row': Math.floor(board.indexOf(tile) / 4),
                  }}
                  className={
                    'puzzle-tile' + (playing && slidePuzzle(board, tile) ? ' can-move' : '')
                  }
                  aria-label={tile + '번 타일'}
                  disabled={!playing || locked}
                  onPointerDown={(event) => {
                    if (event.pointerType !== 'touch') {
                      touchActivation.current = false;
                      return;
                    }
                    if (!event.isPrimary) return;
                    event.preventDefault();
                    touchActivation.current = true;
                    void slide(tile);
                  }}
                  onClick={(event) => {
                    // Touch activates on contact; ignore its later compatibility click.
                    if (event.detail && touchActivation.current) return;
                    void slide(tile);
                  }}
                >
                  {tile}
                </button>
              ) : (
                <span
                  key="blank"
                  className="puzzle-blank"
                  aria-label="빈칸"
                  style={{
                    '--tile-column': board.indexOf(0) % 4,
                    '--tile-row': Math.floor(board.indexOf(0) / 4),
                  }}
                >
                  <Grid3X3 size={30} />
                </span>
              ),
            )}
          </div>
          <p className="puzzle-controls-hint">
            빈칸과 같은 줄의 숫자를 누르면 한꺼번에 밀 수 있습니다.
          </p>
          <Button
            type="button"
            className="puzzle-start"
            disabled={locked}
            onClick={canStop ? stop : start}
          >
            {canStop ? <Square size={17} /> : <Play size={17} />}
            {phase === 'starting'
              ? '준비 중…'
              : phase === 'stopping'
                ? '정지 중…'
                : canStop
                  ? '게임 정지'
                  : '게임 시작'}
          </Button>
          {['saving', 'checking'].includes(phase) && (
            <p role="status" className="puzzle-save-status">
              퍼즐 완료 여부와 기록을 서버에서 확인하고 있습니다…
            </p>
          )}
          {phase === 'done' && result && (
            <div className="puzzle-result" role="status">
              <Check size={20} />
              <div>
                <strong>이번 게임 클리어!</strong>
                <p>
                  <span>
                    완료 시간 <b>{puzzleTime(result.record.elapsedMs)}</b>
                  </span>
                  <span>
                    이동 횟수 <b>{result.record.moves}회</b>
                  </span>
                </p>
                {result.improved && <p>월간 최고 기록 갱신 · {result.rank}위</p>}
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {phase === 'retry' && (
            <Button type="button" onClick={() => finish()}>
              기록 등록 다시 시도
            </Button>
          )}
          {phase === 'sync-error' && (
            <Button type="button" onClick={recover}>
              게임 상태 다시 확인
            </Button>
          )}
          <div className="puzzle-help">
            <strong>플레이 방법</strong>
            <ol>
              <li>
                게임 시작을 누르면 숫자가 섞입니다. 첫 숫자를 움직이는 순간부터 시간이 측정됩니다.
              </li>
              <li>
                빈칸과 같은 가로줄·세로줄의 숫자를 누르면, 그 사이 숫자들이 빈칸 쪽으로 한꺼번에
                미끄러집니다. 방향키로도 움직일 수 있습니다.
              </li>
              <li>
                왼쪽 위부터 가로로 1~15를 순서대로 맞추고, 오른쪽 아래를 빈칸으로 만들면
                클리어입니다.
              </li>
              <li>
                이동 횟수는 움직인 숫자 개수입니다. 숫자 3개를 한꺼번에 밀면 3회로 기록됩니다.
              </li>
              <li>
                게임 정지를 누르면 현재 게임이 종료됩니다. 게임 시작을 누르면 새 퍼즐이 시작됩니다.
              </li>
            </ol>
          </div>
          <p className="puzzle-rules">
            기록은 서버가 확인한 첫 이동부터 마지막 이동까지 측정됩니다. 1시간 안에 완성하면 자동
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
          <div className="puzzle-prizes" aria-label="월간 랭킹 보상">
            {puzzleMonthlyPrizes.map((amount, index) => (
              <div key={index}>
                <span>
                  <Trophy size={14} /> {index + 1}위
                </span>
                <strong>
                  {amount.toLocaleString()}
                  <small> P</small>
                </strong>
              </div>
            ))}
          </div>
          <p className="puzzle-rules">
            매월 1일 01시(한국 시간)부터 전월 보상을 자동 지급합니다. 월말 완료 기록의 등록 유예
            1시간 후 확정하며, 누적·현재 포인트에 모두 반영됩니다. 2026년 11월 기록부터 적용됩니다.
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
