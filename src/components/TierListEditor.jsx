'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { boards } from '@/lib/data';
import { equipmentGroups } from '@/lib/equipment.mjs';
import { emptyTierList, normalizeTierList, tierFactions } from '@/lib/tier-list.mjs';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import IdentityStrip from './IdentityStrip';
import TierList from './TierList';
import TierListMeta from './TierListMeta';
import { Button, Input, Label, Select } from './ui';
import Icon from './Icon';

export default function TierListEditor({ id, board = 'tierlist' }) {
  return (
    <AccessGate writing operator={board === 'notice'}>
      <Editor key={id || 'new'} id={id} board={board} />
    </AccessGate>
  );
}
function Editor({ id, board }) {
  const { posts, api, refresh, notify } = useCommunity();
  const current = posts[board].find((post) => post.id === id);
  const router = useRouter();
  const [title, setTitle] = useState(current?.title || '');
  const [value, setValue] = useState(current?.tierList || emptyTierList());
  const [step, setStep] = useState(current ? 2 : 1);
  const [savedId, setSavedId] = useState(id);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState('');
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change(next) {
    setValue(next);
    setDirty(true);
  }
  async function save(status) {
    if (busy) return;
    setError('');
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      setStep(1);
      return;
    }
    let tierList;
    try {
      tierList = normalizeTierList(value, { draft: status === 'draft' });
    } catch (error) {
      setError(error.message);
      return;
    }
    setBusy(true);
    try {
      const data = await api(savedId ? `posts/${savedId}` : 'posts', {
        method: savedId ? 'PATCH' : 'POST',
        body: {
          board,
          title,
          tierList,
          status,
          ...(board !== 'tierlist' ? { category: current?.category } : {}),
        },
      });
      setSavedId(data.post.id);
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
      await refresh();
      notify(status === 'draft' ? '나만 볼 수 있도록 임시저장했습니다.' : '게시글을 저장했습니다.');
      if (status === 'published') router.push(`/boards/${board}/${data.post.id}`);
      else if (!id) router.replace(`/boards/${board}/${data.post.id}/edit`);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  if (id && (!current || !current.canEdit))
    return <div className="empty-state">수정할 수 없는 게시글입니다.</div>;
  return (
    <section className="editor-page tier-editor-page">
      <IdentityStrip />
      <Link
        className="back-link"
        href={`/boards/${board}`}
        onClick={(event) => {
          if (dirty && !window.confirm('저장하지 않은 변경사항을 버리고 나갈까요?'))
            event.preventDefault();
        }}
      >
        <Icon name="back" size={16} />
        {boards[board].label} 목록으로
      </Link>
      <header className="page-heading">
        <div>
          <div className="eyebrow">RANK YOUR ARSENAL</div>
          <h1>티어 메이커 {id ? '수정' : '만들기'}</h1>
        </div>
      </header>
      <ol className="tier-steps" aria-label="작성 단계">
        <li className={step === 1 ? 'active' : ''} aria-current={step === 1 ? 'step' : undefined}>
          1. 기본 정보
        </li>
        <li className={step === 2 ? 'active' : ''} aria-current={step === 2 ? 'step' : undefined}>
          2. 티어 배치
        </li>
        <li>3. 게시 완료</li>
      </ol>
      <form
        className="editor-paper tier-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === 1) {
            setError('');
            setStep(2);
          } else save('published');
        }}
      >
        <fieldset disabled={busy}>
          {step === 1 ? (
            <div className="tier-info-fields">
              <div className="field tier-title-field">
                <Label htmlFor="tier-title">제목</Label>
                <Input
                  id="tier-title"
                  value={title}
                  maxLength={100}
                  required
                  placeholder="티어 메이커 제목"
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div className="field">
                <Label htmlFor="tier-group">분류</Label>
                <Select
                  id="tier-group"
                  value={value.group}
                  onChange={(event) => {
                    if (event.target.value === value.group) return;
                    if (
                      value.rows.some((row) => row.items.length) &&
                      !window.confirm('분류를 바꾸면 배치한 장비가 초기화됩니다. 변경할까요?')
                    )
                      return;
                    change({ ...emptyTierList(event.target.value), faction: value.faction });
                  }}
                >
                  {equipmentGroups.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="field">
                <Label htmlFor="tier-faction">종족</Label>
                <Select
                  id="tier-faction"
                  value={value.faction}
                  onChange={(event) => change({ ...value, faction: event.target.value })}
                >
                  {tierFactions.map((faction) => (
                    <option key={faction}>{faction}</option>
                  ))}
                </Select>
              </div>
            </div>
          ) : (
            <>
              <div className="tier-edit-summary">
                <TierListMeta value={value} />
                <strong className="tier-edit-title">{title}</strong>
              </div>
              <TierList key={value.group} value={value} onChange={change} disabled={busy} />
            </>
          )}
        </fieldset>
        <p className="form-error" role="alert">
          {error}
        </p>
        <footer className="editor-footer tier-editor-footer">
          <span role="status">
            {savedAt
              ? `${savedAt} 저장됨${dirty ? ' · 변경사항 있음' : ''}`
              : current?.status === 'draft'
                ? '임시저장 · 나만 볼 수 있음'
                : ''}
          </span>
          <div>
            {step === 2 && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => setStep(1)}
                className="button secondary"
              >
                이전
              </Button>
            )}
            {(!current || current.status === 'draft') && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => save('draft')}
                className="button secondary"
              >
                임시저장
              </Button>
            )}
            <Button type="submit" disabled={busy} className="button primary">
              {busy ? '저장 중…' : step === 1 ? '다음: 티어 배치' : '게시 완료'}
            </Button>
          </div>
        </footer>
      </form>
    </section>
  );
}
