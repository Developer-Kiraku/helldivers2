import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, hash) {
  if (!hash || typeof password !== 'string') return false;
  const [salt, encoded] = hash.split(':');
  if (!salt || !encoded) return false;
  const expected = Buffer.from(encoded, 'hex');
  const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const tokenHash = value => createHash('sha256').update(value).digest('hex');
export const createToken = () => randomBytes(32).toString('hex');
