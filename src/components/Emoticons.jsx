'use client';
import { forwardRef, useRef, useState } from 'react';
import { emoticons, emoticonGroups, emoticonParts } from '@/lib/emoticons.mjs';
import { Button, TextArea } from './ui';
import Modal from './Modal';
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
export const EmoticonInput = forwardRef(function EmoticonInput({ value, onChange, ...props }, ref) {
  const input = useRef(null),
    selection = useRef(null);
  function insert(item) {
    const start = selection.current?.start ?? value.length;
    const end = selection.current?.end ?? start;
    const next = value.slice(0, start) + item.token + value.slice(end);
    if (props.maxLength && next.length > props.maxLength) return;
    onChange({ target: { value: next } });
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(start + item.token.length, start + item.token.length);
    });
  }
  return (
    <div className="emoticon-input">
      <TextArea
        {...props}
        ref={(node) => {
          input.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        value={value}
        onChange={onChange}
      />
      <EmoticonPicker
        disabled={props.disabled}
        onOpen={() => {
          selection.current = {
            start: input.current?.selectionStart ?? value.length,
            end: input.current?.selectionEnd ?? value.length,
          };
        }}
        onSelect={insert}
      />
      <EquipmentPicker
        disabled={props.disabled}
        onOpen={() => {
          selection.current = {
            start: input.current?.selectionStart ?? value.length,
            end: input.current?.selectionEnd ?? value.length,
          };
        }}
        onSelect={insert}
      />
      {/:(?:hd\d{2}|gear-[a-z0-9-]+):/.test(value) && (
        <div className="emoticon-draft-preview" aria-label="이모티콘 미리보기">
          <EmoticonText text={value} />
        </div>
      )}
    </div>
  );
});
