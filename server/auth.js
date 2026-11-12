// Autenticación: contraseñas con scrypt y sal aleatoria, sesiones opacas en cookie
// HttpOnly + SameSite=Strict. En la base de datos solo se guarda el hash del token.
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import db from './db.js';
import { config } from './config.js';

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'pomar_session';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [, saltHex, keyHex] = String(stored).split('$');
  if (!saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(keyHex, 'hex');
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

export function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookieHeader(value, maxAgeSec) {
  const attrs = [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSec}`];
  if (config.production) attrs.push('Secure');
  return attrs.join('; ');
}

export function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const ttl = config.sessionDays * 86_400;
  db.createSession(sha(token), userId, Date.now() + ttl * 1000);
  res.setHeader('Set-Cookie', cookieHeader(token, ttl));
}

export function endSession(req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) db.deleteSession(sha(token));
  res.setHeader('Set-Cookie', cookieHeader('', 0));
}

export function currentUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const s = db.session(sha(token));
  if (!s || s.expires_at < Date.now()) return null;
  return db.userById(s.user_id) || null;
}

// Limitador sencillo en memoria para frenar fuerza bruta en login y registro.
const hits = new Map();
export function rateLimit(key, max = 10, windowMs = 10 * 60_000) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length <= max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (!v.some((t) => now - t < 10 * 60_000)) hits.delete(k);
  db.purgeSessions();
}, 10 * 60_000).unref();
