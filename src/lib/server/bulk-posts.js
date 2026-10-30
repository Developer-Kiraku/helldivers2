import { boards } from '../data';
import { bulkPostLimit, movedCategory, moveProblem, postFormat } from '../post-move';
import { canReadPost } from '../post-access.mjs';
import { fail } from './auth';
import { audit } from './store';
import { postSnapshot, postHistoryDetails } from './post-history.mjs';

export function bulkPosts(db, actor, input) {
  if (actor.role !== 'operator' || actor.actualRole) fail(403, '총운영자만 사용할 수 있습니다.');
  const { ids, action, sourceBoard, targetBoard } = input;
  if (!['delete', 'move'].includes(action) || !Object.hasOwn(boards, sourceBoard))
    fail(400, '작업과 게시판을 확인해주세요.');
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > bulkPostLimit ||
    ids.some((id) => typeof id !== 'string') ||
    new Set(ids).size !== ids.length
  )
    fail(400, `게시글을 1~${bulkPostLimit}개 선택해주세요.`);
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (reason.length > 1000) fail(400, '사유는 1,000자 이하로 입력해주세요.');
  // Validate the entire batch before mutating anything, including stale list entries.
  const posts = ids.map((id) => {
    const post = db.posts.find((item) => item.id === id && !item.deletedAt);
    if (!post || !canReadPost(post, actor))
      fail(404, '선택한 게시글을 찾을 수 없습니다. 목록을 새로고침해주세요.');
    if (post.board !== sourceBoard)
      fail(409, '이미 이동된 글이 있습니다. 목록을 새로고침해주세요.');
    if (action === 'move') {
      const problem = moveProblem(post, targetBoard);
      if (problem) fail(400, problem);
      if (sourceBoard === 'report' && input.confirmVisibility !== true)
        fail(400, '신고 글이 다른 회원에게 공개되는 것을 확인해주세요.');
    }
    return post;
  });
  const timestamp = new Date().toISOString();
  for (const post of posts) {
    const before = postSnapshot(post);
    if (action === 'delete') post.deletedAt = timestamp;
    else {
      const category = movedCategory(post, targetBoard);
      post.formatBoard = postFormat(post);
      if (post.board === 'loadout') post.loadoutCategory = post.category;
      post.shareBoard ||= post.board;
      post.board = targetBoard;
      post.category = category;
      post.pinned = false;
      post.updatedAt = timestamp;
    }
    audit(
      db,
      actor.id,
      action === 'delete' ? 'post.delete' : 'post.move',
      post.id,
      postHistoryDetails(actor, before, action === 'move' ? postSnapshot(post) : null, {
        bulk: true,
        reason,
        sourceBoard,
        ...(action === 'move' ? { targetBoard } : {}),
      }),
    );
  }
  return { ok: true, count: posts.length };
}
