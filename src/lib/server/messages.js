import { randomUUID } from 'node:crypto';
import { fail } from './auth';
import { isMuted } from '../member-mute.mjs';

const visibleTo = (message, userId) =>
  (message.senderId === userId && !message.senderDeletedAt) ||
  (message.recipientId === userId && !message.recipientDeletedAt);
export const unreadMessageCount = (db, userId) =>
  (db.messages || []).filter(
    (message) => message.recipientId === userId && !message.recipientDeletedAt && !message.readAt,
  ).length;
function participant(db, id) {
  const user = db.users.find((item) => item.id === id);
  const active = user?.status === 'active';
  return {
    id,
    nickname: active ? user.nickname : '탈퇴한 회원',
    photo: active ? user.photo : '',
    role: active ? user.role : null,
    active,
  };
}
function serialize(db, message, detail = false) {
  return {
    id: message.id,
    sender: participant(db, message.senderId),
    recipient: participant(db, message.recipientId),
    createdAt: message.createdAt,
    readAt: message.readAt,
    ...(detail
      ? { body: message.body }
      : { preview: Array.from(message.body).slice(0, 80).join('') }),
  };
}
export function searchMembers(db, actor, term, allowEmpty = false) {
  const search = (term || '').trim().toLowerCase();
  if ((!allowEmpty && !search) || search.length > 30) return [];
  return db.users
    .filter(
      (user) =>
        user.status === 'active' &&
        user.id !== actor.id &&
        user.nickname.toLowerCase().includes(search),
    )
    .sort(
      (a, b) =>
        Number(b.nickname.toLowerCase() === search) - Number(a.nickname.toLowerCase() === search) ||
        a.nickname.localeCompare(b.nickname, 'ko'),
    )
    .slice(0, 10);
}
export function handleMessages(db, actor, segments, method, input, query) {
  const messages = db.messages || [];
  const [, id, action] = segments;
  if (id === 'unread' && segments.length === 2 && method === 'GET')
    return { unreadCount: unreadMessageCount(db, actor.id) };
  if (id === 'recipients' && segments.length === 2 && method === 'GET') {
    return {
      users: searchMembers(db, actor, query.get('q')).map((user) => participant(db, user.id)),
    };
  }
  if (segments.length === 1 && method === 'GET') {
    const box = query.get('box') || 'inbox';
    if (!['inbox', 'sent'].includes(box)) fail(400, '쪽지함을 확인해주세요.');
    const unreadOnly = query.get('unread') === 'true';
    const found = messages
      .filter((message) =>
        box === 'sent'
          ? message.senderId === actor.id && !message.senderDeletedAt
          : message.recipientId === actor.id &&
            !message.recipientDeletedAt &&
            (!unreadOnly || !message.readAt),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const pageCount = Math.max(1, Math.ceil(found.length / 20));
    const page = Math.min(pageCount, Math.max(1, Number.parseInt(query.get('page'), 10) || 1));
    return {
      messages: found.slice((page - 1) * 20, page * 20).map((message) => serialize(db, message)),
      total: found.length,
      page,
      pageCount,
      unreadCount: unreadMessageCount(db, actor.id),
    };
  }
  if (segments.length === 1 && method === 'POST') {
    if (isMuted(actor)) fail(403, '벙어리 상태에서는 쪽지를 보낼 수 없습니다.');
    const recipient = db.users.find(
      (user) => user.id === input.recipientId && user.status === 'active',
    );
    if (!recipient) fail(404, '쪽지를 받을 회원을 찾을 수 없습니다.');
    if (recipient.id === actor.id) fail(400, '다른 회원을 선택해주세요.');
    if (
      typeof input.body !== 'string' ||
      !input.body.trim() ||
      Array.from(input.body.trim()).length > 2000
    )
      fail(400, '쪽지 내용을 1~2,000자로 입력해주세요.');
    if (typeof input.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(input.requestId))
      fail(400, '전송 정보를 확인해주세요.');
    const duplicate = messages.find(
      (message) => message.senderId === actor.id && message.requestId === input.requestId,
    );
    if (duplicate) {
      if (duplicate.recipientId !== recipient.id || duplicate.body !== input.body.trim())
        fail(409, '전송 정보가 변경되었습니다. 새 쪽지를 작성해주세요.');
      return { message: serialize(db, duplicate, true) };
    }
    const now = Date.now();
    const sentAt = (actor.messageSentAt || []).filter((at) => at > now - 3600000);
    if (sentAt.length >= 60 || sentAt.filter((at) => at > now - 60000).length >= 10)
      fail(429, '쪽지를 연속으로 너무 많이 보냈습니다. 잠시 후 다시 보내주세요.');
    actor.messageSentAt = [...sentAt, now];
    const message = {
      id: randomUUID(),
      requestId: input.requestId,
      senderId: actor.id,
      recipientId: recipient.id,
      body: input.body.trim(),
      createdAt: new Date(now).toISOString(),
      readAt: null,
      senderDeletedAt: null,
      recipientDeletedAt: null,
    };
    db.messages ||= [];
    db.messages.push(message);
    return { message: serialize(db, message, true) };
  }
  const message = messages.find((item) => item.id === id && visibleTo(item, actor.id));
  if (!message) fail(404, '쪽지를 찾을 수 없습니다.');
  if (segments.length === 2 && method === 'GET') return { message: serialize(db, message, true) };
  if (segments.length === 3 && action === 'read' && method === 'POST') {
    if (message.recipientId !== actor.id || message.recipientDeletedAt)
      fail(404, '쪽지를 찾을 수 없습니다.');
    message.readAt ||= new Date().toISOString();
    return { message: serialize(db, message, true), unreadCount: unreadMessageCount(db, actor.id) };
  }
  if (segments.length === 2 && method === 'DELETE') {
    message[message.senderId === actor.id ? 'senderDeletedAt' : 'recipientDeletedAt'] =
      new Date().toISOString();
    if (message.senderDeletedAt && message.recipientDeletedAt)
      db.messages = messages.filter((item) => item.id !== message.id);
    return { ok: true, unreadCount: unreadMessageCount(db, actor.id) };
  }
  fail(404, '쪽지 요청을 찾을 수 없습니다.');
}
