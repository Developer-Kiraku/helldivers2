'use client';
import VoteButtons from './VoteButtons';
import MuteNotice from './MuteNotice';
import { useRef, useState } from 'react';
import { Button } from './ui';
import { EmoticonInput, EmoticonText } from './Emoticons';
import { useCommunity } from './CommunityProvider';
import { Reply } from 'lucide-react';

export default function CommentContent({ comment, postId, onChange, onReply }) {
  const { api, notify, refresh } = useCommunity();
  const [mode, setMode] = useState(null);
  const [draft, setDraft] = useState(comment.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  function start(next) {
    setDraft(next === 'reply' ? '' : comment.body);
    setError('');
    setMode(next);
  }
  async function submit(event) {
    event.preventDefault();
    if (pending.current || (mode !== 'delete' && !draft.trim())) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const deleting = mode === 'delete';
      const replying = mode === 'reply';
      const data = await api(`posts/${postId}/comments${replying ? '' : '/' + comment.id}`, {
        method: deleting ? 'DELETE' : replying ? 'POST' : 'PATCH',
        ...(deleting
          ? {}
          : { body: { body: draft.trim(), ...(replying ? { parentId: comment.id } : {}) } }),
      });
      if (replying) onReply(data.comment);
      else onChange(deleting ? null : data.comment);
      setMode(null);
      notify(
        deleting
          ? '댓글을 삭제했습니다.'
          : replying
            ? '답글을 등록했습니다.'
            : '댓글을 수정했습니다.',
      );
      await refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="comment-content">
      {mode !== 'edit' && (
        <p className="preserve-lines">
          <EmoticonText text={comment.body} mentions={comment.mentions} />
        </p>
      )}
      {(mode === 'edit' || mode === 'reply') && (
        <form
          onSubmit={submit}
          className="comment-edit-form"
          aria-label={mode === 'reply' ? '답글 작성' : '댓글 수정'}
        >
          {mode === 'reply' && <strong>{comment.author}님에게 답글</strong>}
          <MuteNotice />
          <EmoticonInput
            aria-label={mode === 'reply' ? '답글 내용' : '수정할 댓글 내용'}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={1000}
            required
            disabled={busy}
            autoFocus
          />
          <div className="comment-owner-actions">
            <Button type="submit" disabled={busy || !draft.trim()}>
              {mode === 'reply' ? '답글 등록' : '저장'}
            </Button>
            <Button type="button" disabled={busy} onClick={() => setMode(null)}>
              취소
            </Button>
          </div>
        </form>
      )}
      {!mode && (
        <div className="comment-reactions">
          <div className="comment-footer-actions">
            <Button type="button" className="comment-reply-button" onClick={() => start('reply')}>
              <Reply size={15} aria-hidden="true" />
              답글
            </Button>
            {comment.own && (
              <div className="comment-owner-actions" aria-label="내 댓글 관리">
                <Button type="button" onClick={() => start('edit')}>
                  수정
                </Button>
                <Button type="button" onClick={() => start('delete')}>
                  삭제
                </Button>
              </div>
            )}
          </div>
          <VoteButtons
            postId={postId}
            commentId={comment.id}
            likes={comment.likes}
            dislikes={comment.dislikes}
            myVote={comment.myVote}
            onChange={onChange}
          />
        </div>
      )}
      {mode === 'delete' && (
        <form onSubmit={submit} className="comment-owner-actions" aria-label="댓글 삭제 확인">
          <span>댓글을 삭제할까요?</span>
          <Button type="submit" disabled={busy}>
            삭제하기
          </Button>
          <Button type="button" disabled={busy} onClick={() => setMode(null)}>
            취소
          </Button>
        </form>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
