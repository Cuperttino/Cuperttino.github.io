// Capa de persistencia. Usa SQLite integrado en Node (node:sqlite, Node >= 22.5).
// Si no está disponible, recurre a un almacén JSON en disco con la misma interfaz,
// para que la aplicación funcione igualmente en versiones anteriores de Node.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './config.js';

fs.mkdirSync(DATA_DIR, { recursive: true });

async function openSqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path.join(DATA_DIR, 'pomar.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      color TEXT,
      storage TEXT,
      purchased_at TEXT,
      price_paid REAL,
      applecare INTEGER NOT NULL DEFAULT 0,
      nickname TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS devices_user ON devices(user_id);
  `);
  const q = (sql) => db.prepare(sql);
  const dev = (r) => r && { ...r, applecare: !!r.applecare };
  return {
    engine: 'sqlite',
    createUser({ email, name, passwordHash }) {
      const r = q('INSERT INTO users (email,name,password_hash,created_at) VALUES (?,?,?,?)')
        .run(email, name, passwordHash, new Date().toISOString());
      return Number(r.lastInsertRowid);
    },
    userByEmail: (email) => q('SELECT * FROM users WHERE email = ?').get(email),
    userById: (id) => q('SELECT id,email,name,created_at FROM users WHERE id = ?').get(id),
    createSession(tokenHash, userId, expiresAt) {
      q('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').run(tokenHash, userId, expiresAt);
    },
    session: (tokenHash) => q('SELECT * FROM sessions WHERE token_hash = ?').get(tokenHash),
    deleteSession(tokenHash) { q('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash); },
    purgeSessions() { q('DELETE FROM sessions WHERE expires_at < ?').run(Date.now()); },
    devices: (userId) => q('SELECT * FROM devices WHERE user_id = ? ORDER BY id').all(userId).map(dev),
    device: (userId, id) => dev(q('SELECT * FROM devices WHERE user_id = ? AND id = ?').get(userId, id)),
    addDevice(userId, d) {
      const r = q(`INSERT INTO devices (user_id,product_id,color,storage,purchased_at,price_paid,applecare,nickname,created_at)
                   VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(userId, d.product_id, d.color, d.storage, d.purchased_at, d.price_paid, d.applecare ? 1 : 0, d.nickname, new Date().toISOString());
      return Number(r.lastInsertRowid);
    },
    updateDevice(userId, id, d) {
      q(`UPDATE devices SET product_id=?,color=?,storage=?,purchased_at=?,price_paid=?,applecare=?,nickname=?
         WHERE user_id=? AND id=?`)
        .run(d.product_id, d.color, d.storage, d.purchased_at, d.price_paid, d.applecare ? 1 : 0, d.nickname, userId, id);
    },
    deleteDevice(userId, id) { q('DELETE FROM devices WHERE user_id = ? AND id = ?').run(userId, id); },
  };
}

function openJson() {
  const file = path.join(DATA_DIR, 'pomar.json');
  let s = { users: [], sessions: [], devices: [], seq: { users: 0, devices: 0 } };
  try { s = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* primera ejecución */ }
  const save = () => { fs.writeFileSync(file + '.tmp', JSON.stringify(s)); fs.renameSync(file + '.tmp', file); };
  const pub = (u) => u && { id: u.id, email: u.email, name: u.name, created_at: u.created_at };
  return {
    engine: 'json',
    createUser({ email, name, passwordHash }) {
      if (s.users.some((u) => u.email === email)) throw new Error('UNIQUE');
      const id = ++s.seq.users;
      s.users.push({ id, email, name, password_hash: passwordHash, created_at: new Date().toISOString() });
      save(); return id;
    },
    userByEmail: (email) => s.users.find((u) => u.email === email),
    userById: (id) => pub(s.users.find((u) => u.id === id)),
    createSession(token_hash, user_id, expires_at) { s.sessions.push({ token_hash, user_id, expires_at }); save(); },
    session: (h) => s.sessions.find((x) => x.token_hash === h),
    deleteSession(h) { s.sessions = s.sessions.filter((x) => x.token_hash !== h); save(); },
    purgeSessions() { s.sessions = s.sessions.filter((x) => x.expires_at >= Date.now()); save(); },
    devices: (uid) => s.devices.filter((d) => d.user_id === uid),
    device: (uid, id) => s.devices.find((d) => d.user_id === uid && d.id === id),
    addDevice(uid, d) {
      const id = ++s.seq.devices;
      s.devices.push({ id, user_id: uid, ...d, applecare: !!d.applecare, created_at: new Date().toISOString() });
      save(); return id;
    },
    updateDevice(uid, id, d) {
      const i = s.devices.findIndex((x) => x.user_id === uid && x.id === id);
      if (i >= 0) { s.devices[i] = { ...s.devices[i], ...d, applecare: !!d.applecare }; save(); }
    },
    deleteDevice(uid, id) { s.devices = s.devices.filter((x) => !(x.user_id === uid && x.id === id)); save(); },
  };
}

let store;
try { store = await openSqlite(); } catch { store = openJson(); }
export default store;
