import { boards } from './data';
import { equipmentGroups } from './equipment.mjs';

export const bulkPostLimit = 100;

// Keep the original editor contract when a specialized post changes boards.
export function postFormat(post) {
  if (post.tierList) return 'tierlist';
  if (post.loadout) return 'loadout';
  return post.formatBoard || post.board;
}

export function moveProblem(post, target) {
  if (!Object.hasOwn(boards, target)) return '게시판을 선택해주세요.';
  if (post.board === target) return '현재 게시판입니다.';
  if (post.status === 'draft') return '임시저장 글은 게시 후 이동할 수 있습니다.';
  if (target === 'tierlist' && !post.tierList) return '티어 형식의 글만 이동할 수 있습니다.';
  if (target === 'loadout' && !post.loadout) return '로드아웃 형식의 글만 이동할 수 있습니다.';
  if (target === 'helstagram' && postFormat(post) !== 'helstagram')
    return '사진 게시글 형식의 글만 이동할 수 있습니다.';
  return '';
}

export function movedCategory(post, target) {
  if (target === 'tierlist') return equipmentGroups.find(([id]) => id === post.tierList.group)?.[1];
  if (target === 'loadout') return post.loadoutCategory || boards.loadout.categories[0];
  return boards[target].categories.includes(post.category)
    ? post.category
    : boards[target].categories.includes('기타')
      ? '기타'
      : boards[target].categories[0];
}
