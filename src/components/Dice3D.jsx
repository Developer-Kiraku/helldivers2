'use client';
const dots = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};
const rotations = { 1: [0, 0], 2: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 6: [90, 0] };
export default function Dice3D({ value, rolling = false, small = false }) {
  const [x, y] = rotations[value] || [-18, 25];
  return (
    <div
      className={'dice-scene' + (small ? ' is-small' : '')}
      role="img"
      aria-label={value ? '주사위 ' + value : '비공개 주사위'}
    >
      <div
        className={'dice-cube' + (rolling ? ' is-rolling' : '')}
        style={{ '--dice-x': x + 'deg', '--dice-y': y + 'deg' }}
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
