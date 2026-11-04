'use client';
import { useState } from 'react';
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
}) {
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
