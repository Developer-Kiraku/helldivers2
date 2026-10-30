'use client';
import { useEffect, useRef, useState } from 'react';

// A drag is a preview only. Commit once on pointer-up; cancellation never changes the value.
export default function useTierDrag({ boardRef, disabled, onDrop }) {
  const [drag, setDrag] = useState(null);
  const gesture = useRef(null);
  const callbacks = useRef({ disabled, onDrop });
  callbacks.current = { disabled, onDrop };
  const frame = useRef(null);
  const stop = useRef(() => {});
  useEffect(() => {
    function finish(commit = false) {
      const state = gesture.current;
      gesture.current = null;
      cancelAnimationFrame(frame.current);
      frame.current = null;
      if (state?.element.hasPointerCapture?.(state.pointerId))
        state.element.releasePointerCapture(state.pointerId);
      setDrag(null);
      if (commit && state?.active && state.target && !callbacks.current.disabled)
        callbacks.current.onDrop(state.id, state.target);
    }
    stop.current = finish;
    function locate(state) {
      const board = boardRef.current;
      const hit = document.elementFromPoint(state.x, state.y);
      if (!board || !hit || !board.contains(hit)) return null;
      // Holding over the inserted preview must not make its neighbouring cards jitter.
      if (hit.closest('[data-tier-placeholder]')) return state.target;
      const zone = hit.closest('[data-tier-drop]');
      if (!zone) return null;
      const row = zone.dataset.tierDrop === 'pool' ? null : Number(zone.dataset.tierDrop);
      const cards = [...zone.querySelectorAll('[data-tier-item]')];
      const next = cards.find((card) => {
        const rect = card.getBoundingClientRect();
        return (
          state.y < rect.top || (state.y <= rect.bottom && state.x < rect.left + rect.width / 2)
        );
      });
      return { row, before: next?.dataset.tierItem || null };
    }
    function tick() {
      const state = gesture.current;
      if (!state?.active) return;
      const scroller = state.scroller;
      const isPage =
        scroller === document.scrollingElement || scroller === document.documentElement;
      const rect = isPage
        ? { top: 0, bottom: window.innerHeight }
        : scroller.getBoundingClientRect();
      const edge = 90;
      const direction = state.y < rect.top + edge ? -1 : state.y > rect.bottom - edge ? 1 : 0;
      if (direction) scroller.scrollTop += direction * 14;
      state.target = locate(state);
      setDrag((current) =>
        current?.id === state.id &&
        current.x === state.x &&
        current.y === state.y &&
        current.target?.row === state.target?.row &&
        current.target?.before === state.target?.before
          ? current
          : { id: state.id, x: state.x, y: state.y, target: state.target },
      );
      frame.current = requestAnimationFrame(tick);
    }
    function pointerMove(event) {
      const state = gesture.current;
      if (!state || state.pointerId !== event.pointerId) return;
      state.x = event.clientX;
      state.y = event.clientY;
      if (!state.active) {
        state.active = true;
        tick();
      }
      if (state.active) event.preventDefault();
    }
    function pointerUp(event) {
      const state = gesture.current;
      if (!state || state.pointerId !== event.pointerId) return;
      state.x = event.clientX;
      state.y = event.clientY;
      state.target = state.active ? locate(state) : null;
      finish(true);
    }
    const cancel = () => finish();
    const pointerCancel = (event) => {
      if (gesture.current?.pointerId === event.pointerId) finish();
    };
    const key = (event) => {
      if (event.key === 'Escape' && gesture.current) {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', pointerUp);
    // Capture can change while cards reflow; window listeners keep the gesture alive across gaps.
    window.addEventListener('pointercancel', pointerCancel);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', cancel);
    return () => {
      finish();
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerCancel);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', cancel);
    };
  }, [boardRef]);
  useEffect(() => {
    if (disabled) stop.current();
  }, [disabled]);
  function start(event, id) {
    if (disabled || event.button !== 0 || event.isPrimary === false) return;
    // Prevent native image/text dragging from cancelling our pointer-driven drag.
    event.preventDefault();
    stop.current();
    const source = event.currentTarget;
    source.focus({ preventScroll: true });
    // Insertion previews can move/remount a card. Keep capture on the stable board instead.
    const element = boardRef.current || source;
    let scroller = source.parentElement;
    while (
      scroller &&
      !(
        scroller.scrollHeight > scroller.clientHeight &&
        /(auto|scroll)/.test(getComputedStyle(scroller).overflowY)
      )
    )
      scroller = scroller.parentElement;
    scroller ||= document.scrollingElement || document.documentElement;
    gesture.current = {
      id,
      pointerId: event.pointerId,
      element,
      scroller,
      x: event.clientX,
      y: event.clientY,
      active: false,
      target: null,
    };
    element.setPointerCapture?.(event.pointerId);
    // Pick up immediately; only start placement/scrolling once the pointer actually moves.
    setDrag({ id, x: event.clientX, y: event.clientY, target: null });
  }
  return { drag, start };
}
