'use client';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { EmoticonPicker } from './Emoticons';
import { EquipmentPicker } from './Equipment';
import { equipmentForId, equipmentForSrc } from '@/lib/equipment.mjs';
import { emoticonForSrc } from '@/lib/emoticons.mjs';
import { communityEditorExtensions } from '@/lib/tiptap-extensions';
import { Button, Input, Label, Select, TextArea } from './ui';
import Modal from './Modal';
import Icon from './Icon';
import { cleanEditorHtml } from '@/lib/editor-html';
import {
  minFontSize,
  maxFontSize,
  normalizeTextColor,
  youtubeEmbedUrl,
} from '@/lib/editor-format.mjs';
import { htmlTextSegments, replaceHtmlText } from '@/lib/ai-draft.mjs';
import { prepareUpload } from '@/lib/image-upload.mjs';

const textFormats = [
  { mark: 'bold', command: 'toggleBold', label: '굵게', shortcut: 'Ctrl+B / ⌘B' },
  { mark: 'italic', command: 'toggleItalic', label: '기울임', shortcut: 'Ctrl+I / ⌘I' },
  { mark: 'underline', command: 'toggleUnderline', label: '밑줄', shortcut: 'Ctrl+U / ⌘U' },
  { mark: 'strike', command: 'toggleStrike', label: '취소선', shortcut: 'Ctrl+Shift+S / ⌘Shift+S' },
];

function TextControls({ state, disabled, compact = false, applyFontSize, applyColor, format }) {
  const sizeProps = {
    'aria-label': compact ? '선택 글자 크기' : '글자 크기',
    value: String(state?.size || 14),
    disabled,
    onChange: (event) => applyFontSize(event.target.value),
  };
  const sizes = Array.from(
    { length: maxFontSize - minFontSize + 1 },
    (_, index) => index + minFontSize,
  ).map((size) => (
    <option key={size} value={String(size)}>
      {size}px
    </option>
  ));
  return (
    <>
      <div className="editor-font-size">
        {compact ? (
          <select className="editor-size-select" {...sizeProps}>
            {sizes}
          </select>
        ) : (
          <Select {...sizeProps}>{sizes}</Select>
        )}
      </div>
      <label className="editor-text-color">
        <span>글자 색상</span>
        <input
          type="color"
          aria-label={compact ? '선택 글자 색상' : '글자 색상'}
          value={normalizeTextColor(state?.color) || '#e6eee2'}
          disabled={disabled}
          onInput={(event) => applyColor(event.currentTarget.value)}
          onChange={(event) => applyColor(event.target.value)}
        />
      </label>
      {textFormats.map(({ mark, command, label, shortcut }) => (
        <Button
          key={mark}
          type="button"
          disabled={disabled}
          aria-label={compact ? `선택 글자 ${label}` : label}
          aria-pressed={Boolean(state?.[mark])}
          title={`${label} (${shortcut})`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => format(command)}
        >
          <Icon name={mark} size={16} />
          {!compact && label}
        </Button>
      ))}
      <Button
        type="button"
        disabled={disabled}
        aria-label={compact ? '선택 글자 서식 지우기' : '서식 지우기'}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => format('unsetAllMarks')}
        title="선택한 글자의 크기·색상·서식 지우기"
      >
        <Icon name="clear-format" size={16} />
        {!compact && '서식 지우기'}
      </Button>
    </>
  );
}

function selectionMenuPadding() {
  const header = document.querySelector('.mobile-brand-header')?.getBoundingClientRect();
  const nav = document.querySelector('.mobile-nav')?.getBoundingClientRect();
  return {
    top: header?.height ? Math.max(12, header.bottom + 12) : 12,
    bottom: nav?.height ? Math.max(12, window.innerHeight - nav.top + 12) : 12,
    left: 12,
    right: 12,
  };
}
const selectionMenuOptions = {
  strategy: 'fixed',
  placement: 'top',
  offset: 8,
  flip: () => ({ padding: selectionMenuPadding() }),
  shift: () => ({ padding: selectionMenuPadding(), crossAxis: true }),
};

const RichTextEditor = forwardRef(function RichTextEditor(
  { initialPost, notify, onProcessingChange },
  ref,
) {
  const imageInput = useRef(null),
    initialized = useRef(false);
  const pendingImages = useRef(0);
  const emoticonSelection = useRef(null);
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
            color: editor.getAttributes('textStyle').color || '',
            ...Object.fromEntries(textFormats.map(({ mark }) => [mark, editor.isActive(mark)])),
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
        const images = [...root.querySelectorAll('img')]
          .map((image) => image.getAttribute('src'))
          .filter((src) => !emoticonForSrc(src) && !equipmentForSrc(src));
        for (const badge of root.querySelectorAll('span[data-equipment]')) {
          const item = equipmentForId(badge.getAttribute('data-equipment'));
          if (item) badge.replaceWith(document.createTextNode(item.token));
        }
        for (const image of root.querySelectorAll('img')) {
          const item = emoticonForSrc(image.getAttribute('src'));
          if (item) image.replaceWith(document.createTextNode(item.token));
        }
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
  function applyColor(value) {
    const color = normalizeTextColor(value);
    if (color) editor?.chain().focus().setColor(color).run();
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
      {editor && !sourceMode && (
        <BubbleMenu
          editor={editor}
          updateDelay={100}
          resizeDelay={40}
          options={selectionMenuOptions}
          appendTo={() => editor.view.dom.closest('.community-theme') || document.body}
          className="editor-toolbar editor-selection-toolbar"
          role="toolbar"
          aria-label="선택한 글자 편집"
        >
          <TextControls
            state={state}
            compact
            applyFontSize={applyFontSize}
            applyColor={applyColor}
            format={format}
          />
        </BubbleMenu>
      )}
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
          <EmoticonPicker
            disabled={sourceMode || !editor}
            onOpen={() => {
              emoticonSelection.current = {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
              };
            }}
            onSelect={(item) =>
              editor
                .chain()
                .focus()
                .setTextSelection(emoticonSelection.current)
                .insertContent({ type: 'emoticon', attrs: { id: item.id } })
                .run()
            }
          />
          <EquipmentPicker
            disabled={sourceMode || !editor}
            onOpen={() => {
              emoticonSelection.current = {
                from: editor.state.selection.from,
                to: editor.state.selection.to,
              };
            }}
            onSelect={(item) =>
              editor
                .chain()
                .focus()
                .setTextSelection(emoticonSelection.current)
                .insertContent({ type: 'equipment', attrs: { id: item.id } })
                .run()
            }
          />
          <TextControls
            state={state}
            disabled={sourceMode || !editor}
            applyFontSize={applyFontSize}
            applyColor={applyColor}
            format={format}
          />
          <Button
            type="button"
            disabled={sourceMode || !editor}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format('toggleBulletList')}
            aria-pressed={Boolean(state?.bulletList)}
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
      <p className="field-hint">이미지 최대 5장 · JPG·PNG·WebP · 장당 최대 20MB</p>
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
