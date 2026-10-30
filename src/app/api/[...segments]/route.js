import { apiKeySettings, kakaoShareSettings, mapSettings } from '@/lib/server/api-keys';
import { bulkPosts } from '@/lib/server/bulk-posts';
import { postFormat } from '@/lib/post-move';
import { presentationUser, viewRoleCookie, viewRoles } from '@/lib/view-role.mjs';
import { boards } from '@/lib/data';
import { canReadPost } from '@/lib/post-access.mjs';
import { createPoll, castBallot, serializePoll, pollClosed } from '@/lib/server/polls';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { transaction, readStore, audit } from '@/lib/server/store';
import { config } from '@/lib/server/config';
import { auditLogList } from '@/lib/server/audit-logs.mjs';
import { isMuted, muteDurations, muteExpiry, muteNotice } from '@/lib/member-mute.mjs';
import { mutedComment } from '@/lib/server/muted-comment.mjs';
import {
  postSnapshot,
  postHistoryDetails,
  postHistoryList,
  historyEntry,
  postHistoryActions,
} from '@/lib/server/post-history.mjs';
import {
  fail,
  AppError,
  requireUser,
  userForToken,
  publicUser,
  memberListUser,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  cookieOptions,
  verifyOrigin,
} from '@/lib/server/auth';
import { tokenHash, verifyPassword, hashPassword } from '@/lib/server/passwords';
import {
  now,
  cleanPost,
  validateNickname,
  validImage,
  postForId,
  memberForId,
  canDeletePost,
  canRequest,
  serializePost,
  serializeComment,
} from '@/lib/server/community';
import { roleLabels, outranks, isStaff, memberCapabilities } from '@/lib/roles';
import { approveApprentice, startProbation, withdrawMember } from '@/lib/server/probation.mjs';
import { approvalList } from '@/lib/approvals';
import { readJsonRequest } from '@/lib/server/request-json';
import { reserveLoginAttempt } from '@/lib/server/login-throttle.mjs';
import { recordPostView } from '@/lib/server/post-views.mjs';
import {
  normalizeUploadedImage,
  normalizePostImages,
  ImageUploadError,
} from '@/lib/server/image-upload.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const dummyPasswordHash = hashPassword('invalid-login-placeholder');
const json = (data, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
function safeReason(value) {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason.length < 2 || reason.length > 1000) fail(400, '사유를 2~1,000자로 입력해주세요.');
  return reason;
}
function bootstrap(db, actor) {
  return {
    user: publicUser(actor),
    posts: Object.fromEntries(
      Object.keys(boards).map((board) => [
        board,
        db.posts
          .filter((post) => post.board === board && !post.deletedAt && canReadPost(post, actor))
          .sort(
            (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt),
          )
          .map((post) => serializePost(db, post, actor)),
      ]),
    ),
    stats: {
      totalMembers: db.users.filter((user) => user.status === 'active').length,
      onlineMembers: new Set(
        db.sessions
          .filter(
            (session) =>
              Date.parse(session.expiresAt) > Date.now() &&
              db.users.some((user) => user.id === session.userId && user.status === 'active'),
          )
          .map((session) => session.userId),
      ).size,
    },
  };
}

