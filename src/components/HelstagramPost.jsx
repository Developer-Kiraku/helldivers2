'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import { Popover } from '@radix-ui/themes';
import { Button, Input } from './ui';
import { useCommunity } from './CommunityProvider';
import Avatar from './Avatar';
import Nickname from './Nickname';
import PhotoCarousel from './PhotoCarousel';
import PostShare from './PostShare';
import ModerationActions from './ModerationActions';
import PostPoll from './PostPoll';
import YoutubeVideo from './YoutubeVideo';
import usePostLike from '../hooks/usePostLike';

const number = (value) => Number(value || 0).toLocaleString('ko-KR');

export default function HelstagramPost({ post, detail = false }) {
  const { api, refresh, notify } = useCommunity();
  const like = usePostLike(post);
  const [open, setOpen] = useState(detail),
    [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [draft, setDraft] = useState('');
  const [error, setError] = useState(''),
    [attempt, setAttempt] = useState(0),
    [expanded, setExpanded] = useState(detail);
  const input = useRef(null),
    submitting = useRef(false);
  const href = `/boards/helstagram/${post.id}`,
    panelId = `helsta-comments-${post.id}`;
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError('');
    api(`posts/${post.id}`)
      .then((data) => {
        if (active) setComments(data.comments);
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, post.id, api, attempt]);
  async function comment(event) {
    event.preventDefault();
    if (submitting.current || !draft.trim()) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const data = await api(`posts/${post.id}/comments`, {
        method: 'POST',
        body: { body: draft.trim() },
      });
      setComments((current) => [...current, data.comment]);
      setDraft('');
      setOpen(true);
      await refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function doubleLike() {
    void like.change(true);
  }
  const caption =
    expanded || post.content.length <= 160 ? post.content : `${post.content.slice(0, 160)}…`;
  return (
    <article
      className={`helsta-post ${detail ? 'helsta-post-detail' : ''}`}
      aria-label={`${post.author}의 사진: ${post.title}`}
    >
      <header className="helsta-post-header">
        <span className="helsta-avatar-ring">
          <Avatar name={post.author} own={post.own} photo={post.authorPhoto} />
        </span>
        <div className="helsta-author">
          <strong>
            <Nickname name={post.author} role={post.authorRole} own={post.own} />
          </strong>
          <span>
            {post.category} <span aria-hidden="true">·</span>{' '}
            <time dateTime={post.createdAt}>{post.date}</time>
          </span>
        </div>
        <Popover.Root>
          <Popover.Trigger>
            <Button type="button" className="helsta-icon-button" aria-label="게시글 더보기">
              <MoreHorizontal size={24} />
            </Button>
          </Popover.Trigger>
          <Popover.Content
            className="helsta-post-menu"
            align="end"
            collisionPadding={12}
            aria-label="게시글 메뉴"
          >
            <Link href={href}>
              게시글 자세히 보기 <ArrowUpRight size={16} />
            </Link>
            <ModerationActions post={post} />
          </Popover.Content>
        </Popover.Root>
      </header>
      <div className="helsta-media">
        <PhotoCarousel images={post.images} title={post.title} onPhotoDoubleClick={doubleLike} />
        <YoutubeVideo url={post.youtubeUrl} title={post.title} />
      </div>
      <div className="helsta-post-body">
        <div className="helsta-actions">
          <Button
            type="button"
            className={`helsta-icon-button helsta-like ${like.liked ? 'is-liked' : ''}`}
            aria-label={like.liked ? '좋아요 취소' : '좋아요'}
            aria-pressed={like.liked}
            disabled={like.busy}
            onClick={() => like.change()}
          >
            <Heart size={27} fill={like.liked ? 'var(--hd-color-like)' : 'transparent'} />
          </Button>
          <Button
            type="button"
            className="helsta-icon-button"
            aria-label="댓글 달기"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => {
              setOpen(true);
              input.current?.focus();
            }}
          >
            <MessageCircle size={26} />
          </Button>
          <PostShare post={post} iconOnly />
          <span className="helsta-photo-label">
            {post.youtubeUrl
              ? 'YouTube'
              : post.images.length > 1
                ? `사진 ${post.images.length}장`
                : '강하의 순간'}
          </span>
        </div>
        <p className="helsta-like-count" aria-live="polite">
          좋아요 {number(like.count)}개
        </p>
        <div className="helsta-caption">
          <strong>
            <Nickname name={post.author} role={post.authorRole} own={post.own} />
          </strong>{' '}
          {detail ? (
            <h1>{post.title}</h1>
          ) : (
            <Link className="helsta-caption-title" href={href}>
              {post.title}
            </Link>
          )}
          {post.content && (
            <p>
              {caption}
              {!expanded && post.content.length > 160 && (
                <Button
                  type="button"
                  className="helsta-text-button"
                  onClick={() => setExpanded(true)}
                >
                  더 보기
                </Button>
              )}
            </p>
          )}
        </div>
        {!detail && post.comments > 0 && (
          <Link className="helsta-view-comments" href={href}>
            댓글 {number(post.comments)}개 모두 보기
          </Link>
        )}
        {post.poll && <PostPoll post={post} />}
        <section className="helsta-comments" id={panelId} aria-label="댓글" hidden={!open}>
          {loading ? (
            <p role="status">댓글을 불러오는 중…</p>
          ) : comments.length ? (
            <ul>
              {(detail ? comments : comments.slice(-3)).map((item) => (
                <li key={item.id}>
                  <strong>
                    <Nickname name={item.author} role={item.authorRole} own={item.own} />
                  </strong>{' '}
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>첫 댓글을 남겨보세요.</p>
          )}
          {error && (
            <Button
              type="button"
              className="helsta-text-button"
              disabled={loading}
              onClick={() => setAttempt((value) => value + 1)}
            >
              댓글 다시 불러오기
            </Button>
          )}
        </section>
        <p className="form-error" role="alert">
          {error}
        </p>
        <form className="helsta-comment-form" onSubmit={comment}>
          <Input
            ref={input}
            aria-label={`${post.title} 댓글 작성`}
            placeholder="댓글 달기…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={1000}
            disabled={busy}
            required
          />
          <Button type="submit" disabled={busy || !draft.trim()}>
            {busy ? '게시 중…' : '게시'}
          </Button>
        </form>
      </div>
    </article>
  );
}
