'use client';
import MuteNotice from './MuteNotice';
import { useRef, useState } from 'react';
import { Button } from './ui';
import { EmoticonInput, EmoticonText } from './Emoticons';
import { useCommunity } from './CommunityProvider';

export default function CommentContent({ comment, postId, onChange }) {
  const { api, notify, refresh } = useCommunity();
  const [mode, setMode] = useState(null);
  const [draft, setDraft] = useState(comment.body);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  function start(next) {
    setDraft(comment.body);
    setError('');
    setMode(next);
  }
  async function submit(event) {
    event.preventDefault();
    if (pending.current || (mode === 'edit' && !draft.trim())) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const deleting = mode === 'delete';
      const data = await api(`posts/${postId}/comments/${comment.id}`, {
        method: deleting ? 'DELETE' : 'PATCH',
        ...(deleting ? {} : { body: { body: draft.trim() } }),
      });
      onChange(deleting ? null : data.comment);
      setMode(null);
      notify(deleting ? '댓글을 삭제했습니다.' : '댓글을 수정했습니다.');
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
      {mode === 'edit' ? (
        <form onSubmit={submit} className="comment-edit-form" aria-label="댓글 수정">
          <MuteNotice />
          <EmoticonInput
            aria-label="수정할 댓글 내용"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={1000}
            required
            disabled={busy}
            autoFocus
          />
          <div className="comment-owner-actions">
            <Button type="submit" disabled={busy || !draft.trim()}>
              저장
            </Button>
            <Button type="button" disabled={busy} onClick={() => setMode(null)}>
              취소
            </Button>
          </div>
        </form>
      ) : (
        <p className="preserve-lines">
          <EmoticonText text={comment.body} />
        </p>
      )}
      {comment.own && !mode && (
        <div className="comment-owner-actions" aria-label="내 댓글 관리">
          <Button type="button" onClick={() => start('edit')}>
            수정
          </Button>
          <Button type="button" onClick={() => start('delete')}>
            삭제
          </Button>
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