async function handler(request, context) {
  try {
    const { segments } = await context.params;
    const path = segments.join('/');
    const method = request.method;
    if (!['GET', 'HEAD'].includes(method)) verifyOrigin(request);
    const token = request.cookies.get(config.cookie)?.value;
    const viewRole = request.cookies.get(viewRoleCookie)?.value;
    if (path === 'profile/view-role' && method === 'POST') {
      const input = await readJsonRequest(request, 1024);
      if (!viewRoles.includes(input.role)) fail(400, '화면 등급을 확인해주세요.');
      const user = await readStore((db) => {
        const actor = requireUser(db, token);
        if (actor.role !== 'operator') fail(403, '총관리자만 화면 등급을 변경할 수 있습니다.');
        return publicUser(presentationUser(actor, input.role));
      });
      const response = json({ user });
      response.cookies.set(viewRoleCookie, input.role === 'operator' ? '' : input.role, {
        ...cookieOptions,
        ...(input.role === 'operator' ? { maxAge: 0 } : {}),
      });
      return response;
    }
    if (path === 'auth/login' && method === 'POST') {
      if (!config.demoAuth)
        fail(403, '임시 계정 로그인이 비활성화되어 있습니다. 카카오로 로그인해주세요.');
      const input = await readJsonRequest(request, 1024);
      if (
        typeof input.loginId !== 'string' ||
        input.loginId.length > 100 ||
        typeof input.password !== 'string' ||
        input.password.length > 256
      )
        fail(400, '아이디와 비밀번호를 확인해주세요.');
      const result = await transaction((db) => {
        if (!reserveLoginAttempt(db, input.loginId)) return { limited: true };
        const user = db.users.find(
          (user) => user.loginId === input.loginId && user.status === 'active',
        );
        const valid = verifyPassword(input.password, user?.passwordHash || dummyPasswordHash);
        if (!user || !valid) return null;
        const newToken = createSession(db, user);
        audit(db, user.id, 'login', user.id);
        return { token: newToken, user: publicUser(user) };
      });
      if (result?.limited) fail(429, '로그인 시도가 많습니다. 잠시 후 다시 시도해주세요.');
      if (!result) fail(401, '아이디 또는 비밀번호가 올바르지 않습니다.');
      const response = json({ user: result.user });
      setSessionCookie(response, result.token);
      return response;
    }
    if (path === 'auth/logout' && method === 'POST') {
      await transaction((db) => {
        if (token)
          db.sessions = db.sessions.filter((session) => session.tokenHash !== tokenHash(token));
      });
      const response = json({ ok: true });
      clearSessionCookie(response);
      return response;
    }
    if (path === 'auth/me' && method === 'GET')
      return readStore((db) =>
        json({
          user: publicUser(presentationUser(userForToken(db, token), viewRole)),
          demoAuthEnabled: config.demoAuth,
          kakaoConfigured: Boolean(config.kakaoClientId && config.kakaoRedirectUri),
        }),
      );
    let input =
      method === 'GET'
        ? {}
        : await readJsonRequest(request, path === 'profile' ? 1300000 : 13000000);
    if (method !== 'GET')
      await readStore((db) => {
        if (presentationUser(requireUser(db, token), viewRole)?.actualRole)
          fail(403, '화면 확인 중에는 변경할 수 없습니다. 실제 등급으로 돌아온 뒤 이용해주세요.');
      });
    if (
      (path === 'profile' && method === 'PATCH' && input.photo !== undefined) ||
      (path === 'posts' && method === 'POST') ||
      (segments[0] === 'posts' && segments.length === 2 && method === 'PATCH')
    ) {
      const board = await readStore((db) => {
        const actor = requireUser(db, token);
        if (path === 'profile') return null;
        if (isMuted(actor)) fail(403, muteNotice(actor));
        const post = method === 'PATCH' ? postForId(db, segments[1]) : null;
        if (post && !canReadPost(post, actor)) fail(404, '게시글을 찾을 수 없습니다.');
        if (post && actor.id !== post.authorId)
          fail(403, '본인이 작성한 게시글만 수정할 수 있습니다.');
        const targetBoard = post?.board || input.board;
        if (!Object.hasOwn(boards, targetBoard)) fail(400, '게시판을 확인해주세요.');
        if (targetBoard === 'notice' && !isStaff(actor.role))
          fail(403, '공지사항은 운영진만 작성할 수 있습니다.');
        return post ? postFormat(post) : targetBoard;
      });
      input =
        path === 'profile'
          ? { ...input, photo: await normalizeUploadedImage(input.photo, { avatar: true }) }
          : await normalizePostImages(input, board);
    }
    const result = await transaction((db) => {
      const actor = presentationUser(requireUser(db, token), viewRole);
      if (path === 'admin/posts/bulk' && method === 'POST') return bulkPosts(db, actor, input);
      if (path === 'integrations/maps' && method === 'GET') {
        const settings = mapSettings(db);
        return {
          kakaoConfigured: Boolean(settings.kakaoJavaScriptKey && config.kakaoClientId),
          googleConfigured: Boolean(settings.googleEmbedKey),
        };
      }
      if (path === 'integrations/kakao' && method === 'GET') {
        const { javaScriptKey, configured } = kakaoShareSettings(db);
        return { javaScriptKey, configured };
      }
      if (path === 'admin/api-keys') {
        if (actor.role !== 'operator') fail(403, '메인 운영자만 API 키를 관리할 수 있습니다.');
        if (method === 'GET') return apiKeySettings(db);
        if (method === 'PATCH') {
          const fields = ['javaScriptKey', 'kakaoMapsJavaScriptKey', 'googleMapsEmbedKey'];
          if (!fields.some((field) => input[field] !== undefined))
            fail(400, '변경할 API 키를 입력해주세요.');
          const changes = {};
          for (const field of fields) {
            if (input[field] === undefined) continue;
            if (typeof input[field] !== 'string') fail(400, '올바른 API 키를 입력해주세요.');
            const key = input[field].trim();
            const valid =
              field === 'googleMapsEmbedKey'
                ? /^[A-Za-z0-9_-]{20,200}$/.test(key)
                : /^[a-f0-9]{32}$/i.test(key);
            if (key && !valid) fail(400, 'API 키 형식을 확인해주세요.');
            changes[field === 'javaScriptKey' ? 'kakaoJavaScriptKey' : field] = key;
          }
          db.integrationSettings = {
            ...db.integrationSettings,
            ...changes,
            updatedAt: now(),
          };
          audit(db, actor.id, 'settings.api_keys.update', 'integrations', {
            fields: Object.keys(changes),
          });
          return apiKeySettings(db);
        }
      }
      if (path === 'bootstrap' && method === 'GET') return bootstrap(db, actor);
      if (path === 'profile' && method === 'PATCH') {
        if (input.nickname !== undefined)
          actor.nickname = validateNickname(input.nickname, db, actor.id);
        if (input.photo !== undefined) actor.photo = validImage(input.photo);
        actor.updatedAt = now();
        audit(db, actor.id, 'profile.update', actor.id);
        return { user: publicUser(actor) };
      }
      if (path === 'profile' && method === 'DELETE') {
        if (actor.role === 'operator')
          fail(403, '메인 운영자는 직접 탈퇴할 수 없습니다. 운영권 이전 후 처리해주세요.');
        if (input.confirm !== true) fail(400, '탈퇴 확인이 필요합니다.');
        const logDetails = withdrawMember(db, actor, 'self');
        audit(db, actor.id, 'user.withdraw', actor.id, logDetails);
        return { ok: true };
      }
      if (path === 'posts' && method === 'POST') {
        if (isMuted(actor)) fail(403, muteNotice(actor));
        const board = input.board;
        if (board === 'notice' && !isStaff(actor.role))
          fail(403, '공지사항은 운영진만 작성할 수 있습니다.');
        const clean = cleanPost(input, board),
          post = {
            ...clean,
            poll: board === 'tierlist' ? null : createPoll(input.poll),
            id: randomUUID(),
            board,
            authorId: actor.id,
            pinned: clean.pinned ?? false,
            views: 0,
            createdAt: now(),
            updatedAt: now(),
            deletedAt: null,
          };
        db.posts.unshift(post);
        if (post.status !== 'draft') audit(db, actor.id, 'post.create', post.id);
        return { post: serializePost(db, post, actor) };
      }
      if (segments[0] === 'posts' && segments[1]) {
        const post = postForId(db, segments[1]);
        if (!canReadPost(post, actor)) fail(404, '게시글을 찾을 수 없습니다.');
        const author = db.users.find((user) => user.id === post.authorId);
        if (segments.length === 3 && segments[2] === 'view' && method === 'POST')
          return { views: post.status === 'draft' ? post.views : recordPostView(post, actor.id) };
        if (segments.length === 2 && method === 'GET')
          return {
            post: serializePost(db, post, actor),
            comments: db.comments
              .filter((comment) => comment.postId === post.id && !comment.deletedAt)
              .map((comment) => serializeComment(db, comment, actor)),
          };
        if (segments.length === 2 && method === 'PATCH') {
          if (isMuted(actor)) fail(403, muteNotice(actor));
          if (actor.id !== post.authorId) fail(403, '본인이 작성한 게시글만 수정할 수 있습니다.');
          if (post.board === 'notice' && !isStaff(actor.role))
            fail(403, '공지사항 수정 권한이 없습니다.');
          const before = postSnapshot(post);
          const wasDraft = post.status === 'draft';
          const clean = cleanPost(input, post.board, post);
          if (!wasDraft && clean.status === 'draft')
            fail(400, '게시한 티어 메이커 글은 임시저장으로 변경할 수 없습니다.');
          Object.assign(post, clean, { updatedAt: now() });
          if (wasDraft && post.status !== 'draft') {
            post.createdAt = now();
            audit(db, actor.id, 'post.create', post.id);
          } else if (!wasDraft)
            audit(
              db,
              actor.id,
              'post.update',
              post.id,
              postHistoryDetails(actor, before, postSnapshot(post)),
            );
          return { post: serializePost(db, post, actor) };
        }
        if (segments.length === 2 && method === 'DELETE') {
          if (!canDeletePost(actor, author)) fail(403, '게시글을 삭제할 권한이 없습니다.');
          const before = postSnapshot(post);
          post.deletedAt = now();
          if (post.status !== 'draft')
            audit(
              db,
              actor.id,
              'post.delete',
              post.id,
              postHistoryDetails(actor, before, null, {
                reason:
                  typeof input.reason === 'string' ? input.reason.slice(0, 1000) : '직접 삭제',
              }),
            );
          return { ok: true };
        }
        if (post.status === 'draft') fail(400, '임시저장 글에는 댓글이나 추천을 남길 수 없습니다.');
        if (segments[2] === 'comments' && segments.length === 3 && method === 'POST') {
          const text = typeof input.body === 'string' ? input.body.trim() : '';
          if (!text || text.length > 1000) fail(400, '댓글은 1~1,000자로 입력해주세요.');
          const comment = {
            id: randomUUID(),
            postId: post.id,
            authorId: actor.id,
            body: mutedComment(text, actor),
            createdAt: now(),
            deletedAt: null,
          };
          db.comments.push(comment);
          return { comment: serializeComment(db, comment, actor) };
        }
        if (
          segments[2] === 'comments' &&
          segments.length === 4 &&
          ['PATCH', 'DELETE'].includes(method)
        ) {
          const comment = db.comments.find(
            (item) => item.id === segments[3] && item.postId === post.id && !item.deletedAt,
          );
          if (!comment) fail(404, '댓글을 찾을 수 없습니다.');
          if (comment.authorId !== actor.id)
            fail(403, '본인이 작성한 댓글만 수정하거나 삭제할 수 있습니다.');
          if (method === 'DELETE') {
            comment.deletedAt = now();
            return { ok: true };
          }
          const text = typeof input.body === 'string' ? input.body.trim() : '';
          if (!text || text.length > 1000) fail(400, '댓글은 1~1,000자로 입력해주세요.');
          comment.body = mutedComment(text, actor);
          comment.updatedAt = now();
          return { comment: serializeComment(db, comment, actor) };
        }
        if (segments[2] === 'poll' && segments.length === 3 && ['POST', 'PATCH'].includes(method)) {
          if (!post.poll) fail(404, '투표를 찾을 수 없습니다.');
          if (method === 'PATCH') {
            if (actor.id !== post.authorId) fail(403, '작성자만 투표를 마감할 수 있습니다.');
            if (input.close !== true) fail(400, '마감 요청을 확인해주세요.');
            if (pollClosed(post.poll)) fail(409, '이미 마감된 투표입니다.');
            post.poll.closedAt = now();
            audit(db, actor.id, 'poll.close', post.id);
          } else {
            castBallot(post.poll, actor, input.choices);
          }
          return { poll: serializePoll(db, post.poll, actor) };
        }
        if (segments[2] === 'vote' && segments.length === 3 && method === 'POST') {
          if (![0, 1, -1].includes(input.value)) fail(400, '추천 값을 확인해주세요.');
          if (post.board === 'helstagram' && input.value === -1)
            fail(400, '헬스타그램은 좋아요만 사용할 수 있습니다.');
          const previousValue =
            db.votes.find((vote) => vote.userId === actor.id && vote.postId === post.id)?.value ||
            0;
          db.votes = db.votes.filter(
            (vote) => !(vote.userId === actor.id && vote.postId === post.id),
          );
          if (input.value) db.votes.push({ postId: post.id, userId: actor.id, value: input.value });
          if (previousValue !== input.value) {
            const action =
              input.value === 1
                ? 'like'
                : input.value === -1
                  ? 'dislike'
                  : previousValue === 1
                    ? 'like_cancel'
                    : 'dislike_cancel';
            audit(db, actor.id, `post.vote.${action}`, post.id, {
              actorNickname: actor.nickname,
              targetTitle: post.title,
              targetCreatedAt: post.createdAt,
              previousValue,
              value: input.value,
            });
          }
          return { post: serializePost(db, post, actor) };
        }
      }
      if (path === 'admin/logs' && method === 'GET') {
        if (!isStaff(actor.role)) fail(403, '로그 확인은 운영진만 이용할 수 있습니다.');
        return auditLogList(db, new URL(request.url).searchParams);
      }
      if (segments[0] === 'admin' && segments[1] === 'post-history' && method === 'GET') {
        if (!isStaff(actor.role)) fail(403, '게시글 변경 이력은 운영진만 볼 수 있습니다.');
        if (segments.length === 2) return postHistoryList(db, new URL(request.url).searchParams);
        if (segments.length === 3) {
          const entry = db.audit.find(
            (entry) => entry.id === segments[2] && postHistoryActions.includes(entry.action),
          );
          if (!entry) fail(404, '변경 이력을 찾을 수 없습니다.');
          return { log: historyEntry(db, entry, true) };
        }
      }
      if (path === 'admin/users' && method === 'GET') {
        if (!isStaff(actor.role)) fail(403, '회원 목록은 운영진만 볼 수 있습니다.');
        return {
          users: db.users
            .filter((user) => user.status !== 'withdrawn')
            .map((user) => ({
              ...memberListUser(user, actor),
              ...memberCapabilities(actor, user),
            })),
        };
      }
      if (path === 'admin/approvals' && method === 'GET') {
        if (!isStaff(actor.role)) fail(403, '운영자·부운영자만 요청 승인 목록을 볼 수 있습니다.');
        return { requests: approvalList(db, actor) };
      }
      if (segments[0] === 'admin' && segments[1] === 'users' && segments[2]) {
        if (!isStaff(actor.role)) fail(403, '회원 관리 권한이 없습니다.');
        const target = memberForId(db, segments[2]);
        if (
          segments.length === 4 &&
          segments[3] === 'mute' &&
          ['POST', 'DELETE'].includes(method)
        ) {
          if (!memberCapabilities(actor, target).canMute)
            fail(403, '하위 등급 회원만 관리할 수 있습니다. 총운영자는 본인 테스트도 가능합니다.');
          const previousMutedUntil = target.mutedUntil || null;
          const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
          if (reason.length > 1000) fail(400, '사유는 1,000자 이내로 입력해주세요.');
          if (
            method === 'POST' &&
            (typeof input.duration !== 'string' || !Object.hasOwn(muteDurations, input.duration))
          )
            fail(400, '벙어리 기간을 확인해주세요.');
          if (method === 'DELETE' && !isMuted(target)) fail(409, '현재 벙어리 상태가 아닙니다.');
          target.mutedUntil = method === 'POST' ? muteExpiry(input.duration) : null;
          target.updatedAt = now();
          audit(db, actor.id, method === 'POST' ? 'user.mute' : 'user.unmute', target.id, {
            actorNickname: actor.nickname,
            targetNickname: target.nickname,
            targetCreatedAt: target.createdAt,
            previousMutedUntil,
            selfTest: actor.id === target.id,
            mutedUntil: target.mutedUntil,
            duration: method === 'POST' ? input.duration : null,
            reason,
          });
          return { user: memberListUser(target, actor) };
        }
        if (segments.length === 4 && segments[3] === 'approve' && method === 'POST') {
          if (!isStaff(actor.role)) fail(403, '운영자·부운영자만 견습회원 승인이 가능합니다.');
          if (target.role !== 'apprentice') fail(409, '승인 대기 중인 견습회원이 아닙니다.');
          approveApprentice(target, actor.id);
          audit(db, actor.id, 'user.approve', target.id);
          return { user: memberListUser(target, actor) };
        }
        if (segments[3] === 'expel' && method === 'POST') {
          if (actor.role !== 'operator' || !outranks(actor.role, target.role))
            fail(403, '하위 등급 회원만 강퇴할 수 있습니다.');
          const reason = safeReason(input.reason);
          target.status = 'expelled';
          target.updatedAt = now();
          db.sessions = db.sessions.filter((session) => session.userId !== target.id);
          audit(db, actor.id, 'user.expel', target.id, {
            reason,
            actorNickname: actor.nickname,
            targetNickname: target.nickname,
            targetCreatedAt: target.createdAt,
          });
          return { ok: true };
        }
        if (segments.length === 3 && method === 'PATCH') {
          if (
            actor.role !== 'operator' ||
            !outranks(actor.role, target.role) ||
            !['deputy', 'member', 'apprentice'].includes(input.role)
          )
            fail(403, '회원 등급을 변경할 권한이 없습니다.');
          const previous = target.role;
          if (previous === 'apprentice' && input.role !== 'apprentice') {
            approveApprentice(target, actor.id);
            audit(db, actor.id, 'user.approve', target.id);
          }
          target.role = input.role;
          target.updatedAt = now();
          if (previous !== 'apprentice' && input.role === 'apprentice')
            startProbation(target, target.updatedAt);
          audit(db, actor.id, 'user.role', target.id, { previous, role: input.role });
          return { user: memberListUser(target, actor) };
        }
      }
      if (path === 'admin/requests' && method === 'POST') {
        if (actor.role !== 'deputy') fail(403, '부운영자만 처리 요청을 등록할 수 있습니다.');
        if (!['post_delete', 'user_expel'].includes(input.type))
          fail(400, '요청 종류를 확인해주세요.');
        const post = input.type === 'post_delete' ? postForId(db, input.targetId) : null;
        if (post && !canReadPost(post, actor)) fail(404, '게시글을 찾을 수 없습니다.');
        const target = post
          ? db.users.find((user) => user.id === post.authorId)
          : memberForId(db, input.targetId);
        if (!canRequest(actor, target))
          fail(403, '일반회원·견습회원에 대해서만 요청할 수 있습니다.');
        if (
          db.requests.some(
            (item) =>
              item.type === input.type &&
              item.targetId === input.targetId &&
              item.status === 'pending',
          )
        )
          fail(409, '이미 대기 중인 요청이 있습니다.');
        const item = {
          id: randomUUID(),
          type: input.type,
          targetId: input.targetId,
          targetUserId: target.id,
          targetSnapshot: post ? post.title : target.nickname,
          board: post?.board || null,
          requestedBy: actor.id,
          reason: safeReason(input.reason),
          status: 'pending',
          createdAt: now(),
          reviewedAt: null,
          reviewedBy: null,
          reviewNote: '',
        };
        db.requests.unshift(item);
        audit(db, actor.id, 'request.create', item.id);
        return { request: item };
      }
      if (path === 'admin/requests' && method === 'GET') {
        if (!isStaff(actor.role)) fail(403, '운영진만 요청 목록을 볼 수 있습니다.');
        return {
          requests: db.requests
            .filter((item) => actor.role === 'operator' || item.requestedBy === actor.id)
            .map((item) => ({
              ...item,
              requesterNickname:
                db.users.find((user) => user.id === item.requestedBy)?.nickname || '탈퇴한 회원',
              reviewerNickname:
                db.users.find((user) => user.id === item.reviewedBy)?.nickname || null,
            })),
        };
      }
      if (
        segments[0] === 'admin' &&
        segments[1] === 'requests' &&
        segments[2] &&
        segments[3] === 'review' &&
        method === 'POST'
      ) {
        if (actor.role !== 'operator') fail(403, '운영자만 요청을 승인하거나 거부할 수 있습니다.');
        const item = db.requests.find((item) => item.id === segments[2]);
        if (!item) fail(404, '요청을 찾을 수 없습니다.');
        if (item.status !== 'pending') fail(409, '이미 처리된 요청입니다.');
        if (!['approved', 'rejected'].includes(input.decision))
          fail(400, '처리 결과를 확인해주세요.');
        if (input.decision === 'approved') {
          const requester = db.users.find(
            (user) => user.id === item.requestedBy && user.status === 'active',
          );
          const target = db.users.find((user) => user.id === item.targetUserId);
          if (
            !requester ||
            requester.role !== 'deputy' ||
            !target ||
            !canRequest(requester, target) ||
            !outranks(actor.role, target.role)
          )
            fail(409, '현재 회원 등급 또는 요청자 상태가 변경되어 승인할 수 없습니다.');
          if (item.type === 'post_delete') {
            const post = postForId(db, item.targetId);
            const before = postSnapshot(post);
            post.deletedAt = now();
            audit(
              db,
              actor.id,
              'post.delete.approved',
              post.id,
              postHistoryDetails(actor, before, null, {
                requestId: item.id,
                reason: item.reason,
                requesterNickname: requester.nickname,
              }),
            );
          } else {
            if (target.status !== 'active') fail(409, '이미 탈퇴하거나 강퇴된 회원입니다.');
            target.status = 'expelled';
            target.updatedAt = now();
            db.sessions = db.sessions.filter((session) => session.userId !== target.id);
            audit(db, actor.id, 'user.expel.approved', target.id, {
              requestId: item.id,
              reason: item.reason,
              actorNickname: actor.nickname,
              targetNickname: target.nickname,
              targetCreatedAt: target.createdAt,
            });
          }
        }
        item.status = input.decision;
        item.reviewedAt = now();
        item.reviewedBy = actor.id;
        item.reviewNote = typeof input.note === 'string' ? input.note.trim().slice(0, 1000) : '';
        audit(db, actor.id, 'request.review', item.id, { decision: item.status });
        return { request: item };
      }
      fail(404, '요청한 API를 찾을 수 없습니다.');
    }, method !== 'GET');
    const response = json(result);
    if (path === 'profile' && method === 'DELETE') clearSessionCookie(response);
    return response;
  } catch (error) {
    if (error instanceof AppError || error instanceof ImageUploadError)
      return json({ error: error.message }, error.status);
    console.error('Community API error:', error);
    return json({ error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.' }, 500);
  }
}
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
