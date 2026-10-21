'use client';
import { useEffect, useRef, useState } from 'react';

const gesture = {
  activationDistance: 8,
  minimumSwipeDistance: 35,
  swipeWidthRatio: 0.15,
  edgeResistance: 0.2,
  doubleClickDelay: 280,
};

export default function usePhotoCarousel(images, onPhotoDoubleClick) {
  const [index, setIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const [drag, setDrag] = useState(0),
    [dragging, setDragging] = useState(false);
  const start = useRef(null),
    swipe = useRef(false),
    clickTimer = useRef(null);
  useEffect(() => () => clearTimeout(clickTimer.current), []);
  const active = Math.min(index, Math.max(0, images.length - 1));
  const move = (amount) => setIndex(Math.max(0, Math.min(images.length - 1, active + amount)));
  function pointerDown(event) {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      images.length < 2 ||
      event.target.closest('.ui-button')
    )
      return;
    swipe.current = false;
    start.current = {
      x: event.clientX,
      y: event.clientY,
      width: event.currentTarget.clientWidth,
      id: event.pointerId,
    };
  }
  function pointerMove(event) {
    const origin = start.current;
    if (!origin || origin.id !== event.pointerId) return;
    const distance = event.clientX - origin.x;
    if (
      !swipe.current &&
      (Math.abs(distance) < gesture.activationDistance ||
        Math.abs(distance) < Math.abs(event.clientY - origin.y))
    )
      return;
    swipe.current = true;
    clearTimeout(clickTimer.current);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    setDrag(
      (active === 0 && distance > 0) || (active === images.length - 1 && distance < 0)
        ? distance * gesture.edgeResistance
        : distance,
    );
  }
  function pointerEnd(event) {
    const origin = start.current;
    if (!origin || origin.id !== event.pointerId) return;
    if (swipe.current && event.type !== 'pointercancel') {
      const distance = event.clientX - origin.x;
      if (
        Math.abs(distance) >
        Math.max(gesture.minimumSwipeDistance, origin.width * gesture.swipeWidthRatio)
      )
        move(distance > 0 ? -1 : 1);
      event.currentTarget
        .closest('[role="dialog"],[role="region"]')
        ?.focus({ preventScroll: true });
    }
    start.current = null;
    setDragging(false);
    setDrag(0);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const gestures = {
    onPointerDown: pointerDown,
    onPointerMove: pointerMove,
    onPointerUp: pointerEnd,
    onPointerCancel: pointerEnd,
  };
  const trackStyle = { transform: `translate3d(calc(${-active * 100}% + ${drag}px),0,0)` };
  const arrows = (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  };
  function open(event) {
    if (swipe.current) {
      swipe.current = false;
      return;
    }
    clearTimeout(clickTimer.current);
    if (onPhotoDoubleClick && event.detail > 0)
      clickTimer.current = setTimeout(() => setEnlarged(true), gesture.doubleClickDelay);
    else setEnlarged(true);
  }
  function doubleClick(event) {
    clearTimeout(clickTimer.current);
    if (!swipe.current) onPhotoDoubleClick?.(event);
  }
  return {
    active,
    enlarged,
    setEnlarged,
    dragging,
    gestures,
    trackStyle,
    arrows,
    open,
    doubleClick,
    move,
    setIndex,
  };
}
