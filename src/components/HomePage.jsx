'use client';
import Nickname from './Nickname';
import DashboardHero from './DashboardHero';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { boards } from '@/lib/data';
import { useCommunity } from './CommunityProvider';
import Icon from './Icon';
import PageSkeleton from './PageSkeleton';

function Clock() {
  const [time, setTime] = useState('--:--:--');
  useEffect(() => {
    const tick = () =>
      setTime(
        new Intl.DateTimeFormat('ko-KR', {
          timeZone: 'Asia/Seoul',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
        }).format(new Date()),
      );
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);
  return <strong className="clock">{time}</strong>;
}

export default function HomePage() {
  const { signedIn, posts, stats, ready } = useCommunity();
  if (!ready) return <PageSkeleton path="/" />;
  return (
    <div className="home-page">
      <DashboardHero />
      <section className="status-strip" aria-label="커뮤니티 현황">
        <div>
          <small>함께하는 대원</small>
          <strong>
            {stats.onlineMembers}
            <span>명</span>
          </strong>
          <em>● ONLINE</em>
        </div>
        <div>
          <small>총 대원 수</small>
          <strong>
            {stats.totalMembers}
            <span>명</span>
          </strong>
          <em>HELLDIVERS</em>
        </div>
        <div>
          <small>현재 시각</small>
          <Clock />
          <em>KST</em>
        </div>
      </section>
      {!signedIn && (
        <p className="muted-callout">
          <Icon name="lock" size={16} />
          게시판은 로그인 후 이용할 수 있습니다. 가입하고 최신 소식을 만나보세요.
        </p>
      )}
      <div className="home-board-grid">
        {['notice', 'guide'].map((board) => (
          <section className="panel latest-panel" key={board}>
            <header className="section-heading">
              <h2>
                <Icon name={board === 'notice' ? 'flag' : 'target'} />
                {boards[board].label}
              </h2>
              <Link href={`/boards/${board}`}>전체 보기 ↗</Link>
            </header>
            <ul className="latest-list">
              {posts[board].slice(0, 5).map((post) => (
                <li key={post.id}>
                  <Link href={`/boards/${board}/${post.id}`}>
                    <span className="badge">{post.category}</span>
                    <span className="latest-title">
                      <span className="post-title-text" title={signedIn ? post.title : undefined}>
                        {signedIn ? post.title : '로그인 후 게시글을 확인할 수 있습니다.'}
                      </span>
                      {signedIn && <em>{post.comments}</em>}
                    </span>
                    <time>{post.date.slice(5)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="panel home-talk">
        <header className="section-heading">
          <h2>
            <Icon name="talk" />
            헬다이버톡
          </h2>
          <Link href="/boards/talk">전체 보기 ↗</Link>
        </header>
        <div className="talk-preview-grid">
          {posts.talk.slice(0, 6).map((post) => (
            <Link key={post.id} className="talk-preview-card" href={`/boards/talk/${post.id}`}>
              <small>
                {post.category}
                {signedIn ? (
                  <>
                    {' '}
                    · <Nickname name={post.author} role={post.authorRole} own={post.own} />
                  </>
                ) : (
                  ' · 회원 전용'
                )}
              </small>
              <h3 title={signedIn ? post.title : undefined}>
                {signedIn ? post.title : '동료들의 이야기가 기다리고 있어요.'}
              </h3>
              <footer>
                {signedIn ? (
                  <>
                    추천 {post.likes} · 댓글 {post.comments}
                  </>
                ) : (
                  <>로그인하고 읽기 →</>
                )}
              </footer>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
