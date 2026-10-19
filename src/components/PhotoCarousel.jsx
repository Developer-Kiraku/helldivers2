'use client';
import {useEffect, useRef, useState} from 'react';
import {Button} from './ui';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import Modal from './Modal';
import './photo-viewer.css';

export default function PhotoCarousel({images = [], title = '첨부 사진', onPhotoDoubleClick}) {
  const [index, setIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const [drag, setDrag] = useState(0), [dragging, setDragging] = useState(false);
  const start = useRef(null), swipe = useRef(false), clickTimer = useRef(null);
  useEffect(() => () => clearTimeout(clickTimer.current), []);
  const active = Math.min(index, Math.max(0, images.length - 1));
  if (!images.length) return null;
  const move = amount => setIndex(Math.max(0, Math.min(images.length - 1, active + amount)));
  function pointerDown(event) {
    if (!event.isPrimary || event.button !== 0 || images.length < 2 || event.target.closest('.ui-button')) return;
    swipe.current = false;
    start.current = {x:event.clientX,y:event.clientY,width:event.currentTarget.clientWidth,id:event.pointerId};
  }
  function pointerMove(event) {
    const origin = start.current;
    if (!origin || origin.id !== event.pointerId) return;
    const distance = event.clientX - origin.x;
    if (!swipe.current && (Math.abs(distance) < 8 || Math.abs(distance) < Math.abs(event.clientY - origin.y))) return;
    swipe.current = true; clearTimeout(clickTimer.current);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);setDrag((active === 0 && distance > 0 || active === images.length - 1 && distance < 0) ? distance * .2 : distance);
  }
  function pointerEnd(event) {
    const origin = start.current;
    if (!origin || origin.id !== event.pointerId) return;
    if (swipe.current && event.type !== 'pointercancel') {
      const distance = event.clientX - origin.x;
      if (Math.abs(distance) > Math.max(35,origin.width * .15)) move(distance > 0 ? -1 : 1);
      event.currentTarget.closest('[role="dialog"],[role="region"]')?.focus({preventScroll:true});
    }
    start.current = null;setDragging(false);setDrag(0);
    if(event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const gestures = {onPointerDown:pointerDown,onPointerMove:pointerMove,onPointerUp:pointerEnd,onPointerCancel:pointerEnd};
  const trackStyle = {transform:`translate3d(calc(${-active * 100}% + ${drag}px),0,0)`};
  const arrows = event => {if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault();move(event.key === 'ArrowLeft' ? -1 : 1);}};
  function open(event) {
    if (swipe.current) {swipe.current = false;return;}
    clearTimeout(clickTimer.current);
    if (onPhotoDoubleClick && event.detail > 0) clickTimer.current = setTimeout(() => setEnlarged(true), 280);
    else setEnlarged(true);
  }
  return <><div className="photo-carousel" role="region" aria-roledescription="캐러셀" aria-label={title} tabIndex={0} onKeyDown={arrows}>
    <div className={`photo-carousel-stage ${dragging ? 'is-dragging' : ''}`} {...gestures}><div className="photo-slider-track" style={trackStyle}>{images.map((src,i) => <div className="photo-slide" key={`${src}-${i}`} aria-hidden={i !== active}><button type="button" className="photo-open" tabIndex={i === active ? 0 : -1} aria-label={`${title} · ${i + 1}번째 사진 크게 보기`} aria-haspopup="dialog" onClick={open} onDoubleClick={event => {clearTimeout(clickTimer.current);if(!swipe.current)onPhotoDoubleClick?.(event);}}><img src={src} alt={`${title} · ${i + 1}번째 사진`} loading="lazy" draggable={false}/></button></div>)}</div>
      {images.length > 1 && <><span className="photo-counter" aria-live="polite">{active + 1} / {images.length}</span><Button type="button" className="photo-prev" aria-label="이전 사진" disabled={active === 0} onClick={()=>move(-1)}><ChevronLeft size={22}/></Button><Button type="button" className="photo-next" aria-label="다음 사진" disabled={active === images.length - 1} onClick={()=>move(1)}><ChevronRight size={22}/></Button></>}
    </div>
    {images.length > 1 && <div className="photo-dots" aria-label="사진 선택">{images.map((_, i)=><Button type="button" key={i} aria-label={`${i + 1}번째 사진 보기`} aria-pressed={i === active} className={i === active ? 'selected' : ''} onClick={()=>setIndex(i)}/>)}</div>}
  </div>{enlarged && <Modal className="photo-viewer" title="사진 크게 보기" onClose={() => setEnlarged(false)} onKeyDown={arrows}><div className={`photo-viewer-stage ${dragging ? 'is-dragging' : ''}`} {...gestures}>
    <div className="photo-slider-track" style={trackStyle}>{images.map((src,i) => <div className="photo-slide" key={`${src}-${i}`} aria-hidden={i !== active}><img src={src} alt={`${title} · ${i + 1}번째 사진`} draggable={false}/></div>)}</div>
    {images.length > 1 && <><Button type="button" className="photo-viewer-prev" aria-label="이전 사진" disabled={active === 0} onClick={() => move(-1)}><ChevronLeft size={26}/></Button><Button type="button" className="photo-viewer-next" aria-label="다음 사진" disabled={active === images.length - 1} onClick={() => move(1)}><ChevronRight size={26}/></Button></>}
    </div><p className="photo-viewer-caption"><span>{title}</span><span aria-live="polite">{active + 1} / {images.length}</span></p></Modal>}</>;
}
