import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import * as db from './db.js';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  const attempt = scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(attempt, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const COOKIE_NAME = 'session_token';

export function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

export async function getCurrentUser(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const session = await db.getSession(token);
  if (!session) return null;
  const user = await db.getUser(session.userId);
  if (!user) return null;
  const agency = await db.getAgency(user.agencyId);
  return { user, agency };
}

// En producción (detrás del proxy HTTPS de Hostinger) la cookie solo debe viajar
// por HTTPS. En local (http://localhost) se omite para no romper el desarrollo.
export function isSecureRequest(req) {
  return req.headers['x-forwarded-proto'] === 'https'
    || Boolean(req.socket && req.socket.encrypted)
    || process.env.NODE_ENV === 'production';
}

function cookieAttributes(req) {
  return `HttpOnly; Path=/; SameSite=Lax${isSecureRequest(req) ? '; Secure' : ''}`;
}

export async function login(req, res, userId) {
  const token = await db.createSession(userId);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; ${cookieAttributes(req)}; Max-Age=${60 * 60 * 24 * 7}`
  );
}

export async function logout(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (token) await db.deleteSession(token);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; ${cookieAttributes(req)}; Max-Age=0`);
}
