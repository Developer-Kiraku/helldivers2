'use client';
import {useRef, useState} from 'react';
import {Button} from './ui';
import {ChevronLeft, ChevronRight} from 'lucide-react';

export default function PhotoCarousel({images = [], title = '첨부 사진'}) {
  const [index, setIndex] = useState(0);
  const start = useRef(null);
  const active = Math.min(index, Math.max(0, images.length - 1));
  if (!images.length) return null;
  const move = amount => setIndex(Math.max(0, Math.min(images.length - 1, active + amount)));
  return <div className="photo-carousel" role="region" aria-roledescription="캐러셀" aria-label={title} tabIndex={0}
    onKeyDown={event => {if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault();move(event.key === 'ArrowLeft' ? -1 : 1);}}}
    onTouchStart={event => {start.current = event.touches[0].clientX;}}
    onTouchEnd={event => {if(start.current === null) return;const distance = start.current - event.changedTouches[0].clientX;if(Math.abs(distance) > 45) move(distance > 0 ? 1 : -1);start.current = null;}}>
    <div className="photo-carousel-stage"><img src={images[active]} alt={`${title} · ${active + 1}번째 사진`} loading="lazy"/>
      {images.length > 1 && <><span className="photo-counter" aria-live="polite">{active + 1} / {images.length}</span><Button type="button" className="photo-prev" aria-label="이전 사진" disabled={active === 0} onClick={()=>move(-1)}><ChevronLeft size={22}/></Button><Button type="button" className="photo-next" aria-label="다음 사진" disabled={active === images.length - 1} onClick={()=>move(1)}><ChevronRight size={22}/></Button></>}
    </div>
    {images.length > 1 && <div className="photo-dots" aria-label="사진 선택">{images.map((_, i)=><Button type="button" key={i} aria-label={`${i + 1}번째 사진 보기`} aria-pressed={i === active} className={i === active ? 'selected' : ''} onClick={()=>setIndex(i)}/>)}</div>}
  </div>;
}
