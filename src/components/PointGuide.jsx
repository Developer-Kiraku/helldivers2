'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Coins,
  UserPlus,
  CalendarCheck,
  FilePenLine,
  MessageCircle,
  ThumbsUp,
  Grid3X3,
  Dices,
  Hand,
  RadioTower,
  ArrowUpRight,
} from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import useRefreshOnReturn from '@/hooks/useRefreshOnReturn';
import { Button } from './ui';
import { puzzleMonthlyPrizes } from '@/lib/sliding-puzzle.mjs';
import { rpsDailyAttempts } from '@/lib/rps-rules.mjs';
import { diceConsolation } from '@/lib/dice-rules.mjs';
import { challengeEntry, challengeStages } from '@/lib/stratagem-challenge.mjs';

const number = (value = 0) => value.toLocaleString('ko-KR');
export default function PointGuide() {
  const { api, user } = useCommunity();
  const [settings, setSettings] = useState(null),
    [error, setError] = useState('');
  const alive = useRef(true);
  const refresh = useCallback(async () => {
    try {
      const result = await api('points/guide');
      if (alive.current) {
        setSettings(result.settings);
        setError('');
      }
    } catch (err) {
      if (alive.current) setError(err.message);
    }
  }, [api]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);
  useRefreshOnReturn(refresh);
  const activities = settings && [
    {
      icon: UserPlus,
      name: '처음 가입하면',
      amount: settings.signup,
      note: '회원가입 완료 시 한 번 지급됩니다.',
    },
    {
      icon: CalendarCheck,
      name: '오늘 처음 접속하면',
      amount: settings.daily,
      note: '한국 시간 00시 기준, 하루 한 번 지급됩니다.',
    },
    {
      icon: FilePenLine,
      name: '게시글을 작성하면',
      amount: settings.post,
      bonus: true,
      note: '등록을 완료한 새 게시글에 지급됩니다. 임시저장은 제외됩니다.',
    },
    {
      icon: MessageCircle,
      name: '댓글을 작성하면',
      amount: settings.comment,
      bonus: true,
      note: '댓글과 답글을 작성할 때 지급됩니다.',
    },
    {
      icon: ThumbsUp,
      name: '추천을 누르거나 받으면',
      amount: settings.like,
      bonus: true,
      note: '추천한 회원과 글·댓글 작성자에게 각각 지급됩니다. 본인 추천과 비추천은 적립되지 않습니다.',
    },
  ];
  return (
    <section className="point-guide-page">
      <header className="point-guide-heading">
        <span className="eyebrow">COMMUNITY POINT GUIDE</span>
        <h1>
          <Coins size={30} />
          포인트 얻는 방법
        </h1>
        <p>동료들과 나누는 이야기부터 게임까지, 포인트를 모아보세요.</p>
      </header>
      <div className="point-guide-balances">
        <div>
          <span>현재 포인트</span>
          <strong>
            {number(user?.points?.current)}
            <small> P</small>
          </strong>
          <p>게임 등에 사용할 수 있는 포인트</p>
        </div>
        <div>
          <span>누적 포인트</span>
          <strong>
            {number(user?.points?.total)}
            <small> P</small>
          </strong>
          <p>활동으로 적립한 포인트 · 회수 내역 반영</p>
        </div>
      </div>
      <section className="panel point-guide-activity">
        <h2>커뮤니티 활동으로 모으기</h2>
        {error && (
          <p role="alert" className="form-error">
            {error}
            <Button onClick={refresh}>다시 불러오기</Button>
          </p>
        )}
        {!settings && !error && <p role="status">현재 적립 기준을 불러오고 있어요…</p>}
        {settings && (
          <>
            <p className="point-guide-bonus">
              공략브리핑 · 로드아웃 · 티어 메이커에서는 글·댓글·추천 포인트가{' '}
              <strong>{settings.bonusMultiplier}배</strong> 적립됩니다.
            </p>
            <ul>
              {activities.map(({ icon: Glyph, name, amount, note, bonus }) => (
                <li key={name}>
                  <div className="point-guide-glyph">
                    <Glyph size={22} />
                  </div>
                  <div>
                    <h3>{name}</h3>
                    <p>{note}</p>
                  </div>
                  <div className="point-guide-amount">
                    <strong>+{number(amount)} P</strong>
                    {bonus && (
                      <small>추가 적립 게시판 +{number(amount * settings.bonusMultiplier)} P</small>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="point-guide-caption">
              현재 SETTING에 등록된 적립 기준입니다. 기준이 바뀌면 이 안내에도 반영됩니다.
            </p>
          </>
        )}
      </section>
      <section className="point-guide-games">
        <h2>게임으로 도전하기</h2>
        <div>
          <article className="panel">
            <Grid3X3 size={27} />
            <h3>슬라이딩 퍼즐</h3>
            <p>월간 랭킹 1~3위에게 포인트를 지급합니다.</p>
            <ol>
              {puzzleMonthlyPrizes.map((prize, index) => (
                <li key={index}>
                  <span>{index + 1}위</span>
                  <strong>{number(prize)} P</strong>
                </li>
              ))}
            </ol>
            <p>
              클리어 시간이 빠를수록, 같다면 이동 횟수가 적을수록 높은 순위입니다. 한국 시간으로
              월이 끝난 뒤 1시간 후 확정되며 누적·현재 포인트에 모두 적립됩니다.
            </p>
            <Link href="/games/sliding-puzzle">
              퍼즐 도전하기
              <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className="panel">
            <Hand size={27} />
            <h3>가위바위보</h3>
            <p>승리하면 배팅액의 1~10배를 받습니다. 1배는 본전이고 10배 확률은 1%입니다.</p>
            <strong className="point-guide-game-highlight">
              매일 {rpsDailyAttempts}회 + 게시글당 1회
            </strong>
            <p>
              기본 횟수는 매일 리필되며 쌓이지 않습니다. 게시글로 얻은 횟수는 보관됩니다. 무승부는
              배팅액·횟수를 유지하고 패배하면 배팅액을 잃습니다.
            </p>
            <Link href="/games/rps">
              가위바위보 도전하기
              <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className="panel">
            <Dices size={27} />
            <h3>민주주의 주사위</h3>
            <p>
              다른 대원과 포인트를 걸고 겨루는 1:1 게임입니다. 승리하면 정산 대상 배팅액을
              가져갑니다.
            </p>
            <strong className="point-guide-game-highlight">대원과 함께하는 주사위 승부</strong>
            <p>
              첫 게임 시작 시 보유 포인트보다 정산 후 잔액이 {diceConsolation.lossPercent}% 이상
              줄면 위로 포인트 {number(diceConsolation.amount)}P를 받습니다. 연속 게임 전체에서
              대원별 1회 지급됩니다.
            </p>
            <p>
              패배하면 건 포인트를 잃을 수 있습니다. 가위바위보와 주사위의 배팅·보상은 현재
              포인트에만 반영되며 누적 포인트는 바뀌지 않습니다.
            </p>
            <Link href="/games/dice">
              주사위 게임으로
              <ArrowUpRight size={16} />
            </Link>
          </article>
          <article className="panel">
            <RadioTower size={27} />
            <h3>스트라타젬 입력 챌린지</h3>
            <p>
              {challengeEntry}P로 시작해 제한 시간 안에 방향 명령을 입력합니다. 각 단계 성공 후
              보상을 받고 종료하거나 계속 도전할 수 있습니다.
            </p>
            <strong className="point-guide-game-highlight">
              7단계 완주 · {challengeStages.at(-1).payout}P
            </strong>
            <p>
              보상은 참가비를 포함한 총 지급액입니다. 시간 초과 시 보상 없이 종료되며, 참가비와
              보상은 현재 포인트에만 반영됩니다.
            </p>
            <Link href="/games/stratagem">
              입력 챌린지 도전하기
              <ArrowUpRight size={16} />
            </Link>
          </article>
        </div>
      </section>
      <section className="panel point-guide-notes">
        <h2>적립·회수 기준</h2>
        <ul>
          <li>
            게시글·댓글을 삭제하거나 추천을 취소하면 당시 적립된 포인트가 회수됩니다. 추천 취소 시
            추천한 회원과 작성자 양쪽 모두 회수됩니다.
          </li>
          <li>게시글 삭제 시 해당 글에 연결된 댓글·추천 포인트도 회수됩니다.</li>
          <li>총운영자가 이벤트 등으로 지급하는 포인트는 누적·현재 포인트에 모두 반영됩니다.</li>
        </ul>
      </section>
    </section>
  );
}
