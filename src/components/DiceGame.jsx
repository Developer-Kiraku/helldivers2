'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Dices,
  Coins,
  Users,
  Timer,
  LockKeyhole,
  Trophy,
  ArrowRight,
  Flag,
  Square,
  X,
} from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { useDiceGame } from './DiceGameProvider';
import Dice3D from './Dice3D';
import DiceSkinPicker from './DiceSkinPicker';
import Avatar from './Avatar';
import { Button } from './ui';
import { diceMaxMultiplier } from '@/lib/dice-rules.mjs';

const number = (value) => (value || 0).toLocaleString('ko-KR');
export default function DiceGame() {
  const { user, role, actualRole } = useCommunity();
  const context = useDiceGame();
  const [stake, setStake] = useState(100),
    [multiplier, setMultiplier] = useState(1);
  const { data, pendingInvite, now = 0, error, busy, act } = context || {};
  const game = data?.game,
    mine = game?.players.find((player) => player.id === user.id),
    opponent = game?.players.find((player) => player.id !== user.id);
  const playing = game?.status === 'playing',
    revealing = game?.status === 'revealing',
    finished = game?.status === 'finished';
  const active =
    ['invited', 'playing', 'revealing'].includes(game?.status) || Boolean(game?.autoContinue);
  const inProgress = playing || revealing;
  const roundCount = game?.roundCount || 4;
  const publicDieIndex = game ? (game.publicDieIndex ?? (game.firstDiePublic ? 0 : null)) : 1;
  const matchNumber = game?.matchNumber || 1;
  const maxMultiplier = diceMaxMultiplier(game?.round || 1);
  const selectedMultiplier = Math.min(multiplier, maxMultiplier);
  useEffect(() => setMultiplier(1), [game?.id, game?.round]);
  const arenaRef = useRef(null);
  useEffect(() => {
    if (!inProgress) return;
    // Let the invitation dialog close and restore focus before moving to the arena.
    const frame = requestAnimationFrame(() => {
      arenaRef.current?.focus({ preventScroll: true });
      arenaRef.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [game?.id, inProgress]);
  const rolling = (playing || revealing) && now < game.readyAt;
  const preview = role !== actualRole;
  const bet = (game?.stake || stake) * selectedMultiplier;
  const waiting = Boolean(mine?.decision);
  const canChoose = playing && !rolling && !waiting && !busy && !preview;
  const seconds = Math.max(0, ((game?.deadlineAt || now) - now) / 1000);
  const cooldown = Math.max(0, ((data?.inviteAvailableAt || 0) - now) / 1000);
  const wallet = data?.points.current ?? user.points.current;
  const nextSeconds = Math.max(0, Math.ceil(((game?.nextRoundAt || now) - now) / 1000));
  const stopName = game?.players.find((player) => player.id === game.stopBy)?.nickname;
  const continuationMessage = game?.autoContinue
    ? finished
      ? nextSeconds > 0
        ? `${nextSeconds}초 후 같은 최소 금액으로 다음 판이 시작됩니다.`
        : '대원들의 게임 접속을 확인하고 있습니다.'
      : '결과 확인 후 다음 판이 자동으로 시작됩니다.'
    : game?.stopReason === 'requested'
      ? `${stopName || '상대 대원'}님이 이번 판까지만 선택했습니다.`
      : game?.stopReason === 'left'
        ? '대원이 게임 페이지를 떠나 연속 게임을 종료합니다.'
        : game?.stopReason === 'points'
          ? '최소 베팅 포인트가 부족하여 연속 게임을 종료했습니다.'
          : game?.stopReason === 'timeout'
            ? '응답 시간이 초과되어 연속 게임을 종료했습니다.'
            : '게임이 종료되었습니다. 다른 대원을 초대할 수 있습니다.';
  const resultTitle = finished
    ? !game.winnerId
      ? '무승부 · 베팅액 반환'
      : game.winnerId === user.id
        ? '승리! 배팅액을 획득했습니다.'
        : '이번 승부는 아쉽게 패배했어요.'
    : '';
  return (
    <section className="dice-page">
      <header className="dice-heading">
        <div>
          <span className="eyebrow">SQUAD VS SQUAD</span>
          <h1>
            <Dices size={29} />
            민주주의 주사위
          </h1>
          <p>두 번째 주사위는 서로 공개합니다. 네 번째 주사위까지의 합으로 승부합니다.</p>
        </div>
        <div className="dice-heading-actions">
          <DiceSkinPicker />
          <div className="dice-wallet">
            <Coins size={20} />
            <span>
              사용 가능한 포인트
              <strong>
                {number(wallet)}
                <small> P</small>
              </strong>
            </span>
          </div>
        </div>
      </header>
      {preview && <p className="form-error">실제 등급으로 돌아오면 게임에 참여할 수 있습니다.</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!data && !preview && <p role="status">로그인 중인 대원을 확인하고 있습니다…</p>}
      <div className="dice-layout">
        <section
          ref={arenaRef}
          className={'dice-arena' + (inProgress ? ' is-active' : '')}
          tabIndex={-1}
          aria-label="민주주의 주사위 게임판"
        >
          <div className="dice-arena-top">
            <span className="dice-live-label">
              <i />
              {playing
                ? 'BETTING ROUND'
                : revealing
                  ? 'FINAL ROLL'
                  : finished
                    ? 'SHOWDOWN'
                    : 'READY TO ROLL'}
            </span>
            <span>{game ? '최소 베팅 ' + number(game.stake) + ' P' : '1 : 1 POINT MATCH'}</span>
          </div>
          {playing && game.round === 1 && rolling && (
            <div key={game.id} className="dice-game-start" role="status">
              <Dices size={28} />
              <span>{matchNumber > 1 ? '다음 게임 시작' : '게임 시작'}</span>
              <strong>{matchNumber}번째 게임</strong>
              <small>첫 주사위를 굴립니다</small>
            </div>
          )}
          {!pendingInvite && (inProgress || finished) && (
            <div className={'dice-continuation' + (!game.autoContinue ? ' is-stopping' : '')}>
              <div role="status" aria-live="polite">
                <strong>
                  {game.autoContinue
                    ? '연속 게임'
                    : finished
                      ? '연속 게임 종료'
                      : '이번 판 종료 후 마칩니다'}
                </strong>
                <p>{continuationMessage}</p>
              </div>
              {game.autoContinue && (
                <Button
                  type="button"
                  disabled={busy || preview}
                  onClick={() => act('stop', { gameId: game.id })}
                >
                  <Square size={14} /> 이번 판까지만
                </Button>
              )}
            </div>
          )}
          {inProgress && (
            <div className="dice-match-status" role="status" aria-live="polite" aria-atomic="true">
              <Dices size={24} />
              <div>
                <strong>
                  {matchNumber}번째 게임 ·{' '}
                  {game.round === 1 ? '승부가 시작되었습니다!' : '게임 진행 중'}
                </strong>
                <p>
                  {opponent?.nickname}님과의 승부 · {game.round}번째 턴
                </p>
              </div>
            </div>
          )}
          <div className="dice-turns">
            {Array.from({ length: roundCount }, (_, index) =>
              index === roundCount - 1
                ? '최종 공개'
                : index === publicDieIndex
                  ? '공개 · 선택'
                  : `${index + 1}번째 선택`,
            ).map((label, index) => (
              <span
                key={label}
                className={
                  game?.round === index + 1
                    ? 'is-current'
                    : game?.round > index + 1
                      ? 'is-past'
                      : ''
                }
              >
                <b>{String(index + 1).padStart(2, '0')}</b>
                {label}
              </span>
            ))}
          </div>
          {pendingInvite || !game || !['playing', 'revealing', 'finished'].includes(game.status) ? (
            <div className="dice-empty-table">
              <Dices size={64} />
              <h2>
                {pendingInvite
                  ? '초대를 보내고 있습니다'
                  : !data
                    ? '진행 중인 게임을 불러옵니다'
                    : game?.status === 'invited'
                      ? '대원의 응답을 기다립니다'
                      : '오늘의 승부를 시작해보세요'}
              </h2>
              <p>
                {pendingInvite
                  ? pendingInvite.nickname + '님에게 초대를 보내고 있습니다.'
                  : !data
                    ? '저장된 주사위와 베팅 상태를 확인하고 있습니다.'
                    : game?.status === 'invited'
                      ? opponent?.nickname +
                        (game.hostId === user.id
                          ? '님에게 초대를 보냈습니다.'
                          : '님에게 초대받았습니다.')
                      : game?.status === 'expired'
                        ? '초대가 만료되었습니다. 로그인 중인 대원을 다시 초대해보세요.'
                        : game?.status === 'declined'
                          ? '상대가 초대를 거절했습니다.'
                          : game?.status === 'cancelled'
                            ? game.hostId === user.id
                              ? '초대를 취소했습니다. 다른 대원을 초대할 수 있습니다.'
                              : '상대가 초대를 취소했습니다.'
                            : '오른쪽 대원 목록에서 최소 베팅액을 선택하고 초대하세요.'}
              </p>
              {!pendingInvite && game?.status === 'invited' && (
                <strong className="dice-invite-count">
                  {game.receivedAt
                    ? Math.max(0, (game.expiresAt - now) / 1000).toFixed(1) + '초 남음'
                    : '상대가 초대를 확인하면 1분 동안 응답할 수 있습니다.'}
                </strong>
              )}
              {!pendingInvite && game?.status === 'invited' && game.hostId === user.id && (
                <Button
                  type="button"
                  disabled={busy || preview}
                  onClick={() => act('cancel', { gameId: game.id })}
                >
                  <X size={16} /> 초대 취소
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="dice-duel">
                {[mine, opponent].map((player) => {
                  const self = player.id === user.id;
                  const hidden = !self && !finished;
                  const visibleRoll = publicDieIndex === game.round - 1;
                  const value = hidden && !visibleRoll ? null : player.dice.at(-1);
                  return (
                    <div
                      key={player.id}
                      className={
                        'dice-player' +
                        (self ? ' is-mine' : '') +
                        (game.winnerId === player.id ? ' is-winner' : '')
                      }
                    >
                      <div className="dice-player-name">
                        <Avatar name={player.nickname} photo={player.photo} size="small" />
                        <strong>{player.nickname}</strong>
                        <span>{self ? '나' : '상대'}</span>
                      </div>
                      <div className="dice-player-score">
                        <small>
                          {hidden && !visibleRoll ? (
                            <>
                              <LockKeyhole size={12} /> 비공개 합계
                            </>
                          ) : self ? (
                            '나의 합계'
                          ) : visibleRoll && !finished ? (
                            `공개된 ${publicDieIndex + 1}번째 주사위`
                          ) : (
                            '상대 합계'
                          )}
                        </small>
                        <strong>
                          {rolling || (hidden && !visibleRoll)
                            ? '—'
                            : hidden
                              ? player.dice[publicDieIndex]
                              : player.sum}
                        </strong>
                      </div>
                      <Dice3D
                        skin={player.skin}
                        key={game.id + ':' + game.round + ':' + player.id}
                        rollKey={game.id + ':' + game.round + ':' + player.id}
                        durationMs={game.readyAt - now}
                        value={value}
                        rolling={rolling}
                      />
                      <div className="dice-history">
                        {Array.from({ length: roundCount }, (_, index) => (
                          <span key={index}>
                            {index >= game.round ? (
                              '·'
                            ) : hidden && index !== publicDieIndex ? (
                              <LockKeyhole size={13} />
                            ) : player.dice[index] != null ? (
                              rolling && index === game.round - 1 ? (
                                '·'
                              ) : (
                                player.dice[index]
                              )
                            ) : (
                              '·'
                            )}
                          </span>
                        ))}
                      </div>
                      <span className="dice-bet">
                        베팅 <b>{number(player.bet)} P</b>
                      </span>
                      {player.decision && !finished && (
                        <span className="dice-decision">
                          {self ? player.decision.toUpperCase() + ' 완료' : '선택 완료'}
                        </span>
                      )}
                    </div>
                  );
                })}
                <div className="dice-versus">VS</div>
              </div>
              <div className="dice-pot">
                <Coins size={22} />
                <span>총 배팅액</span>
                <strong>
                  {number(game.pot)} <small>P</small>
                </strong>
              </div>
              {playing && (
                <div className="dice-betting">
                  <div className="dice-betting-heading">
                    <strong>
                      {rolling
                        ? '주사위가 멈추면 선택하세요'
                        : waiting
                          ? '상대의 선택을 기다립니다'
                          : '계속할까요, 여기서 멈출까요?'}
                    </strong>
                    <span>
                      <Timer size={15} />
                      {Math.ceil(Math.min(30, seconds))}초
                    </span>
                  </div>
                  <div className="dice-deadline">
                    <span style={{ width: Math.min(100, (seconds / 30) * 100) + '%' }} />
                  </div>
                  {game.round > 1 && (
                    <div
                      className="dice-multipliers"
                      data-round={game.round}
                      aria-label={`${game.round}번째 턴 베팅 금액`}
                    >
                      {Array.from({ length: maxMultiplier }, (_, index) => index + 1).map(
                        (value) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={selectedMultiplier === value}
                            disabled={!canChoose || wallet < game.stake * value}
                            onClick={() => setMultiplier(value)}
                          >
                            {number(game.stake * value)} P
                          </button>
                        ),
                      )}
                    </div>
                  )}
                  <div className="dice-choice-actions">
                    <Button
                      type="button"
                      className="dice-call"
                      disabled={!canChoose || wallet < bet}
                      title={
                        wallet < bet
                          ? `보유 ${number(wallet)} P · 필요한 금액 ${number(bet)} P`
                          : undefined
                      }
                      onClick={() =>
                        act('decision', {
                          gameId: game.id,
                          round: game.round,
                          choice: 'call',
                          multiplier: selectedMultiplier,
                        })
                      }
                    >
                      <ArrowRight size={17} />
                      {wallet < bet && !waiting ? 'CALL 불가' : 'CALL'} <span>{number(bet)} P</span>
                    </Button>
                    <Button
                      type="button"
                      className="dice-die"
                      disabled={!canChoose}
                      onClick={() =>
                        act('decision', { gameId: game.id, round: game.round, choice: 'die' })
                      }
                    >
                      <Flag size={17} />
                      DIE
                    </Button>
                  </div>
                  {wallet < bet && !waiting && (
                    <p role="status">
                      보유 포인트 {number(wallet)} P · 선택 금액 {number(bet)} P. 포인트가 부족하여
                      CALL할 수 없습니다.
                    </p>
                  )}
                  <p>
                    양쪽 선택 후 판정합니다. 둘 다 DIE면 무승부, 한쪽만 DIE면 이전 턴까지의
                    배팅액으로 정산합니다.
                  </p>
                </div>
              )}
              {revealing && (
                <p className="dice-final-message" role="status">
                  마지막 주사위가 멈추면 모든 결과가 공개됩니다.
                </p>
              )}
              {finished && (
                <div
                  className={'dice-result' + (game.winnerId === user.id ? ' is-win' : '')}
                  role="status"
                >
                  <Trophy size={28} />
                  <h2>{resultTitle}</h2>
                  <p>
                    {game.reason === 'showdown'
                      ? `주사위 ${roundCount}개의 합으로 결정된 결과입니다.`
                      : game.reason === 'timeout'
                        ? '선택 시간이 초과되어 승부가 종료됐습니다.'
                        : game.reason === 'left'
                          ? '상대 회원이 탈퇴하여 승부가 종료됐습니다.'
                          : !game.winnerId
                            ? '두 대원 모두 DIE를 선택하여 베팅액을 돌려받습니다.'
                            : '이번 턴의 베팅액은 반환하고 이전 턴까지의 배팅액만 정산했습니다.'}
                  </p>
                </div>
              )}
              {finished && game.autoContinue && (
                <div className="dice-next-game" role="status">
                  <span className="dice-next-count" key={nextSeconds}>
                    {nextSeconds || '·'}
                  </span>
                  <div>
                    <strong>
                      {nextSeconds > 0 ? '잠시 후 다음 게임이 시작됩니다' : '대원 접속 확인 중'}
                    </strong>
                    <p>
                      {matchNumber + 1}번째 게임 · 최소 베팅 {number(game.stake)} P
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        <aside className="dice-lobby">
          <header>
            <div>
              <Users size={19} />
              <h2>로그인 중인 대원</h2>
            </div>
            <span>{data?.online.length || 0}</span>
          </header>
          <p>최소 베팅액을 고른 뒤 대원을 초대하세요.</p>
          <div className="dice-stakes" aria-label="초대 최소 베팅액">
            {[10, 100, 1000].map((value) => (
              <button
                type="button"
                key={value}
                disabled={active || busy || preview || wallet < value}
                aria-pressed={stake === value}
                onClick={() => setStake(value)}
              >
                {number(value)}
                <small> P</small>
              </button>
            ))}
          </div>
          <div className="dice-member-list">
            {data?.online.map((player) => (
              <div className="dice-member" key={player.id}>
                <Avatar name={player.nickname} photo={player.photo} size="small" />
                <div>
                  <strong>{player.nickname}</strong>
                  <span>
                    {(player.busy || player.focused) && <i />}
                    {player.busy
                      ? '게임 · 초대 진행 중'
                      : player.focused
                        ? '초대 가능'
                        : '자리 비움'}
                  </span>
                </div>
                <Button
                  type="button"
                  disabled={
                    active || player.busy || busy || preview || cooldown > 0 || wallet < stake
                  }
                  aria-label={player.nickname + '님 초대'}
                  onClick={() => act('invite', { targetId: player.id, stake })}
                >
                  초대
                </Button>
              </div>
            ))}
            {data && !data.online.length && (
              <p className="dice-no-members">현재 로그인 중인 다른 대원이 없습니다.</p>
            )}
          </div>
          {cooldown > 0 && <p className="dice-cooldown">다음 초대까지 {cooldown.toFixed(1)}초</p>}
          <div className="dice-lobby-note">
            <Timer size={16} />
            <p>
              초대는 1분 동안 표시됩니다.
              <br />
              초대를 수락해도 CALL 전에는 포인트가 차감되지 않습니다.
            </p>
          </div>
        </aside>
      </div>
      <details className="dice-rules">
        <summary>게임 방법 · 포인트 정산</summary>
        <ol>
          <li>10·100·1,000P 중 최소 베팅액을 골라 현재 로그인 중인 대원을 초대합니다.</li>
          <li>
            1턴에는 본인의 첫 주사위를 보고 CALL 또는 DIE를 선택합니다. CALL은 최소 금액만큼
            베팅합니다.
          </li>
          <li>
            2턴의 주사위는 서로 공개하며, 3턴의 주사위는 본인만 확인합니다. 베팅 버튼에는 실제로
            차감되는 포인트가 표시됩니다. 2턴은 {number(game?.stake || stake)}~
            {number((game?.stake || stake) * 5)} P, 3턴은 {number(game?.stake || stake)}~
            {number((game?.stake || stake) * 10)} P 중 선택합니다.
          </li>
          <li>
            3턴까지 두 대원 모두 CALL하면 네 번째 주사위를 굴려 전부 공개합니다. 합이 높은 대원이
            배팅액 전체를 가져갑니다. 동점은 각자 베팅액을 돌려받습니다.
          </li>
          <li>
            두 대원의 선택은 모두 결정할 때까지 비공개입니다. 둘 다 DIE면 무승부로 베팅액을
            반환합니다. 한쪽만 DIE면 해당 턴의 CALL 베팅액을 돌려준 뒤 이전 턴까지의 배팅액만 상대가
            가져갑니다. 30초 동안 선택하지 않으면 DIE로 처리합니다.
          </li>
          <li>
            결과를 5초 동안 확인한 뒤 같은 최소 금액으로 다음 판이 자동 시작됩니다. 한 명이 ‘이번
            판까지만’을 누르거나 게임 페이지를 떠나면 현재 판까지만 진행합니다. 새로고침하면 진행
            중인 게임에 복귀합니다. 응답 시간 초과·포인트 부족 시에는 연속 게임이 종료됩니다. 베팅과
            정산은 현재 포인트에만 반영됩니다.
          </li>
        </ol>
      </details>
    </section>
  );
}
