'use client';
import Nickname from './Nickname';
import PhotoCarousel from './PhotoCarousel';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Label, TextArea } from './ui';
import { useCommunity } from './CommunityProvider';
import Avatar from './Avatar';
import Icon from './Icon';
import VoteButtons from './VoteButtons';
import PostShare from './PostShare';
import HelstagramPost from './HelstagramPost';

export default function FeedPostCard({ post, board }) {
  return board === 'helstagram' ? (
    <HelstagramPost post={post} />
  ) : (
    <StandardFeedPostCard post={post} board={board} />
  );
}
function StandardFeedPostCard({ post, board }) {
  const { api, profile, notify, refresh } = useCommunity();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [count, setCount] = useState(post.comments);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const href = `/boards/${board}/${post.id}`;
  const panelId = `feed-comments-${post.id}`;

  useEffect(() => {
    setCount(post.comments);
  }, [post.comments]);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError('');
    api(`posts/${post.id}`)
      .then((data) => {
        if (alive) {
          setComments(data.comments);
          setCount(data.comments.length);
        }
      })
      .catch((error) => {
        if (alive) setError(error.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, post.id, api, attempt]);

  async function addComment(event) {
    event.preventDefault();
    if (busy || loading || !draft.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await api(`posts/${post.id}/comments`, {
        method: 'POST',
        body: { body: draft.trim() },
      });
      setComments((current) => [...current, data.comment]);
      setCount((current) => current + 1);
      setDraft('');
      notify('댓글을 등록했습니다.');
      await refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  const image = post.images?.[0] || post.image;
  return (
    <article className={`talk-card ${board === 'helstagram' ? 'helstagram-card' : ''}`}>
      <div className="post-meta">
        <span className="badge">{post.category}</span>
        <Avatar name={post.author} own={post.own} photo={post.authorPhoto} />
        <span>
          <Nickname name={post.author} role={post.authorRole} own={post.own} />
        </span>
        <span>· {post.date}</span>
        <span>조회 {Number(post.views || 0).toLocaleString('ko-KR')}</span>
      </div>
      {board === 'helstagram' && <PhotoCarousel images={post.images} title={post.title} />}
      <h2>
        <Link href={href}>{post.title}</Link>
      </h2>
      {post.poll && (
        <Link className="poll-list-badge" href={href}>
          <Icon name="poll" size={15} />
          {post.poll.closed ? '투표 마감' : '투표 진행 중'} · {post.poll.totalVoters}명 참여
        </Link>
      )}
      <p className="preserve-lines">{post.content}</p>
      {board !== 'helstagram' && image && (
        <Link href={href} className="post-image">
          <img src={image} alt="게시글 첨부 이미지" />
        </Link>
      )}
      <footer className="talk-card-footer">
        <VoteButtons
          postId={post.id}
          likes={post.likes}
          dislikes={post.dislikes}
          myVote={post.myVote}
        />
        <Button
          type="button"
          id={`${panelId}-toggle`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <Icon name="talk" size={16} />
          댓글 {count}
          <span className="feed-comment-toggle-label">{open ? '접기' : '펼치기'}</span>
        </Button>
        <PostShare post={post} />
      </footer>
      <section
        id={panelId}
        className="feed-comment-panel"
        aria-labelledby={`${panelId}-toggle`}
        hidden={!open}
      >
        {open && (
          <>
            {!loading && comments.length > 3 && (
              <div className="feed-comment-summary">
                <span>최근 댓글 3개 · 전체 {count}개</span>
                <Link href={href}>전체 댓글 보기 ↗</Link>
              </div>
            )}
            {loading ? (
              <p role="status" className="field-hint">
                댓글을 불러오는 중…
              </p>
            ) : (
              <>
                {comments.length ? (
                  <ul className="comments-list feed-comments">
                    {comments.slice(-3).map((comment) => (
                      <li key={comment.id}>
                        <div className="author-inline">
                          <Avatar
                            name={comment.author}
                            own={comment.own}
                            photo={comment.authorPhoto}
                          />
                          <strong>
                            <Nickname
                              name={comment.author}
                              role={comment.authorRole}
                              own={comment.own}
                            />
                          </strong>
                        </div>
                        <p className="preserve-lines">{comment.body}</p>
                        <time dateTime={comment.createdAt}>
                          {new Date(comment.createdAt).toLocaleString('ko-KR', {
                            timeZone: 'Asia/Seoul',
                          })}
                        </time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !error && (
                    <p className="field-hint">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
                  )
                )}
              </>
            )}
            {error && (
              <div className="feed-comment-error">
                <p className="form-error" role="alert">
                  {error}
                </p>
                <Button
                  type="button"
                  disabled={loading || busy}
                  onClick={() => setAttempt((current) => current + 1)}
                >
                  댓글 다시 불러오기
                </Button>
              </div>
            )}
            <form onSubmit={addComment}>
              <Label htmlFor={`${panelId}-draft`}>댓글 작성</Label>
              <TextArea
                id={`${panelId}-draft`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  board === 'qna'
                    ? '동료의 질문에 답변을 남겨주세요.'
                    : '동료에게 한마디를 남겨주세요.'
                }
                rows={2}
                maxLength={1000}
                required
                disabled={busy}
              />
              <div className="feed-comment-actions">
                <small>{draft.length}/1,000</small>
                <Button
                  type="submit"
                  className="button primary"
                  disabled={busy || loading || !draft.trim()}
                >
                  {busy ? '등록 중…' : '댓글 등록'}
                </Button>
              </div>
            </form>
          </>
        )}
      </section>
    </article>
  );
}
