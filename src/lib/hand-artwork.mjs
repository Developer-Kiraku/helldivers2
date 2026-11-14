import { __iconData as handIcon } from 'lucide-react/dist/esm/icons/hand-fist.mjs';
import { __iconData as sparkIcon } from 'lucide-react/dist/esm/icons/sparkles.mjs';
import { rpsHandLevel } from './rps-enhancement.mjs';

export function handAppearance(value) {
  const level = rpsHandLevel(value);
  const hue = [165, 190, 255, 35, 48][Math.floor(level / 5)];
  return {
    level,
    hue,
    power: level / 20,
    light: `hsl(${hue},72%,72%)`,
    fill: `hsl(${hue},28%,20%)`,
    style: {
      '--hand-hue': hue,
      '--hand-power': level / 20,
      '--forge-duration': `${1800 + level * 65}ms`,
    },
  };
}

const iconShapes = (icon) =>
  icon.node
    .map(
      ([tag, { key, ...attributes }]) =>
        `<${tag} ${Object.entries(attributes)
          .map(([name, value]) => `${name}="${value}"`)
          .join(' ')}/>`,
    )
    .join('');
const fist = iconShapes(handIcon);
const sparks = iconShapes(sparkIcon);

// One coordinate system for the browser and PNG renderer. The padded viewBox preserves glows.
// All markup comes from local artwork and normalized numbers, never member-provided HTML.
export function handArtworkSvg(value, { radiant = false, compact = false } = {}) {
  const { level, power, light, fill } = handAppearance(value);
  const count = 4 + Math.floor(level / 2);
  const crestGlow = radiant ? 7 + power * 14 : 1.7 + power * 7.6;
  const runes = compact
    ? ''
    : Array.from(
        { length: count },
        (_, i) =>
          `<g transform="translate(88 88) rotate(${(i * 360) / count}) translate(0 -80) rotate(45)"><rect x="-2" y="-4" width="4" height="8" fill="${light}" opacity="${0.25 + power * 0.7}" filter="url(#rune-glow)"/></g>`,
      ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="-32 -32 240 240">
    <defs>
      <radialGradient id="aura"><stop stop-color="${light}" stop-opacity="${(radiant ? 0.2 : 0.1) + power * 0.25}"/><stop offset=".68" stop-color="${light}" stop-opacity="0"/></radialGradient>
      <filter id="crest-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${crestGlow / 2}"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="rune-glow" x="-400%" y="-400%" width="900%" height="900%"><feGaussianBlur stdDeviation="${power * 3}"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="ring-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${radiant ? 5 + power * 6 : power * 4}"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="hand-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5"/><feOffset dy="3.4"/><feColorMatrix values="0 0 0 0 .07 0 0 0 0 .09 0 0 0 0 .08 0 0 0 .8 0"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle cx="88" cy="88" r="88" fill="url(#aura)"/>
    <g fill="none" stroke="${light}" filter="${radiant || level >= 15 ? 'url(#ring-glow)' : 'none'}">
      <circle cx="88" cy="88" r="79.5" stroke-width=".85" stroke-opacity="${radiant ? 1 : 0.28}"/>
      <circle cx="88" cy="88" r="71.5" stroke-width=".85" stroke-dasharray="2.5 2.5" stroke-opacity=".2" transform="rotate(${power * 120} 88 88)"/>
    </g>
    ${runes}
    <g filter="url(#crest-glow)"><g transform="translate(15 7) scale(.73 .73636)" fill="none" stroke="${light}">
      <path d="M100 14 171 54 177 136 100 207 23 136 29 54Z" fill="${light}" fill-opacity=".05" stroke-opacity=".35"/>
      <path d="m62 151 10 43 28 14 28-14 10-43-38-10Z" fill="${light}" fill-opacity=".2" stroke-width="2"/>
      <path d="m72 163 28 10 28-10M76 179l24 10 24-10M100 174v31" stroke-opacity=".6"/>
      <path d="m100 146 10 12-10 12-10-12Z" fill="${light}" stroke="none"/>
      ${level >= 10 ? '<path d="m44 135-16-12 7 27 33 15m88-30 16-12-7 27-33 15" stroke-width="3"/>' : ''}
      ${level >= 15 ? '<path d="m64 40 10-18 26 12 26-12 10 18M100 12v12m-9-7 9-12 9 12" stroke-width="2"/>' : ''}
    </g></g>
    <g filter="url(#hand-shadow)"><g transform="translate(43 30) scale(3.75)" fill="${fill}" stroke="${light}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">${fist}</g></g>
    ${level >= 5 && !compact ? `<g transform="translate(127 38) scale(.916667)" fill="none" stroke="${light}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${sparks}</g>` : ''}
  </svg>`;
}

export const handArtworkUrl = (level, options) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(handArtworkSvg(level, options))}`;
