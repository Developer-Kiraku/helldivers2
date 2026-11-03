'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AtSign,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Reply,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useCommunity } from './CommunityProvider';

const icons = {
  comment: MessageCircle,
  reply: Reply,
  mention: AtSign,
  like: ThumbsUp,
  dislike: ThumbsDown,
};
function description(item) {
  if (item.kind === 'mention')
    return item.actor + '님이 ' + (item.commentId ? '댓글' : '게시글') + '에서 나를 멘션했습니다.';
  if (item.kind === 'reply') return item.actor + '님이 내 댓글에 답글을 남겼습니다.';
  if (item.kind === 'comment') return item.actor + '님이 내 글에 댓글을 남겼습니다.';
  return (
    (item.commentId ? '내 댓글' : '내 글') +
    '에 ' +
    (item.kind === 'like' ? '추천' : '비추천') +
    '이 추가되었습니다.'
  );
}
export default function NotificationInbox({ compact = false, onNavigate }) {
  const { api, setUnreadNotifications, actualRole, role } = useCommunity();
  const router = useRouter();
  const [page, setPage] = useState(1),
    [version, reload] = useState(0);
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const preview = actualRole !== role;
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    api(compact ? 'notifications?limit=5' : 'notifications?page=' + page)
      .then((result) => {
        if (active) {
          setData(result);
          setUnreadNotifications(result.unreadCount);
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [api, page, version, setUnreadNotifications, role, compact]);
  async function read(item) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api(item ? 'notifications/' + item.id + '/read' : 'notifications/read', {
        method: 'POST',
      });
      setUnreadNotifications(result.unreadCount);
      if (item) {
        onNavigate?.();
        router.push(item.href);
      } else reload((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={compact ? 'notification-preview-body' : 'messages-page activity-page'}>
      {!compact && (
        <header className="messages-heading">
          <div>
            <span className="eyebrow">ACTIVITY</span>
            <h1>알림함</h1>
          </div>
          <button
            className="notification-link"
            type="button"
            disabled={preview || busy || !data?.unreadCount}
            onClick={() => read(null)}
          >
            <CheckCheck size={16} />
            모두 읽음
          </button>
        </header>
      )}
      {error && (
        <p className="message-error" role="alert">
          {error} <button onClick={() => reload((v) => v + 1)}>다시 시도</button>
        </p>
      )}
      {!data && !error && (
        <p className="messages-empty" role="status">
          알림을 불러오는 중…
        </p>
      )}
      {data && (
        <>
          <div className="message-list">
            {data.notifications.map((item) => {
              const Icon = icons[item.kind];
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onNavigate={onNavigate}
                  className={`message-row${item.readAt ? '' : ' is-unread'}`}
                  onClick={(event) => {
                    if (
                      item.readAt ||
                      preview ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return;
                    event.preventDefault();
                    void read(item);
                  }}
                >
                  <span className="message-row-icon">
                    <Icon size={20} />
                  </span>
                  <span className="message-row-content">
                    <span className="message-row-top">
                      <strong>{description(item)}</strong>
                      {!compact && (
                        <time dateTime={item.createdAt}>
                          {new Date(item.createdAt).toLocaleString('ko-KR', {
                            timeZone: 'Asia/Seoul',
                          })}
                        </time>
                      )}
                    </span>
                    <span className="message-preview">{item.title}</span>
                  </span>
                  {!item.readAt && (
                    <span className={compact ? 'notification-unread-dot' : 'message-read-status'}>
                      <span className={compact ? 'sr-only' : undefined}>안 읽음</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          {!data.notifications.length && (
            <div className="messages-empty">
              <Bell size={32} />
              <h2>아직 받은 알림이 없습니다.</h2>
            </div>
          )}
          {!compact && data.pageCount > 1 && (
            <nav className="message-pagination" aria-label="알림 목록 페이지">
              <button
                aria-label="이전 페이지"
                disabled={data.page === 1}
                onClick={() => setPage(data.page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                {data.page} / {data.pageCount}
              </span>
              <button
                aria-label="다음 페이지"
                disabled={data.page === data.pageCount}
                onClick={() => setPage(data.page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
