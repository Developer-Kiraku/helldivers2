import { createHash } from 'node:crypto';

// Stored under transaction lock so parallel requests and different servers share limits.
// Do not trust caller-controlled forwarding headers for the account limit.
export function reserveLoginAttempt(db, loginId, at = Date.now()) {
  const key = createHash('sha256').update(loginId).digest('hex');
  db.loginAttempts = (db.loginAttempts || []).filter(item => item.at > at - 60000);
  if (db.loginAttempts.length >= 100 || db.loginAttempts.filter(item => item.key === key).length >= 8) return false;
  db.loginAttempts.push({ key, at });
  return true;
}
