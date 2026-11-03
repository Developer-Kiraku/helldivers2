'use client';
import { useEffect, useRef } from 'react';
import Avatar from './Avatar';
import Nickname from './Nickname';
import CommentContent from './CommentContent';

export default function CommentThread({
  comments,
  setComments,
  setCount,
  postId,
  limit,
  compact = false,
  className = '',
}) {
  const list = useRef(null);
  const lastTarget = useRef('');
  useEffect(() => {
    function follow() {
      const target = window.location.hash.slice(1);
      if (!target.startsWith('comment-') || target === lastTarget.current) return;
      const row = document.getElementById(target);
      if (row && list.current?.contains(row)) {
        lastTarget.current = target;
        row.scrollIntoView({ block: 'center' });
        row.focus({ preventScroll: true });
      }
    }
    follow();
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, [comments, postId]);
  const byId = new Map(comments.map((item) => [item.id, item]));
  const threads = new Map();
  for (const item of limit ? comments.slice(-limit) : comments) {
    const root = item.rootId || item.parentId || item.id;
    if (!threads.has(root)) threads.set(root, []);
    threads.get(root).push(item);
  }
  function change(id, updated) {
    setComments((current) =>
      updated
        ? current.map((item) => (item.id === id ? updated : item))
        : current.filter((item) => item.id !== id),
    );
    if (!updated) setCount?.((count) => Math.max(0, count - 1));
  }
  function add(reply) {
    setComments((current) => [...current, reply]);
    setCount?.((count) => count + 1);
  }
  return (
    <ul ref={list} className={`comments-list comment-threads ${className}`}>
      {[...threads].map(([root, items]) => (
        <ThreadRows key={root} {...{ root, items, byId, compact, postId, change, add }} />
      ))}
    </ul>
  );
}

function ThreadRows({ root, items, byId, compact, postId, change, add }) {
  return (
    <>
      {!byId.has(root) && <li className="removed-parent">삭제된 댓글입니다.</li>}
      {items.map((item) => (
        <li
          key={item.id}
          id={'comment-' + item.id}
          tabIndex={-1}
          className={item.parentId ? 'thread-reply' : undefined}
        >
          {item.parentId && (
            <small className="reply-context">
              ↳{' '}
              {byId.has(item.parentId)
                ? byId.get(item.parentId).author + '님에게 답글'
                : '삭제된 댓글에 답글'}
            </small>
          )}
          <div className="author-inline">
            {!compact && <Avatar name={item.author} own={item.own} photo={item.authorPhoto} />}
            <strong>
              <Nickname name={item.author} role={item.authorRole} own={item.own} />
            </strong>
          </div>
          <CommentContent
            comment={item}
            postId={postId}
            onChange={(updated) => change(item.id, updated)}
            onReply={add}
          />
          {!compact && (
            <time dateTime={item.createdAt}>
              {new Date(item.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
            </time>
          )}
        </li>
      ))}
    </>
  );
}
