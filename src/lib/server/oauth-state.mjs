import { createHash } from 'node:crypto';
const hash = (value) => createHash('sha256').update(value).digest('hex');
export function registerOAuthState(db, state, previous, at = Date.now()) {
  db.oauthStates = (db.oauthStates || []).filter(
    (item) => item.expiresAt > at && (!previous || item.hash !== hash(previous)),
  );
  if (db.oauthStates.length >= 2000) return false;
  db.oauthStates.push({ hash: hash(state), expiresAt: at + 600000 });
  return true;
}
export function consumeOAuthState(db, state, at = Date.now()) {
  const key = hash(state);
  const found = (db.oauthStates || []).some((item) => item.hash === key && item.expiresAt > at);
  db.oauthStates = (db.oauthStates || []).filter(
    (item) => item.hash !== key && item.expiresAt > at,
  );
  return found;
}
