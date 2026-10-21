'use client';

import { useEffect, useRef, useState } from 'react';
import { dashboardSlides, dashboardSlideInterval } from '@/lib/dashboard-slides.mjs';
import { communityLinks } from '@/lib/community-links';
import { ExternalButton } from './ui';
import Icon from './Icon';
import KakaoSymbol from './KakaoSymbol';

export default function DashboardHero() {
  const [active, setActive] = useState(0);
  const loaded = useRef(new Set());
  const images = useRef([]);

  useEffect(() => {
    images.current.forEach((image, index) => {
      if (image?.complete && image.naturalWidth > 0) loaded.current.add(index);
    });
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timer = setInterval(() => {
      if (document.hidden || motion.matches) return;
      setActive((current) => {
        for (let offset = 1; offset < dashboardSlides.length; offset++) {
          const next = (current + offset) % dashboardSlides.length;
          if (loaded.current.has(next)) return next;
        }
        return current;
      });
    }, dashboardSlideInterval);
    return () => clearInterval(timer);
  }, []);

  const slide = dashboardSlides[active];
  return (
    <section className="hero" aria-label="커뮤니티 안내">
      <div className="hero-background" aria-hidden="true">
        {dashboardSlides.map((item, index) => (
          <img
            key={item.id}
            ref={(element) => {
              images.current[index] = element;
            }}
            src={item.image}
            alt=""
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'low'}
            className={`hero-slide${index === active ? ' is-active' : ''}`}
            onLoad={() => loaded.current.add(index)}
            onError={() => loaded.current.delete(index)}
          />
        ))}
      </div>
      <img className="hero-logo" src="/images/helldivers-logo.png" alt="HELLDIVERS II" />
      <div className="hero-copy">
        <div className="eyebrow">OFF DUTY. ON MISSION.</div>
        <h1>
          {dashboardSlides.map((item, index) => (
            <span
              key={item.id}
              className={`hero-title${index === active ? ' is-active' : ''}`}
              aria-hidden={index !== active}
            >
              {item.title[0]}
              <br />
              {item.title[1]}
            </span>
          ))}
        </h1>
        <p>
          헬다이버즈2 직장인 커뮤니티.
          <br />
          {slide.description}
        </p>
        <div className="hero-actions">
          <ExternalButton
            className="button hero-secondary hero-kakao"
            href={communityLinks.kakaoChat}
            target="_blank"
            rel="noopener noreferrer"
          >
            <KakaoSymbol size={17} />
            카카오톡
          </ExternalButton>
          <ExternalButton
            className="button hero-secondary hero-discord"
            href={communityLinks.discord}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="discord" size={17} />
            디스코드
          </ExternalButton>
        </div>
      </div>
      <span className="hero-tag">HELLDIVERS 2 / COMMUNITY</span>
    </section>
  );
}
