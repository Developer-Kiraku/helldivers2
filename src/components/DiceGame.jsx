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
  RotateCcw,
} from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { useDiceGame } from './DiceGameProvider';
import Dice3D from './Dice3D';
import Avatar from './Avatar';
import { Button } from './ui';

const number = (value) => (value || 0).toLocaleString('ko-KR');
export default function DiceGame() {
  const { user, role, actualRole } = useCommunity();
  const context = useDiceGame();
  const [stake, setStake] = useState(100),
    [multiplier, setMultiplier] = useState(2);
  const { data, now = 0, error, busy, act } = context || {};
  const game = data?.game,
    mine = game?.players.find((player) => player.id === user.id),
    opponent = game?.players.find((player) => player.id !== user.id);
  const playing = game?.status === 'playing',
    revealing = game?.status === 'revealing',
    finished = game?.status === 'finished';
  const active = ['invited', 'playing', 'revealing'].includes(game?.status);
  const inProgress = playing || revealing;
  const arenaRef = useRef(null);
  useEffect(() => {
    if (!inProgress || !window.matchMedia('(max-width: 760px)').matches) return;
    arenaRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }, [game?.id, inProgress]);
  const rolling = (playing || revealing) && now < game.readyAt;
  const preview = role !== actualRole;
  const bet = (game?.stake || stake) * (game?.round === 2 ? multiplier : 1);
  const waiting = Boolean(mine?.decision);
  const canChoose = playing && !rolling && !waiting && !busy && !preview;
  const seconds = Math.max(0, ((game?.deadlineAt || now) - now) / 1000);
  const cooldown = Math.max(0, ((data?.inviteAvailableAt || 0) - now) / 1000);
  const wallet = data?.points.current ?? user.points.current;
  const resultTitle = finished
    ? !game.winnerId
      ? '무승부 · 베팅액 반환'
      : game.winnerId === user.id
        ? '승리! 판돈을 획득했습니다.'
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
          <p>세 번의 주사위, 두 번의 선택. 마지막에 합계가 높은 대원이 승리합니다.</p>
        </div>
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
      </header>
      {preview && <p className="form-error">실제 등급으로 돌아오면 게임에 참여할 수 있습니다.</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!data && !preview && <p role="status">로그인 중인 대원을 확인하고 있습니다…</p>}
      <div className="dice-layout">
        <section ref={arenaRef} className="dice-arena" aria-label="민주주의 주사위 게임판">
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
          <div className="dice-turns">
            {['첫 번째 선택', '두 번째 선택', '마지막 공개'].map((label, index) => (
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
          {!game || !['playing', 'revealing', 'finished'].includes(game.status) ? (
            <div className="dice-empty-table">
              <Dices size={64} />
              <h2>
                {!data
                  ? '진행 중인 게임을 불러옵니다'
                  : game?.status === 'invited'
                    ? '대원의 응답을 기다립니다'
                    : '오늘의 승부를 시작해보세요'}
              </h2>
              <p>
                {!data
                  ? '저장된 주사위와 베팅 상태를 확인하고 있습니다.'
                  : game?.status === 'invited'
                    ? opponent?.nickname + '님에게 초대를 보냈습니다.'
                    : game?.status === 'expired'
                      ? '초대가 만료되었습니다. 로그인 중인 대원을 다시 초대해보세요.'
                      : game?.status === 'declined'
                        ? '상대가 초대를 거절했습니다.'
                        : '오른쪽 대원 목록에서 최소 베팅액을 선택하고 초대하세요.'}
              </p>
              {game?.status === 'invited' && (
                <strong className="dice-invite-count">
                  {Math.max(0, (game.expiresAt - now) / 1000).toFixed(1)}초 남음
                </strong>
              )}
            </div>
          ) : (
            <>
              <div className="dice-duel">
                {[mine, opponent].map((player) => {
                  const self = player.id === user.id;
                  const hidden = !self && !finished;
                  const value = hidden ? null : player.dice.at(-1);
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
                          {hidden ? (
                            <>
                              <LockKeyhole size={12} /> 비공개 합계
                            </>
                          ) : self ? (
                            '나의 합계'
                          ) : (
                            '상대 합계'
                          )}
                        </small>
                        <strong>{hidden || rolling ? '—' : player.sum}</strong>
                      </div>
                      <Dice3D
                        key={game.id + ':' + game.round + ':' + player.id}
                        value={value}
                        rolling={rolling}
                      />
                      <div className="dice-history">
                        {[0, 1, 2].map((index) => (
                          <span key={index}>
                            {hidden ? (
                              <LockKeyhole size={13} />
                            ) : player.dice[index] != null ? (
                              player.dice[index]
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
                        <span className="dice-decision">{player.decision.toUpperCase()} 완료</span>
                      )}
                    </div>
                  );
                })}
                <div className="dice-versus">VS</div>
              </div>
              <div className="dice-pot">
                <Coins size={22} />
                <span>총 판돈</span>
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
                  {game.round === 2 && (
                    <div className="dice-multipliers" aria-label="두 번째 턴 베팅 배수">
                      {Array.from({ length: 9 }, (_, index) => index + 2).map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={multiplier === value}
                          disabled={!canChoose || wallet < game.stake * value}
                          onClick={() => setMultiplier(value)}
                        >
                          {value}배
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="dice-choice-actions">
                    <Button
                      type="button"
                      className="dice-call"
                      disabled={!canChoose || wallet < bet}
                      onClick={() =>
                        act('decision', {
                          gameId: game.id,
                          round: game.round,
                          choice: 'call',
                          multiplier,
                        })
                      }
                    >
                      <ArrowRight size={17} />
                      CALL <span>{number(bet)} P</span>
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
                  <p>
                    {wallet < bet && !waiting ? '선택한 금액을 베팅할 포인트가 부족합니다. ' : ''}
                    DIE 또는 시간 초과 시 기존 판돈을 포기합니다.
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
                      ? '주사위 3개의 합으로 결정된 결과입니다.'
                      : game.reason === 'timeout'
                        ? '선택 시간이 초과되어 승부가 종료됐습니다.'
                        : game.reason === 'left'
                          ? '상대 회원이 탈퇴하여 승부가 종료됐습니다.'
                          : 'DIE 선택으로 승부가 종료됐습니다.'}
                  </p>
                  <div className="dice-rematch-actions">
                    <Button
                      type="button"
                      disabled={
                        busy ||
                        game.rematchDeclined ||
                        game.rematch.includes(user.id) ||
                        wallet < game.stake
                      }
                      onClick={() => act('rematch', { gameId: game.id, accept: true })}
                    >
                      <RotateCcw size={16} />
                      {game.rematch.includes(user.id)
                        ? '상대의 재대결 동의를 기다립니다'
                        : '같은 금액으로 재대결'}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy || game.rematchDeclined}
                      onClick={() => act('rematch', { gameId: game.id, accept: false })}
                    >
                      그만하기
                    </Button>
                  </div>
                  {!game.rematchDeclined &&
                    game.rematch.includes(opponent.id) &&
                    !game.rematch.includes(user.id) && (
                      <p>{opponent.nickname}님이 재대결을 기다리고 있습니다.</p>
                    )}
                  {game.rematchDeclined && (
                    <p>재대결을 종료했습니다. 다른 대원을 초대할 수 있습니다.</p>
                  )}
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
                disabled={active || busy || preview}
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
                    <i />
                    {player.busy ? '게임 · 초대 진행 중' : '초대 가능'}
                  </span>
                </div>
                <Button
                  type="button"
                  disabled={
                    active || player.busy || busy || preview || cooldown > 0 || wallet < stake
                  }
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
              초대는 5초 동안 표시됩니다.
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
            1턴에는 각자 주사위 하나를 보고 CALL 또는 DIE를 선택합니다. CALL은 최소 금액만큼
            베팅합니다.
          </li>
          <li>
            2턴에는 주사위 하나를 더 보고 최소 금액의 2~10배를 추가로 베팅합니다. 서로 다른 배수도
            가능합니다.
          </li>
          <li>
            두 대원 모두 CALL하면 세 번째 주사위를 굴려 전부 공개합니다. 합이 높은 대원이 판돈
            전체를 가져갑니다. 동점은 각자 베팅액을 돌려받습니다.
          </li>
          <li>
            DIE 또는 30초 시간 초과 시 기존 판돈을 포기합니다. 두 대원 모두 선택하지 않은 채 시간이
            지나면 각자 베팅액을 반환합니다.
          </li>
          <li>
            결과 화면에서 두 대원이 모두 재대결에 동의하면 같은 최소 금액으로 새 게임이 시작됩니다.
            베팅과 정산은 현재 포인트에만 반영됩니다.
          </li>
        </ol>
      </details>
    </section>
  );
}
