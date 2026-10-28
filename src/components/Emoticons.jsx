'use client';
import { forwardRef, useRef, useState, useEffect, useImperativeHandle } from 'react';
import { emoticons, emoticonGroups, emoticonParts } from '@/lib/emoticons.mjs';
import { Button } from './ui';
import Modal from './Modal';
import { useEditor, EditorContent } from '@tiptap/react';
import { commentDocument, commentText, commentExtensions } from '@/lib/comment-editor';
import { Smile } from 'lucide-react';
import { equipmentParts } from '@/lib/equipment.mjs';
import { EquipmentIcon, EquipmentPicker } from './Equipment';

export function EmoticonText({ text }) {
  return emoticonParts(text).map((part, index) =>
    part.emoticon ? (
      <img
        key={index}
        className="post-emoticon"
        src={part.emoticon.src}
        alt={part.emoticon.label}
        width="144"
        height="144"
        loading="lazy"
      />
    ) : (
      equipmentParts(part.text).map((piece, offset) =>
        piece.equipment ? (
          <EquipmentIcon key={`${index}-${offset}`} item={piece.equipment} />
        ) : (
          piece.text
        ),
      )
    ),
  );
}
export function EmoticonPicker({ onSelect, disabled = false, onOpen }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(0);
  return (
    <>
      <Button
        type="button"
        className="emoticon-trigger"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        <Smile size={17} />
        이모티콘
      </Button>
      {open && (
        <Modal title="헬다이버 이모티콘" className="emoticon-modal" onClose={() => setOpen(false)}>
          <div className="category-tabs" aria-label="이모티콘 분류">
            {emoticonGroups.map((name, index) => (
              <Button
                key={name}
                type="button"
                className={group === index ? 'selected' : ''}
                aria-pressed={group === index}
                onClick={() => setGroup(index)}
              >
                {name}
              </Button>
            ))}
          </div>
          <div className="emoticon-grid">
            {emoticons
              .filter((item) => item.group === group)
              .map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  aria-label={`${item.id} ${item.label}`}
                  title={item.label}
                  onClick={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <img src={item.src} alt="" width="144" height="144" />
                  <span>
                    {item.id} · {item.label}
                  </span>
                </Button>
              ))}
          </div>
        </Modal>
      )}
    </>
  );
}
export const EmoticonInput = forwardRef(function EmoticonInput(
  { value = '', onChange, ...props },
  ref,
) {
  const selection = useRef(null);
  const latest = useRef(onChange);
  latest.current = onChange;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: commentExtensions(props.maxLength),
    content: commentDocument(value),
    editable: !props.disabled && !props.readOnly,
    autofocus: props.autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': props['aria-label'] || '댓글 작성',
        'aria-required': String(Boolean(props.required)),
        ...(props.id ? { id: props.id } : {}),
        class: 'comment-visual-editor',
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain');
        if (text === undefined) return false;
        event.preventDefault();
        editor.commands.insertContent(commentDocument(text).content);
        return true;
      },
    },
    onUpdate: ({ editor: current }) =>
      latest.current({ target: { value: commentText(current.getJSON()) } }),
  });
  useEffect(() => {
    if (editor && commentText(editor.getJSON()) !== value) {
      editor.commands.setContent(commentDocument(value), { emitUpdate: false });
    }
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!props.disabled && !props.readOnly);
  }, [editor, props.disabled, props.readOnly]);
  useImperativeHandle(ref, () => ({ focus: () => editor?.commands.focus() }), [editor]);
  function remember() {
    if (editor)
      selection.current = { from: editor.state.selection.from, to: editor.state.selection.to };
  }
  function insert(item) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (selection.current) chain.setTextSelection(selection.current);
    chain
      .insertContent({
        type: item.token.startsWith(':gear-') ? 'equipment' : 'emoticon',
        attrs: { id: item.id },
      })
      .run();
  }
  return (
    <div className="emoticon-input">
      <div
        className="comment-editor-frame"
        data-placeholder={props.placeholder}
        data-empty={!value}
        aria-disabled={Boolean(props.disabled)}
      >
        <EditorContent editor={editor} />
      </div>
      <EmoticonPicker
        disabled={props.disabled || props.readOnly || !editor}
        onOpen={remember}
        onSelect={insert}
      />
      <EquipmentPicker
        disabled={props.disabled || props.readOnly || !editor}
        onOpen={remember}
        onSelect={insert}
      />
    </div>
  );
});
