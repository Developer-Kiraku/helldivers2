'use client';
import { useEffect, useRef, useState } from 'react';
import { EmoticonInput } from './Emoticons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { boards } from '@/lib/data';
import { useCommunity } from './CommunityProvider';
import AccessGate from './AccessGate';
import IdentityStrip from './IdentityStrip';
import Icon from './Icon';
import { ActionLink, Button, Input, Label, Select } from './ui';
import AiPolish from './AiPolish';
import { prepareUpload } from '@/lib/image-upload.mjs';
import { youtubeEmbedUrl } from '@/lib/editor-format.mjs';
import YoutubeVideo from './YoutubeVideo';
import MapAttachmentsEditor from './MapAttachmentsEditor';

export default function PhotoPostEditor({ id = null }) {
  const { posts, addPost, api, refresh, notify } = useCommunity();
  const current = id ? posts.helstagram.find((post) => post.id === id) : null;
  const [title, setTitle] = useState(''),
    [content, setContent] = useState(''),
    [category, setCategory] = useState('스크린샷'),
    [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false),
    [processing, setProcessing] = useState(false),
    [error, setError] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [maps, setMaps] = useState([]);
  const input = useRef(null),
    initialized = useRef(null),
    router = useRouter();
  useEffect(() => {
    if (current && initialized.current !== current.id) {
      initialized.current = current.id;
      setTitle(current.title);
      setContent(current.content);
      setCategory(current.category);
      setImages(current.images || []);
      setYoutubeUrl(current.youtubeUrl || '');
      setMaps(current.maps || []);
    }
  }, [current]);
  async function selectPhotos(event) {
    const files = [...event.target.files];
    event.target.value = '';
    if (!files.length || processing || busy) return;
    if (images.length + files.length > 10) {
      setError('사진은 최대 10장까지 첨부할 수 있습니다.');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      const added = [];
      for (const file of files) added.push(await prepareUpload(file));
      setImages((previous) => [...previous, ...added]);
    } catch (error) {
      setError(error.message || '사진을 읽을 수 없습니다. 다른 사진을 선택해주세요.');
    } finally {
      setProcessing(false);
    }
  }
  function reorder(index, delta) {
    setImages((previous) => {
      const next = [...previous];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  async function publish(event) {
    event.preventDefault();
    if (busy || processing) return;
    if (youtubeUrl.trim() && !youtubeEmbedUrl(youtubeUrl)) {
      setError('올바른 유튜브 주소를 입력해주세요.');
      return;
    }
    if (!images.length && !youtubeUrl.trim() && !maps.length) {
      setError('사진, 유튜브 영상 또는 지도를 첨부해주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const draft = {
        title: title.trim(),
        content: content.trim(),
        category,
        images,
        youtubeUrl: youtubeUrl.trim(),
        maps,
        bodyHtml: '',
      };
      if (id) {
        await api(`posts/${id}`, { method: 'PATCH', body: draft });
        await refresh();
      } else await addPost('helstagram', draft);
      notify(id ? '게시글을 수정했습니다.' : '헬스타그램에 순간을 공유했습니다.');
      router.push('/boards/helstagram');
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessGate writing>
      <section className="editor-page">
        <IdentityStrip />
        <Link className="back-link" href="/boards/helstagram">
          <Icon name="back" size={16} />
          헬스타그램 목록으로
        </Link>
        <header className="page-heading">
          <div>
            <div className="eyebrow">MOMENTS FROM THE DROP</div>
            <h1>헬스타그램 {id ? '수정' : '글쓰기'}</h1>
            <p>사진이나 유튜브 영상으로 나만의 강하 기록을 남겨보세요.</p>
          </div>
        </header>
        {id && !current ? (
          <div className="empty-state">게시글을 찾을 수 없습니다.</div>
        ) : id && !current.canEdit ? (
          <div className="empty-state">본인이 작성한 게시글만 수정할 수 있습니다.</div>
        ) : (
          <form className="editor-paper photo-editor" onSubmit={publish}>
            <fieldset disabled={busy || processing}>
              <div className="photo-upload-heading">
                <Label htmlFor="helstagram-photos">사진 · {images.length}/10</Label>
                <Button
                  type="button"
                  onClick={() => input.current.click()}
                  disabled={images.length >= 10}
                >
                  <Icon name="plus" size={16} />
                  사진 추가
                </Button>
              </div>
              <Input
                ref={input}
                id="helstagram-photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={selectPhotos}
              />
              <p className="field-hint">
                JPG·PNG·WebP · 원본 최대 20MB · 가로 1,600px 초과 시 비율을 유지해 축소·압축합니다.
                첫 사진이 대표 사진으로 표시됩니다.
              </p>
              {!images.length && (
                <Button
                  type="button"
                  className="photo-upload-empty"
                  onClick={() => input.current.click()}
                >
                  <Icon name="camera" size={36} />
                  <strong>함께 나누고 싶은 사진을 선택하세요</strong>
                  <span>여러 장을 한 번에 선택할 수 있어요</span>
                </Button>
              )}
              <ol className="photo-edit-grid">
                {images.map((src, index) => (
                  <li key={index}>
                    <div>
                      <img src={src} alt={`선택한 사진 ${index + 1}`} />
                      <span className="photo-counter">{index === 0 ? '대표 사진' : index + 1}</span>
                    </div>
                    <div className="photo-edit-actions">
                      <Button
                        type="button"
                        aria-label={`${index + 1}번째 사진 앞으로 이동`}
                        disabled={index === 0}
                        onClick={() => reorder(index, -1)}
                      >
                        ←
                      </Button>
                      <Button
                        type="button"
                        aria-label={`${index + 1}번째 사진 뒤로 이동`}
                        disabled={index === images.length - 1}
                        onClick={() => reorder(index, 1)}
                      >
                        →
                      </Button>
                      <Button
                        type="button"
                        aria-label={`${index + 1}번째 사진 삭제`}
                        onClick={() =>
                          setImages((previous) => previous.filter((_, i) => i !== index))
                        }
                      >
                        <Icon name="delete" size={15} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="field">
                <Label htmlFor="photo-youtube">유튜브 영상</Label>
                <Input
                  id="photo-youtube"
                  type="url"
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  placeholder="유튜브 주소를 붙여 넣으세요"
                  maxLength={2048}
                  aria-describedby="photo-youtube-hint"
                />
                <p className="field-hint" id="photo-youtube-hint">
                  일반 영상·공유 링크·Shorts 주소를 지원합니다. 사진 없이 영상만 공유해도 좋아요.
                </p>
                {youtubeUrl.trim() && !youtubeEmbedUrl(youtubeUrl) && (
                  <p className="form-error">올바른 유튜브 주소를 입력해주세요.</p>
                )}
                <YoutubeVideo url={youtubeUrl} />
              </div>
              <MapAttachmentsEditor value={maps} onChange={setMaps} disabled={busy || processing} />
              <div className="field">
                <Label htmlFor="photo-category">분류</Label>
                <Select
                  id="photo-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={busy || processing}
                >
                  {boards.helstagram.categories.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </Select>
              </div>
              <div className="field">
                <Label htmlFor="photo-title">
                  제목 <span>*</span>
                </Label>
                <Input
                  id="photo-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={100}
                  required
                  placeholder="이 순간에 제목을 붙여주세요"
                />
              </div>
              <div className="field">
                <Label htmlFor="photo-caption">이야기</Label>
                <EmoticonInput
                  id="photo-caption"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={5000}
                  rows={5}
                  placeholder="사진에 담긴 이야기를 들려주세요. 사진만 올려도 좋아요."
                />
              </div>
              <AiPolish
                board="helstagram"
                disabled={busy || processing}
                getDraft={() => ({ title, segments: [content] })}
                applyDraft={(draft) => {
                  if (draft.segments[0].length > 5000)
                    throw Error(
                      '보정된 이야기가 5,000자를 초과했습니다. 원문을 줄인 뒤 다시 시도해주세요.',
                    );
                  setTitle(draft.title);
                  setContent(draft.segments[0]);
                }}
              />
            </fieldset>
            <p role="status">{processing ? '사진을 준비하고 있습니다…' : ''}</p>
            <p className="form-error" role="alert">
              {error}
            </p>
            <footer className="editor-footer">
              <span>사진 또는 유튜브 영상 · 제목 필수</span>
              <div>
                <ActionLink className="button secondary" href="/boards/helstagram">
                  취소
                </ActionLink>
                <Button type="submit" className="button primary" disabled={busy || processing}>
                  {busy ? '저장 중…' : id ? '수정 완료' : '공유하기'}
                  <Icon name="arrow" size={16} />
                </Button>
              </div>
            </footer>
          </form>
        )}
      </section>
    </AccessGate>
  );
}
