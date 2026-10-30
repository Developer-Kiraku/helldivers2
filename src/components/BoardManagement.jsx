'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, Trash2, X } from 'lucide-react';
import { boards } from '@/lib/data';
import { bulkPostLimit, moveProblem } from '@/lib/post-move';
import { useCommunity } from './CommunityProvider';
import { Button, Input, Label, TextArea } from './ui';
import Modal from './Modal';
import './board-management.scss';

export function useBoardSelection(board, posts) {
  const { managementMode } = useCommunity();
  const [ids, setIds] = useState([]);
  const [action, setAction] = useState(null);
  const visibleIds = posts.map((post) => post.id).join(',');
  useEffect(() => {
    setIds([]);
    setAction(null);
  }, [board, managementMode]);
  useEffect(() => {
    const visible = new Set(visibleIds.split(','));
    setIds((current) => current.filter((id) => visible.has(id)));
    setAction(null);
  }, [visibleIds]);
  const selected = managementMode ? posts.filter((post) => ids.includes(post.id)) : [];
  return {
    active: managementMode,
    selected,
    action,
    setAction,
    clear: () => setIds([]),
    toggle: (id) =>
      setIds((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : current.length < bulkPostLimit
            ? [...current, id]
            : current,
      ),
    all: () =>
      setIds(
        selected.length === Math.min(posts.length, bulkPostLimit)
          ? []
          : posts.slice(0, bulkPostLimit).map((post) => post.id),
      ),
  };
}

export function SelectablePost({ post, selection, children }) {
  if (!selection.active) return children;
  const checked = selection.selected.some((item) => item.id === post.id);
  return (
    <div className={`selectable-post ${checked ? 'is-selected' : ''}`}>
      <label className="post-selection-check">
        <Input
          type="checkbox"
          aria-label={`${post.title} 선택`}
          checked={checked}
          disabled={
            Boolean(selection.action) || (!checked && selection.selected.length >= bulkPostLimit)
          }
          onChange={() => selection.toggle(post.id)}
        />
      </label>
      <div className="selectable-post-content">{children}</div>
    </div>
  );
}

export default function BoardManagement({ board, posts, selection }) {
  const { api, refresh, notify } = useCommunity();
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const selected = selection.selected;
  const count = selected.length;
  const move = selection.action === 'move';
  useEffect(() => {
    setTarget('');
    setReason('');
    setConfirmed(false);
    setError('');
  }, [selection.action]);
  if (!selection.active) return null;
  const disclosure = move && board === 'report' && target && target !== 'report';
  const incompatible = target && selected.some((post) => moveProblem(post, target));
  async function submit(event) {
    event.preventDefault();
    if (lock.current || !count) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api('admin/posts/bulk', {
        method: 'POST',
        body: {
          action: selection.action,
          ids: selected.map((post) => post.id),
          sourceBoard: board,
          targetBoard: target,
          reason,
          confirmVisibility: confirmed,
        },
      });
      selection.setAction(null);
      selection.clear();
      await refresh();
      notify(
        `${result.count}개 게시물을 ${move ? `${boards[target].label}(으)로 이동` : '삭제'}했습니다.`,
      );
    } catch (error) {
      setError(error.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="board-management-bar" role="region" aria-label="게시물 일괄 관리">
        <Label className="management-select-all">
          <Input
            type="checkbox"
            aria-label="현재 표시된 게시물 전체 선택"
            checked={count > 0 && count === posts.length ? true : count ? 'indeterminate' : false}
            disabled={!posts.length || Boolean(selection.action)}
            onChange={selection.all}
          />
          현재 목록 선택{posts.length > bulkPostLimit ? ` (최대 ${bulkPostLimit}개)` : ''}
        </Label>
        <span className="management-count" role="status">
          {count ? `${count}개 선택` : '게시물을 선택하세요'}
        </span>
        {count > 0 && (
          <div className="management-bulk-actions">
            <Button type="button" onClick={() => selection.setAction('delete')}>
              <Trash2 size={16} />
              선택한 게시물 삭제
            </Button>
            <Button type="button" onClick={() => selection.setAction('move')}>
              <ArrowRightLeft size={16} />
              선택한 게시물 이동
            </Button>
            <Button type="button" aria-label="선택 해제" onClick={selection.clear}>
              <X size={17} />
            </Button>
          </div>
        )}
      </div>
      {selection.action && count > 0 && (
        <Modal
          title={move ? '선택한 게시물 이동' : '선택한 게시물 삭제'}
          className="bulk-post-modal"
          onClose={() => {
            if (!busy) selection.setAction(null);
          }}
        >
          <form onSubmit={submit}>
            <p className="bulk-post-summary">
              <strong>{count}개</strong> 게시물 · {boards[board].label}
            </p>
            <ul className="bulk-post-titles">
              {selected.map((post) => (
                <li key={post.id}>{post.title}</li>
              ))}
            </ul>
            {move ? (
              <>
                <div className="bulk-board-options" role="radiogroup" aria-label="이동할 게시판">
                  {Object.entries(boards)
                    .filter(([key]) => key !== board)
                    .map(([key, config]) => {
                      const problem = selected.map((post) => moveProblem(post, key)).find(Boolean);
                      return (
                        <label
                          key={key}
                          className={`${target === key ? 'is-selected' : ''} ${problem ? 'is-disabled' : ''}`}
                        >
                          <input
                            type="radio"
                            name="target-board"
                            value={key}
                            checked={target === key}
                            disabled={busy || Boolean(problem)}
                            onChange={() => {
                              setTarget(key);
                              setConfirmed(false);
                            }}
                          />
                          <span>
                            <strong>{config.label}</strong>
                            {problem && <small>{problem}</small>}
                          </span>
                        </label>
                      );
                    })}
                </div>
                <p className="field-hint">
                  원본과 댓글·추천·조회수를 유지합니다. 분류가 없으면 ‘기타’ 또는 해당 게시판의 기본
                  분류로 이동합니다.
                </p>
                {disclosure && (
                  <Label className="bulk-visibility-warning">
                    <Input
                      type="checkbox"
                      checked={confirmed}
                      disabled={busy}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    신고 제목·본문·댓글이 다른 회원에게 공개되는 것을 확인했습니다.
                  </Label>
                )}
                {target === 'report' && (
                  <p className="field-hint">이동 후에는 작성자와 운영진만 볼 수 있습니다.</p>
                )}
              </>
            ) : (
              <p className="bulk-delete-warning">
                선택한 게시물과 해당 댓글이 게시판에서 모두 숨겨집니다. 삭제하시겠습니까?
              </p>
            )}
            <Label htmlFor="bulk-reason">사유 (선택)</Label>
            <TextArea
              id="bulk-reason"
              value={reason}
              maxLength={1000}
              disabled={busy}
              onChange={(event) => setReason(event.target.value)}
              placeholder="관리자 로그에 남길 사유"
            />
            <p className="form-error" role="alert">
              {error}
            </p>
            <div className="form-actions">
              <Button type="button" disabled={busy} onClick={() => selection.setAction(null)}>
                취소
              </Button>
              <Button
                type="submit"
                className="button primary"
                disabled={busy || (move && (!target || incompatible || (disclosure && !confirmed)))}
              >
                {busy ? '처리 중…' : move ? '이동 확인' : `${count}개 삭제 확인`}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
