import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from './config';
import { hashPassword } from './passwords';
import { posts as samplePosts } from '../data';
import { startProbation, settleProbation } from './probation.mjs';
import {createPool,migrate,postgresTransaction} from './postgres.mjs';

const shared = globalThis;
shared.__hdJsonQueue ||= Promise.resolve();

function createSeed() {
  const now = new Date().toISOString();
  const seedPassword=process.env.SEED_PASSWORD||(process.env.RENDER?`${randomUUID()}${randomUUID()}`:'1234');
  const accounts = [
    ['admin', 'operator', '라미아'], ['subadmin', 'deputy', '부운영자'],
    ['user1', 'member', '헬다이버'], ['user2', 'apprentice', '견습헬다이버'],
  ];
  const users = accounts.map(([loginId, role, nickname]) => ({ id: `u-${loginId}`, loginId, passwordHash: hashPassword(seedPassword), role, nickname, photo: '', kakao: null, status: 'active', createdAt: now, updatedAt: now, lastLoginAt: null }));
  const authors = ['u-user1', 'u-subadmin', 'u-user1', 'u-user2', 'u-user1'];
  users.filter(user => user.role === 'apprentice').forEach(user => startProbation(user));
  const posts = Object.entries(samplePosts).flatMap(([board, items]) => items.map((item, index) => ({
    id: `${board}-${item.id}`, board, category: item.category, title: item.title,
    authorId: board === 'notice' ? (index % 2 ? 'u-subadmin' : 'u-admin') : authors[index % authors.length],
    content: item.content, bodyHtml: '', images: item.image ? [item.image] : [], pinned: Boolean(item.pinned),
    views: 0, createdAt: new Date(`${item.date.replaceAll('.','-')}T12:00:00+09:00`).toISOString(), updatedAt: now, deletedAt: null,
  })));
  const comments = posts.map(post => ({ id: randomUUID(), postId: post.id, authorId: 'u-user1', body: '함께 즐길 동료가 있어서 좋네요. 오늘도 안전한 강하 하세요!', createdAt: now, deletedAt: null }));
  return { schemaVersion: 1, users, posts, comments, votes: [], requests: [], sessions: [], audit: [] };
}

async function atomicWrite(db) {
  await fs.mkdir(path.dirname(config.dataFile), { recursive: true });
  const temporary = `${config.dataFile}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(db, null, 2), { encoding: 'utf8', mode: 0o600 });
  await fs.rename(temporary, config.dataFile);
}

async function load() {
  try { return JSON.parse(await fs.readFile(config.dataFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const db = createSeed(); await atomicWrite(db); return db;
  }
}

// One process owns this JSON store. Every read/write joins the same queue.
// Replace these repository functions when moving to MariaDB/PostgreSQL.
export function transaction(callback, write = true) {
  if(process.env.DATABASE_URL) {
    if(!shared.__hdPgPool)shared.__hdPgPool=createPool();
    if(!shared.__hdPgReady)shared.__hdPgReady=migrate(shared.__hdPgPool).catch(error=>{shared.__hdPgReady=null;throw error});
    return shared.__hdPgReady.then(()=>postgresTransaction(shared.__hdPgPool,callback,{write,seed:createSeed,settle:settleProbation}));
  }
  const operation = shared.__hdJsonQueue.then(async () => {
    const db = await load();
    if (settleProbation(db)) await atomicWrite(db);
    const result = await callback(db);
    if (write) await atomicWrite(db);
    return result;
  });
  shared.__hdJsonQueue = operation.catch(() => {});
  return operation;
}
export const readStore = callback => transaction(callback, false);
export function audit(db, actorId, action, targetId, details = {}) {
  db.audit.push({ id: randomUUID(), actorId, action, targetId, details, createdAt: new Date().toISOString() });
}
