'use client';
import usePhotoCarousel from '../hooks/usePhotoCarousel';
import { Button } from './ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from './Modal';
import './photo-viewer.scss';

export default function PhotoCarousel({ images = [], title = '첨부 사진', onPhotoDoubleClick }) {
  const {
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
  } = usePhotoCarousel(images, onPhotoDoubleClick);
  if (!images.length) return null;
  return (
    <>
      <div
        className="photo-carousel"
        role="region"
        aria-roledescription="캐러셀"
        aria-label={title}
        tabIndex={0}
        onKeyDown={arrows}
      >
        <div className={`photo-carousel-stage ${dragging ? 'is-dragging' : ''}`} {...gestures}>
          <div className="photo-slider-track" style={trackStyle}>
            {images.map((src, i) => (
              <div className="photo-slide" key={`${src}-${i}`} aria-hidden={i !== active}>
                <button
                  type="button"
                  className="photo-open"
                  tabIndex={i === active ? 0 : -1}
                  aria-label={`${title} · ${i + 1}번째 사진 크게 보기`}
                  aria-haspopup="dialog"
                  onClick={open}
                  onDoubleClick={doubleClick}
                >
                  <img
                    src={src}
                    alt={`${title} · ${i + 1}번째 사진`}
                    loading="lazy"
                    draggable={false}
                  />
                </button>
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <>
              <span className="photo-counter" aria-live="polite">
                {active + 1} / {images.length}
              </span>
              <Button
                type="button"
                className="photo-prev"
                aria-label="이전 사진"
                disabled={active === 0}
                onClick={() => move(-1)}
              >
                <ChevronLeft size={22} />
              </Button>
              <Button
                type="button"
                className="photo-next"
                aria-label="다음 사진"
                disabled={active === images.length - 1}
                onClick={() => move(1)}
              >
                <ChevronRight size={22} />
              </Button>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="photo-dots" aria-label="사진 선택">
            {images.map((_, i) => (
              <Button
                type="button"
                key={i}
                aria-label={`${i + 1}번째 사진 보기`}
                aria-pressed={i === active}
                className={i === active ? 'selected' : ''}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
      {enlarged && (
        <Modal
          className="photo-viewer"
          title="사진 크게 보기"
          onClose={() => setEnlarged(false)}
          onKeyDown={arrows}
        >
          <div className={`photo-viewer-stage ${dragging ? 'is-dragging' : ''}`} {...gestures}>
            <div className="photo-slider-track" style={trackStyle}>
              {images.map((src, i) => (
                <div className="photo-slide" key={`${src}-${i}`} aria-hidden={i !== active}>
                  <img src={src} alt={`${title} · ${i + 1}번째 사진`} draggable={false} />
                </div>
              ))}
            </div>
            {images.length > 1 && (
              <>
                <Button
                  type="button"
                  className="photo-viewer-prev"
                  aria-label="이전 사진"
                  disabled={active === 0}
                  onClick={() => move(-1)}
                >
                  <ChevronLeft size={26} />
                </Button>
                <Button
                  type="button"
                  className="photo-viewer-next"
                  aria-label="다음 사진"
                  disabled={active === images.length - 1}
                  onClick={() => move(1)}
                >
                  <ChevronRight size={26} />
                </Button>
              </>
            )}
          </div>
          <p className="photo-viewer-caption">
            <span>{title}</span>
            <span aria-live="polite">
              {active + 1} / {images.length}
            </span>
          </p>
        </Modal>
      )}
    </>
  );
}
