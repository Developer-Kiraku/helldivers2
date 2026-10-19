'use client';
import {useEffect, useRef, useState} from 'react';
import {Button} from './ui';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import Modal from './Modal';
import './photo-viewer.css';

export default function PhotoCarousel({images = [], title = '첨부 사진', onPhotoDoubleClick}) {
  const [index, setIndex] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const start = useRef(null), swipe = useRef(false), clickTimer = useRef(null);
  useEffect(() => () => clearTimeout(clickTimer.current), []);
  const active = Math.min(index, Math.max(0, images.length - 1));
  if (!images.length) return null;
  const move = amount => setIndex(Math.max(0, Math.min(images.length - 1, active + amount)));
  const touchStart = event => {start.current = event.touches[0].clientX; swipe.current = false;};
  const touchEnd = event => {if(start.current === null) return;const distance = start.current - event.changedTouches[0].clientX;if(Math.abs(distance) > 45) {move(distance > 0 ? 1 : -1);swipe.current = true;}start.current = null;};
  const arrows = event => {if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault();move(event.key === 'ArrowLeft' ? -1 : 1);}};
  function open(event) {
    if (swipe.current) {swipe.current = false;return;}
    clearTimeout(clickTimer.current);
    if (onPhotoDoubleClick && event.detail > 0) clickTimer.current = setTimeout(() => setEnlarged(true), 280);
    else setEnlarged(true);
  }
  return <><div className="photo-carousel" role="region" aria-roledescription="캐러셀" aria-label={title} tabIndex={0}
    onKeyDown={arrows}
    onTouchStart={touchStart} onTouchEnd={touchEnd}>
    <div className="photo-carousel-stage"><button type="button" className="photo-open" aria-label={`${title} · ${active + 1}번째 사진 크게 보기`} aria-haspopup="dialog" onClick={open} onDoubleClick={event => {clearTimeout(clickTimer.current);onPhotoDoubleClick?.(event);}}><img src={images[active]} alt={`${title} · ${active + 1}번째 사진`} loading="lazy"/></button>
      {images.length > 1 && <><span className="photo-counter" aria-live="polite">{active + 1} / {images.length}</span><Button type="button" className="photo-prev" aria-label="이전 사진" disabled={active === 0} onClick={()=>move(-1)}><ChevronLeft size={22}/></Button><Button type="button" className="photo-next" aria-label="다음 사진" disabled={active === images.length - 1} onClick={()=>move(1)}><ChevronRight size={22}/></Button></>}
    </div>
    {images.length > 1 && <div className="photo-dots" aria-label="사진 선택">{images.map((_, i)=><Button type="button" key={i} aria-label={`${i + 1}번째 사진 보기`} aria-pressed={i === active} className={i === active ? 'selected' : ''} onClick={()=>setIndex(i)}/>)}</div>}
  </div>{enlarged && <Modal className="photo-viewer" title="사진 크게 보기" onClose={() => setEnlarged(false)} onKeyDown={arrows}><div className="photo-viewer-stage" onTouchStart={touchStart} onTouchEnd={touchEnd}>
    <img src={images[active]} alt={`${title} · ${active + 1}번째 사진`}/>
    {images.length > 1 && <><Button type="button" className="photo-viewer-prev" aria-label="이전 사진" disabled={active === 0} onClick={() => move(-1)}><ChevronLeft size={26}/></Button><Button type="button" className="photo-viewer-next" aria-label="다음 사진" disabled={active === images.length - 1} onClick={() => move(1)}><ChevronRight size={26}/></Button></>}
    </div><p className="photo-viewer-caption"><span>{title}</span><span aria-live="polite">{active + 1} / {images.length}</span></p></Modal>}</>;
}
