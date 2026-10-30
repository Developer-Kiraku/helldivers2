'use client';
import PollEditor from './PollEditor';
import PhotoPostEditor from './PhotoPostEditor';
import { ActionLink, Button, Input, Label, Select } from './ui';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { boards } from '@/lib/data';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import IdentityStrip from './IdentityStrip';
import Icon from './Icon';
import RichTextEditor from './RichTextEditor';
import AiPolish from './AiPolish';
import MapAttachmentsEditor from './MapAttachmentsEditor';
import { LoadoutFields } from './Loadout';
import { emptyLoadout, normalizeLoadout } from '@/lib/loadout.mjs';
import TierListEditor from './TierListEditor';

export default function BoardEditor(props) {
  if (props.board === 'tierlist') return <TierListEditor id={props.id} />;
  return props.board === 'helstagram' ? (
    <PhotoPostEditor key={props.id || 'new'} id={props.id} />
  ) : (
    <StandardBoardEditor {...props} />
  );
}

function StandardBoardEditor({ board, id = null }) {
  const config = boards[board];
  const { addPost, notify, posts, api, refresh } = useCommunity();
  const current = id ? posts[board].find((post) => post.id === id) : null;
  const router = useRouter();
  const editor = useRef(null);
  const [poll, setPoll] = useState(null);
  const [category, setCategory] = useState(config.categories[0]);
  const [title, setTitle] = useState('');
  const [pinned, setPinned] = useState(false);
  const [maps, setMaps] = useState([]);
  const [loadout, setLoadout] = useState(emptyLoadout);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  useEffect(() => {
    if (!current) return;
    setTitle(current.title);
    setCategory(current.category);
    setPinned(Boolean(current.pinned));
    setMaps(current.maps || []);
    if (current.loadout) setLoadout(current.loadout);
  }, [current?.id]);

  async function publish(event) {
    event.preventDefault();
    if (busy || processingImages) return;
    const { content: body, images, bodyHtml } = editor.current.getDraft();
    if (!title.trim() || (board !== 'loadout' && !body && !images.length && !maps.length)) {
      setError('제목과 본문을 입력해주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const draft = {
        title: title.trim(),
        ...(board === 'loadout' ? { loadout: normalizeLoadout(loadout) } : {}),
        category,
        ...(board === 'notice' ? { pinned } : {}),
        content: body,
        bodyHtml,
        images,
        maps,
        ...(!id
          ? {
              poll: poll
                ? {
                    ...poll,
                    endsAt: poll.endsAt ? new Date(`${poll.endsAt}:00+09:00`).toISOString() : null,
                  }
                : null,
            }
          : {}),
      };
      if (id) {
        await api(`posts/${id}`, { method: 'PATCH', body: draft });
        await refresh();
      } else await addPost(board, draft);
      notify(id ? '게시글을 수정했습니다.' : '게시글을 등록했습니다.');
      router.push(`/boards/${board}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessGate operator={board === 'notice'} writing>
      <section className="editor-page">
        <IdentityStrip />
        <Link className="back-link" href={`/boards/${board}`}>
          <Icon name="back" size={16} />
          {config.label} 목록으로
        </Link>
        <header className="page-heading">
          <div>
            <div className="eyebrow">{config.eyebrow}</div>
            <h1>
              {config.label} {id ? '수정' : '글쓰기'}
            </h1>
            <p>{config.description}</p>
          </div>
        </header>
        <form className="editor-paper" onSubmit={publish}>
          <div className="editor-fields">
            <div className="field">
              <Label htmlFor="category">
                {board === 'loadout' ? '종족' : '분류'} <span>*</span>
              </Label>
              <Select
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {config.categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </div>
            <div className="field">
              <Label htmlFor="post-title">
                제목 <span>*</span>
              </Label>
              <Input
                id="post-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
                placeholder="제목을 입력해주세요"
                required
              />
            </div>
          </div>
          {board === 'notice' && (
            <div className="notice-pin-option">
              <Label className="checkbox-label" htmlFor="notice-pinned">
                <Input
                  id="notice-pinned"
                  type="checkbox"
                  checked={pinned}
                  onChange={(event) => setPinned(event.target.checked)}
                />
                <span>상단에 고정하기</span>
              </Label>
              <p className="field-hint">
                체크하면 공지사항 목록의 맨 위에 표시됩니다. 고정된 글끼리는 최신순으로 표시됩니다.
              </p>
            </div>
          )}
          {board === 'loadout' && (
            <LoadoutFields value={loadout} onChange={setLoadout} disabled={busy} />
          )}
          <Label className="field-label">
            {board === 'loadout' ? (
              '세팅 설명 (선택)'
            ) : (
              <>
                본문 <span>*</span>
              </>
            )}
          </Label>
          <RichTextEditor
            key={id || board}
            ref={editor}
            initialPost={current}
            notify={notify}
            onProcessingChange={setProcessingImages}
          />
          <MapAttachmentsEditor
            value={maps}
            onChange={setMaps}
            disabled={busy || processingImages}
          />
          <AiPolish
            board={board}
            disabled={busy || processingImages}
            getDraft={() => ({ title, ...editor.current.getAiDraft() })}
            applyDraft={(draft) => {
              editor.current.applyAiDraft(draft.segments);
              setTitle(draft.title);
            }}
          />
          {(!id || current?.poll) && (
            <PollEditor value={poll} onChange={setPoll} existing={current?.poll} />
          )}
          <p className="form-error" role="alert">
            {error}
          </p>
          <footer className="editor-footer">
            <span>* 필수 입력 항목</span>
            <div>
              <ActionLink className="button secondary" href={`/boards/${board}`}>
                취소
              </ActionLink>
              <Button type="submit" className="button primary" disabled={busy}>
                {busy
                  ? '저장 중…'
                  : id
                    ? '수정 완료'
                    : board === 'notice'
                      ? '공지 등록'
                      : board === 'guide'
                        ? '공략 등록'
                        : '게시하기'}{' '}
                <Icon name="arrow" size={16} />
              </Button>
            </div>
          </footer>
        </form>
      </section>
    </AccessGate>
  );
}
