'use client';
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCommunity } from './CommunityProvider';

// Use the editor's document positions, including inline equipment and emoticons.
function atCaret(editor) {
  if (!editor?.isEditable || !editor.isFocused || !editor.state.selection.empty) return null;
  const { $from } = editor.state.selection;
  const before = $from.parent.textBetween(0, $from.parentOffset, '', '\ufffc');
  const match = before.match(/(?:^|[^\p{L}\p{N}_@])@([\p{L}\p{N}_]{0,16})$/u);
  return match && { query: match[1], from: $from.pos - match[1].length - 1, to: $from.pos };
}

export default function MentionSuggestions({ editor }) {
  const { api } = useCommunity();
  const [range, setRange] = useState(null);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(0);
  const [position, setPosition] = useState(null);
  const dismissed = useRef(null);
  useEffect(() => {
    if (!editor) return;
    function track() {
      const next = atCaret(editor);
      const key = next && `${next.from}:${next.query}`;
      if (!next || key !== dismissed.current) dismissed.current = null;
      if (!next || dismissed.current) {
        setRange(null);
        return;
      }
      const coords = editor.view.coordsAtPos(next.to);
      const above = window.innerHeight - coords.bottom < 190 && coords.top > 190;
      setPosition({
        left: Math.max(8, Math.min(coords.left, window.innerWidth - 224)),
        ...(above ? { bottom: window.innerHeight - coords.top + 4 } : { top: coords.bottom + 4 }),
      });
      setRange((old) => (old?.from === next.from && old?.query === next.query ? old : next));
    }
    for (const name of ['transaction', 'focus', 'blur']) editor.on(name, track);
    window.addEventListener('resize', track);
    window.addEventListener('scroll', track, true);
    return () => {
      for (const name of ['transaction', 'focus', 'blur']) editor.off(name, track);
      window.removeEventListener('resize', track);
      window.removeEventListener('scroll', track, true);
    };
  }, [editor]);
  useEffect(() => {
    if (!range) return;
    let active = true;
    setSelected(0);
    setResults(null);
    const timer = setTimeout(async () => {
      try {
        const data = await api('mentions?q=' + encodeURIComponent(range.query));
        if (active) setResults({ range, users: data.users });
      } catch {
        if (active) setResults({ range, users: [], failed: true });
      }
    }, 120);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [range, api]);
  const users = results?.range === range ? results.users : [];
  function choose(user) {
    const current = atCaret(editor);
    if (!current || current.from !== range?.from || current.query !== range.query) return;
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: current.from, to: current.to },
        { type: 'text', text: '@' + user.nickname + ' ' },
      )
      .run();
    setRange(null);
  }
  useEffect(() => {
    if (!editor || !range) return;
    const element = editor.view.dom;
    function keydown(event) {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape') {
        dismissed.current = `${range.from}:${range.query}`;
        setRange(null);
      } else if (users.length && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
        const index =
          (selected + (event.key === 'ArrowDown' ? 1 : -1) + users.length) % users.length;
        setSelected(index);
        document
          .getElementById('active-mention-' + users[index].id)
          ?.scrollIntoView({ block: 'nearest' });
      } else if (users.length && event.key === 'Enter') choose(users[selected] || users[0]);
      else return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    element.addEventListener('keydown', keydown, true);
    return () => element.removeEventListener('keydown', keydown, true);
  }, [editor, range, users, selected]);
  if (!range || !position) return null;
  return createPortal(
    <div className="mention-suggestions" style={position} aria-label="멘션할 회원">
      <strong>회원 멘션</strong>
      {users.map((user, index) => (
        <button
          key={user.id}
          type="button"
          id={'active-mention-' + user.id}
          className={selected === index ? 'selected' : ''}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(user)}
        >
          @{user.nickname}
        </button>
      ))}
      {!users.length && (
        <small role="status">
          {results?.range !== range
            ? '회원 검색 중…'
            : results.failed
              ? '회원을 불러오지 못했습니다.'
              : '일치하는 회원이 없습니다.'}
        </small>
      )}
    </div>,
    document.body,
  );
}
