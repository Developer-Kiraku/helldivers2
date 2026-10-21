'use client';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { communityEditorExtensions } from '@/lib/tiptap-extensions';
import { Button, Input, Label, Select, TextArea } from './ui';
import Modal from './Modal';
import Icon from './Icon';
import { cleanEditorHtml } from '@/lib/editor-html';
import { minFontSize, maxFontSize, youtubeEmbedUrl } from '@/lib/editor-format.mjs';
import { htmlTextSegments, replaceHtmlText } from '@/lib/ai-draft.mjs';
import { prepareUpload } from '@/lib/image-upload.mjs';

const RichTextEditor = forwardRef(function RichTextEditor(
  { initialPost, notify, onProcessingChange },
  ref,
) {
  const imageInput = useRef(null),
    initialized = useRef(false);
  const pendingImages = useRef(0);
  const [processingImage, setProcessingImage] = useState(false);
  const [sourceMode, setSourceMode] = useState(false),
    [source, setSource] = useState('');
  const [dialog, setDialog] = useState(null),
    [url, setUrl] = useState(''),
    [dialogError, setDialogError] = useState('');
  const extensions = useMemo(communityEditorExtensions, []);
  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: '',
    editorProps: {
      attributes: {
        class: 'rich-editor tiptap-editor',
        role: 'textbox',
        'aria-label': '본문',
        'aria-multiline': 'true',
      },
      handleDrop: () => true,
      handlePaste(view, event) {
        const file = [...event.clipboardData.items]
          .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
          ?.getAsFile();
        if (file) {
          void insertImageFile(file);
          return true;
        }
        const text = event.clipboardData.getData('text/plain').trim(),
          html = event.clipboardData.getData('text/html');
        const src = youtubeEmbedUrl(text);
        if (src) {
          editor.commands.setYoutubeVideo({ src });
          return true;
        }
        if (html) {
          editor.commands.insertContent(cleanEditorHtml(html));
          return true;
        }
        return false;
      },
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            size: parseInt(editor.getAttributes('textStyle').fontSize) || 14,
            bulletList: editor.isActive('bulletList'),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
          }
        : { size: 14 },
  });
  useEffect(() => {
    if (!initialPost || initialized.current || !editor) return;
    initialized.current = true;
    if (initialPost.bodyHtml)
      editor
        .chain()
        .setContent(cleanEditorHtml(initialPost.bodyHtml), { emitUpdate: false })
        .setMeta('addToHistory', false)
        .run();
    else {
      const root = document.createElement('div');
      root.textContent = initialPost.content;
      for (const src of initialPost.images || []) {
        const image = document.createElement('img');
        image.src = src;
        image.alt = '본문 이미지';
        root.append(image);
      }
      editor
        .chain()
        .setContent(cleanEditorHtml(root.innerHTML), { emitUpdate: false })
        .setMeta('addToHistory', false)
        .run();
    }
  }, [initialPost, editor]);
  useImperativeHandle(
    ref,
    () => ({
      getAiDraft() {
        if (!editor) throw Error('편집기를 준비하고 있습니다. 잠시 후 다시 시도해주세요.');
        const bodyHtml = cleanEditorHtml(sourceMode ? source : editor.getHTML());
        return { bodyHtml, segments: htmlTextSegments(bodyHtml, document) };
      },
      applyAiDraft(segments) {
        const html = cleanEditorHtml(sourceMode ? source : editor.getHTML());
        const next = replaceHtmlText(html, segments, document);
        if (sourceMode) setSource(next);
        else editor.chain().focus().setContent(next).run();
      },
      getDraft() {
        const bodyHtml = cleanEditorHtml(sourceMode ? source : editor?.getHTML() || '');
        const root = document.createElement('div');
        root.innerHTML = bodyHtml;
        const images = [...root.querySelectorAll('img')].map((image) => image.getAttribute('src'));
        const video = root.querySelector('iframe');
        for (const line of root.querySelectorAll('br'))
          line.replaceWith(document.createTextNode('\n'));
        for (const block of root.querySelectorAll('p,div,li,h2,h3,blockquote'))
          block.append(document.createTextNode('\n'));
        return {
          bodyHtml,
          images,
          content: root.textContent.trim() || (video ? 'YouTube 동영상' : ''),
        };
      },
    }),
    [editor, sourceMode, source],
  );
  function insertHtml(html) {
    editor?.chain().focus().insertContent(cleanEditorHtml(html)).run();
  }
  function format(command) {
    editor?.chain().focus()[command]().run();
  }
  function applyFontSize(value) {
    const size = Number(value);
    if (Number.isInteger(size) && size >= minFontSize && size <= maxFontSize)
      editor
        .chain()
        .focus()
        .setFontSize(size + 'px')
        .run();
  }
  function toggleSource() {
    if (!editor) return;
    if (sourceMode) editor.commands.setContent(cleanEditorHtml(source));
    else setSource(cleanEditorHtml(editor.getHTML()));
    setSourceMode((current) => !current);
  }
  function showDialog(type) {
    setDialog(type);
    setUrl('');
    setDialogError('');
  }
  function submitUrl(event) {
    event.preventDefault();
    event.stopPropagation();
    if (dialog === 'youtube') {
      const src = youtubeEmbedUrl(url);
      if (!src) {
        setDialogError('유효한 유튜브 동영상 주소를 입력해주세요.');
        return;
      }
      editor.chain().focus().setYoutubeVideo({ src }).run();
    } else {
      let value;
      try {
        value = new URL(url);
      } catch {
        setDialogError('올바른 웹 주소를 입력해주세요.');
        return;
      }
      if (!['http:', 'https:'].includes(value.protocol)) {
        setDialogError('http 또는 https 주소를 입력해주세요.');
        return;
      }
      const anchor = document.createElement('a');
      anchor.href = value.href;
      anchor.textContent = value.href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      insertHtml(`${anchor.outerHTML}<br>`);
    }
    setDialog(null);
  }
  async function insertImageFile(file) {
    pendingImages.current++;
    setProcessingImage(true);
    onProcessingChange?.(true);
    try {
      const src = await prepareUpload(file);
      if (!editor || editor.isDestroyed) return;
      const image = document.createElement('img');
      image.src = src;
      image.alt = '본문 이미지';
      insertHtml(`${image.outerHTML}<br>`);
    } catch (error) {
      notify(error.message);
    } finally {
      pendingImages.current--;
      const pending = pendingImages.current > 0;
      setProcessingImage(pending);
      onProcessingChange?.(pending);
    }
  }
  function insertImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void insertImageFile(file);
  }
  return (
    <div className="rich-text-composer">
      <div className="editor-toolbar" aria-label="본문 편집 도구">
        <div className="editor-mode-switch">
          <Button
            type="button"
            disabled={processingImage}
            aria-pressed={!sourceMode}
            onClick={() => sourceMode && toggleSource()}
          >
            일반 편집
          </Button>
          <Button
            type="button"
            disabled={processingImage}
            aria-pressed={sourceMode}
            onClick={() => !sourceMode && toggleSource()}
          >
            <Icon name="code" size={16} />
            HTML 소스
          </Button>
        </div>
        <div className="editor-format-controls" aria-disabled={sourceMode || !editor}>
          <div className="editor-font-size">
            <Select
              aria-label="글자 크기"
              value={String(state?.size || 14)}
              disabled={sourceMode || !editor}
              onChange={(event) => applyFontSize(event.target.value)}
            >
              {Array.from(
                { length: maxFontSize - minFontSize + 1 },
                (_, index) => index + minFontSize,
              ).map((size) => (
                <option key={size} value={String(size)}>
                  {size}px
                </option>
              ))}
            </Select>
          </div>
          <Button
            type="button"
            disabled={sourceMode || !editor}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format('toggleBulletList')}
          >
            <Icon name="list" size={16} />
            목록
          </Button>
          <Button type="button" disabled={sourceMode || !editor} onClick={() => showDialog('link')}>
            <Icon name="link" size={16} />
            링크
          </Button>
          <Button
            type="button"
            disabled={sourceMode || !editor}
            onClick={() => {
              imageInput.current.click();
            }}
          >
            <Icon name="image" size={16} />
            이미지
          </Button>
          <Button
            type="button"
            disabled={sourceMode || !editor}
            onClick={() => showDialog('youtube')}
          >
            <Icon name="video" size={16} />
            유튜브
          </Button>
          <Button
            type="button"
            disabled={sourceMode || !state?.undo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format('undo')}
            aria-label="실행 취소"
          >
            <Icon name="undo" size={16} />
          </Button>
          <Button
            type="button"
            disabled={sourceMode || !state?.redo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format('redo')}
            aria-label="다시 실행"
          >
            <Icon name="redo" size={16} />
          </Button>
        </div>
      </div>
      <div hidden={sourceMode} className="tiptap-surface">
        <EditorContent editor={editor} />
      </div>
      {sourceMode && (
        <>
          <TextArea
            className="editor-source"
            aria-label="HTML 소스 입력"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            rows={16}
          />
          <p className="field-hint">
            HTML을 입력하고 ‘일반 편집’으로 확인하세요. 스크립트와 유튜브 외 iframe 등은 저장 시
            제거됩니다.
          </p>
        </>
      )}
      <Input
        ref={imageInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={insertImage}
        tabIndex={-1}
        aria-label="본문 이미지 선택"
      />
      {processingImage && <p role="status">이미지를 축소·압축하고 있습니다…</p>}
      <p className="field-hint">
        글자 크기 12~72px · 1px 단위 / 유튜브 주소 붙여넣기로 삽입 / 이미지 최대 5개 · 원본 최대
        20MB · 가로 1,600px 초과 시 자동 축소·압축
      </p>
      {dialog && (
        <Modal
          title={dialog === 'youtube' ? '유튜브 동영상 넣기' : '본문에 링크 넣기'}
          onClose={() => setDialog(null)}
        >
          <form onSubmit={submitUrl}>
            <Label htmlFor="editor-media-url">
              {dialog === 'youtube' ? '유튜브 동영상 주소' : '웹 주소'}
            </Label>
            <Input
              id="editor-media-url"
              type="url"
              placeholder={dialog === 'youtube' ? 'https://www.youtube.com/watch?v=…' : 'https://'}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setDialogError('');
              }}
              required
              autoFocus
            />
            {dialog === 'youtube' && (
              <p className="field-hint">
                일반 동영상, youtu.be 단축 링크, Shorts, 라이브 링크를 사용할 수 있어요.
              </p>
            )}
            <p className="form-error" role="alert">
              {dialogError}
            </p>
            <div className="form-actions">
              <Button type="submit" className="button primary">
                {dialog === 'youtube' ? '동영상 삽입' : '링크 삽입'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
});
export default RichTextEditor;
