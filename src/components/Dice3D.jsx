'use client';
import { useState } from 'react';
import { diceSkin } from '@/lib/dice-skins.mjs';
const dots = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};
const rotations = { 1: [0, 0], 2: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 6: [90, 0] };
export default function Dice3D({
  value,
  rolling = false,
  small = false,
  rollKey = '',
  durationMs = 1800,
  skin = 'helldiver',
}) {
  const selectedSkin = diceSkin(skin).id;
  const [x, y] = rotations[value] || [-18, 25];
  const [motion] = useState(() => {
    let seed = 0;
    for (const char of rollKey) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
    return {
      animate: rolling,
      duration: Math.max(200, durationMs),
      spinX: (3 + (seed % 4)) * 360 * (seed % 2 ? 1 : -1),
      spinY: (4 + ((seed >>> 3) % 4)) * 360,
      tiltX: -12 + (seed % 9) - 4,
      tiltY: 18 + ((seed >>> 4) % 11) - 5,
      tiltZ: ((seed >>> 8) % 19) - 9,
      startX: ((seed >>> 12) % 41) - 20,
    };
  });
  return (
    <div
      className={'dice-scene' + (small ? ' is-small' : '')}
      data-skin={selectedSkin}
      role="img"
      aria-label={rolling ? '주사위를 굴리는 중' : value ? '주사위 ' + value : '비공개 주사위'}
    >
      <div
        className={'dice-cube' + (motion.animate ? ' is-rolling' : '')}
        style={{
          '--dice-x': x + 'deg',
          '--dice-y': y + 'deg',
          '--dice-spin-x': motion.spinX + 'deg',
          '--dice-spin-y': motion.spinY + 'deg',
          '--dice-tilt-x': motion.tiltX + 'deg',
          '--dice-tilt-y': motion.tiltY + 'deg',
          '--dice-tilt-z': motion.tiltZ + 'deg',
          '--dice-start-x': motion.startX + 'px',
          '--dice-duration': motion.duration + 'ms',
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((face) => (
          <span key={face} className={'dice-face face-' + face}>
            {(selectedSkin === 'super-earth' || selectedSkin === 'eagle') && (
              <svg
                className="dice-insignia"
                viewBox="0 0 64 20"
                aria-hidden="true"
                focusable="false"
              >
                {selectedSkin === 'super-earth' ? (
                  <g fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="32" cy="10" r="8" />
                    <ellipse cx="32" cy="10" rx="3.5" ry="8" />
                    <path d="M24 10h16M26 5h12M26 15h12M21 18C12 18 6 12 5 4M6 8l-3-3m7 8-6-1m11 4-5 2M43 18C52 18 58 12 59 4m-1 4 3-3m-7 8 6-1m-11 4 5 2" />
                  </g>
                ) : (
                  <path
                    fill="currentColor"
                    d="M27 5l5-4 5 4-3 3 4 2L62 5l-6 5-14 3 11-1-7 4-10-1-4 5-4-5-10 1-7-4 11 1-14-3L2 5l24 5 4-2z"
                  />
                )}
              </svg>
            )}
            {value ? (
              dots[face].map((dot) => (
                <i
                  key={dot}
                  style={{ gridArea: Math.ceil(dot / 3) + ' / ' + (((dot - 1) % 3) + 1) }}
                />
              ))
            ) : (
              <b>?</b>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
