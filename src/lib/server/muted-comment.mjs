import { randomInt } from 'node:crypto';
import { isMuted } from '../member-mute.mjs';

const syllables = [...'슈퍼감자민주우주오리뿅뿅콩콩두둥말랑버섯개구리춤추는냠냠'];
const characters = new Intl.Segmenter('ko', { granularity: 'grapheme' });

export function mutedComment(text, user, now = Date.now()) {
  if (!isMuted(user, now)) return text;
  return [...characters.segment(text)]
    .map(({ segment }) => {
      if (/^\s+$/u.test(segment)) return segment;
      const choices = syllables.filter((character) => character !== segment);
      return choices[randomInt(choices.length)];
    })
    .join('');
}
