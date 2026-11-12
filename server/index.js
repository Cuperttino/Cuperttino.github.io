// Servidor HTTP de Pomar. Sin dependencias externas: Node >= 20 (recomendado >= 22.5 para SQLite).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { config, PUBLIC_DIR } from './config.js';
import db from './db.js';
import { hashPassword, verifyPassword, startSession, endSession, currentUser, rateLimit } from './auth.js';
import { getNews, newsStatus, startNewsScheduler } from './news.js';
import { PRODUCTS, byId, FAMILIES, summary } from './data/products.js';
import { OS, UPCOMING, TIMELINE, SILICON, IPHONE_DESIGN, TIPS, TRIVIA, TECH } from './data/content.js';
import { compare } from './compare.js';
import { advise } from './advisor.js';
import { search, norm } from './search.js';
import { aiOpinion } from './ai.js';
import { getPhotos } from './photos.js';

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const bad = (msg) => new HttpError(400, msg);

// ---------- utilidades ----------
function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(data);
}
async function readJson(req) {
  if (!/^application\/json/i.test(req.headers['content-type'] || '')) throw new HttpError(415, 'Se esperaba JSON.');
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > 32_768) throw new HttpError(413, 'Petición demasiado grande.'); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw bad('JSON no válido.'); }
}
// Protección CSRF: las peticiones que modifican datos deben venir del propio origen.
function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  let host; try { host = new URL(origin).host; } catch { throw new HttpError(403, 'Origen no permitido.'); }
  if (host !== req.headers.host) throw new HttpError(403, 'Origen no permitido.');
}
const ip = (req) => req.socket.remoteAddress || 'local';
const requireUser = (req) => { const u = currentUser(req); if (!u) throw new HttpError(401, 'Inicia sesión para continuar.'); return u; };
const str = (v, max) => (v == null || v === '' ? null : String(v).trim().slice(0, max) || null);

function cleanDevice(body) {
  const p = byId.get(String(body.product_id || ''));
  if (!p) throw bad('Selecciona un modelo del catálogo.');
  const color = str(body.color, 40);
  if (color && p.colors && !p.colors.some(([n]) => n === color)) throw bad('Ese color no existe para este modelo.');
  const purchased = str(body.purchased_at, 10);
  if (purchased && (!/^\d{4}-\d{2}(-\d{2})?$/.test(purchased) || Number.isNaN(Date.parse(purchased.length === 7 ? `${purchased}-01` : purchased)))) throw bad('La fecha de compra no es válida.');
  if (purchased && Date.parse(purchased.length === 7 ? `${purchased}-01` : purchased) > Date.now()) throw bad('La fecha de compra no puede ser futura.');
  let price = body.price_paid;
  if (price === '' || price == null) price = null;
  else { price = Number(price); if (!Number.isFinite(price) || price < 0 || price > 100_000) throw bad('El precio pagado no es válido.'); }
  return { product_id: p.id, color, storage: str(body.storage, 40), purchased_at: purchased, price_paid: price, applecare: !!body.applecare, nickname: str(body.nickname, 40) };
}

// ---------- API ----------
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler });

route('GET', '/api/config', () => ({ ai: config.ai.enabled, storage: db.engine, static: false }));

route('GET', '/api/news', async (req, q) => {
  const state = await getNews();
  let items = state.items;
  const kind = q.get('kind'), topic = q.get('topic'), source = q.get('source'), text = norm(q.get('q') || '').trim();
  if (kind) items = items.filter((i) => i.kind === kind);
  if (topic) items = items.filter((i) => i.topics.includes(topic));
  if (source) items = items.filter((i) => i.source === source);
  if (text) { const terms = text.split(/\s+/); items = items.filter((i) => terms.every((t) => norm(`${i.title} ${i.excerpt}`).includes(t))); }
  const limit = Math.min(Number(q.get('limit')) || 60, 200);
  const topics = [...new Set(state.items.flatMap((i) => i.topics))].sort();
  return { items: items.slice(0, limit), total: items.length, topics, fetchedAt: state.fetchedAt || null, sources: newsStatus() };
});

route('GET', '/api/products', () => ({ families: FAMILIES, products: PRODUCTS.map(summary) }));
route('GET', '/api/products/:id', (req, q, { id }) => {
  const p = byId.get(id); if (!p) throw new HttpError(404, 'Producto no encontrado.');
  const related = PRODUCTS.filter((x) => x.line === p.line && x.id !== p.id).sort((a, b) => b.released.localeCompare(a.released)).slice(0, 4).map(summary);
  return { product: p, related };
});

route('GET', '/api/products/:id/photos', async (req, q, { id }) => {
  const p = byId.get(id); if (!p) throw new HttpError(404, 'Producto no encontrado.');
  return { ...(await getPhotos(p)), folder: `public/fotos/${p.id}/` };
});

function productsFromIds(q) {
  const ids = (q.get('ids') || '').split(',').filter(Boolean);
  if (ids.length < 2 || ids.length > 4) throw bad('Elige entre dos y cuatro productos.');
  if (new Set(ids).size !== ids.length) throw bad('No repitas el mismo producto.');
  return ids.map((id) => { const p = byId.get(id); if (!p) throw new HttpError(404, `Producto no encontrado: ${id}`); return p; });
}
route('GET', '/api/compare', (req, q) => { const ps = productsFromIds(q); return { products: ps, ...compare(ps) }; });
route('POST', '/api/compare/ai', async (req, q) => {
  if (!rateLimit(`ai:${ip(req)}`, 12, 60 * 60_000)) throw new HttpError(429, 'Has alcanzado el límite de opiniones con IA por hora.');
  const body = await readJson(req);
  const ps = productsFromIds(new URLSearchParams({ ids: String(body.ids || '') }));
  return aiOpinion(ps, compare(ps).verdict, str(body.profile, 200));
});

route('GET', '/api/search', async (req, q) => { const state = await getNews().catch(() => ({ items: [] })); return search(q.get('q') || '', state.items); });
route('GET', '/api/os', () => ({ systems: OS }));
route('GET', '/api/upcoming', () => ({ upcoming: UPCOMING }));
route('GET', '/api/learn', () => ({ timeline: TIMELINE, silicon: SILICON, iphoneDesign: IPHONE_DESIGN, tips: TIPS, trivia: TRIVIA, tech: TECH }));

route('POST', '/api/auth/register', async (req) => {
  if (!rateLimit(`reg:${ip(req)}`, 8)) throw new HttpError(429, 'Demasiados intentos. Prueba de nuevo en unos minutos.');
  const b = await readJson(req);
  const email = String(b.email || '').trim().toLowerCase(), name = str(b.name, 60), password = String(b.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) throw bad('Introduce un correo electrónico válido.');
  if (!name) throw bad('Indica tu nombre.');
  if (password.length < 8 || password.length > 200) throw bad('La contraseña debe tener al menos 8 caracteres.');
  if (db.userByEmail(email)) throw new HttpError(409, 'Ya existe una cuenta con ese correo.');
  const id = db.createUser({ email, name, passwordHash: await hashPassword(password) });
  return { __session: id, user: db.userById(id) };
});
route('POST', '/api/auth/login', async (req) => {
  const b = await readJson(req);
  const email = String(b.email || '').trim().toLowerCase();
  if (!rateLimit(`login:${ip(req)}:${email}`, 8)) throw new HttpError(429, 'Demasiados intentos. Prueba de nuevo en unos minutos.');
  const u = db.userByEmail(email);
  // Se verifica siempre un hash para no revelar por tiempo de respuesta si el correo existe.
  const ok = await verifyPassword(String(b.password || ''), u?.password_hash || 'scrypt$00$00');
  if (!u || !ok) throw new HttpError(401, 'Correo o contraseña incorrectos.');
  return { __session: u.id, user: db.userById(u.id) };
});
route('POST', '/api/auth/logout', (req, q, p, res) => { endSession(req, res); return { ok: true }; });
route('GET', '/api/auth/me', (req) => ({ user: currentUser(req) }));

const withProduct = (d) => ({ ...d, product: byId.has(d.product_id) ? summary(byId.get(d.product_id)) : null });
route('GET', '/api/devices', (req) => ({ devices: db.devices(requireUser(req).id).map(withProduct) }));
route('POST', '/api/devices', async (req) => {
  const u = requireUser(req);
  if (db.devices(u.id).length >= 100) throw bad('Has alcanzado el máximo de dispositivos.');
  const id = db.addDevice(u.id, cleanDevice(await readJson(req)));
  return { device: withProduct(db.device(u.id, id)) };
});
route('PUT', '/api/devices/:id', async (req, q, { id }) => {
  const u = requireUser(req); const n = Number(id);
  if (!db.device(u.id, n)) throw new HttpError(404, 'Dispositivo no encontrado.');
  db.updateDevice(u.id, n, cleanDevice(await readJson(req)));
  return { device: withProduct(db.device(u.id, n)) };
});
route('DELETE', '/api/devices/:id', (req, q, { id }) => {
  const u = requireUser(req); const n = Number(id);
  if (!db.device(u.id, n)) throw new HttpError(404, 'Dispositivo no encontrado.');
  db.deleteDevice(u.id, n); return { ok: true };
});
route('GET', '/api/advisor', (req) => advise(db.devices(requireUser(req).id)));

async function handleApi(req, res, url) {
  const match = routes.map((r) => ({ r, m: r.method === req.method && url.pathname.match(r.re) })).find((x) => x.m);
  if (!match) throw new HttpError(routes.some((r) => url.pathname.match(r.re)) ? 405 : 404, 'Ruta no encontrada.');
  if (req.method !== 'GET') checkOrigin(req);
  const out = await match.r.handler(req, url.searchParams, match.m.groups || {}, res);
  if (out && out.__session) { startSession(res, out.__session); delete out.__session; }
  send(res, 200, out);
}

// ---------- estáticos y SPA ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
const fileCache = new Map();
function loadFile(file) {
  const stat = fs.statSync(file);
  const hit = fileCache.get(file);
  if (hit && hit.mtime === stat.mtimeMs) return hit;
  const raw = fs.readFileSync(file);
  const entry = { mtime: stat.mtimeMs, raw, gz: raw.length > 1024 ? zlib.gzipSync(raw) : null, etag: `"${crypto.createHash('sha1').update(raw).digest('base64url')}"` };
  fileCache.set(file, entry);
  return entry;
}
const SECURITY = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://upload.wikimedia.org; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};
function serveFile(req, res, file, extra = {}) {
  const f = loadFile(file);
  const headers = { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', ETag: f.etag, 'Cache-Control': file.includes(`${path.sep}vendor${path.sep}`) ? 'public, max-age=604800' : 'no-cache', ...extra };
  if (req.headers['if-none-match'] === f.etag) { res.writeHead(304, headers); return res.end(); }
  const gz = f.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (gz) headers['Content-Encoding'] = 'gzip';
  headers.Vary = 'Accept-Encoding';
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : gz ? f.gz : f.raw);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PAGES = {
  '/': ['Pomar · El huerto de los aficionados a Apple', 'Actualidad, enciclopedia de productos, comparador honesto y gestor de tu ecosistema Apple. Web independiente, no afiliada a Apple.'],
  '/actualidad': ['Actualidad Apple · Pomar', 'Noticias oficiales, rumores y análisis de Apple, con fuente y fecha, enlazados al artículo original.'],
  '/enciclopedia': ['Enciclopedia de productos Apple · Pomar', 'Fichas técnicas, fotografías y valoración honesta de iPhone, iPad, Mac, Apple Watch, AirPods y más.'],
  '/comparar': ['Comparador de productos Apple · Pomar', 'Enfrenta hasta cuatro productos Apple y recibe un veredicto razonado: qué se nota de verdad y si merece la pena pagar más.'],
  '/ecosistema': ['Mi ecosistema · Pomar', 'Registra tus dispositivos Apple y recibe consejos honestos sobre qué actualizar y cuándo.'],
  '/descubrir': ['Descubrir Apple · Pomar', 'Historia, Apple Silicon, evolución del diseño del iPhone, trucos y curiosidades.'],
  '/sistemas': ['Sistemas operativos de Apple · Pomar', 'iOS, iPadOS, macOS, watchOS, visionOS y tvOS: versión actual e hitos.'],
};
function serveApp(req, res, url) {
  let [title, desc] = PAGES[url.pathname] || PAGES['/'];
  let status = 200;
  const pm = url.pathname.match(/^\/producto\/([\w-]+)$/);
  if (pm) {
    const p = byId.get(pm[1]);
    if (p) { title = `${p.name} (${p.year}): ficha, fotos y opinión · Pomar`; desc = `${p.name}: ${[p.chip, p.display].filter(Boolean).join(' · ')}. ${p.buy?.text || ''}`.slice(0, 180); }
    else status = 404;
  } else if (!PAGES[url.pathname] && !['/cuenta', '/buscar', '/acerca'].includes(url.pathname)) status = 404;
  const html = loadFile(path.join(PUBLIC_DIR, 'index.html')).raw.toString('utf8')
    .replace('<!--META-->', `<title>${esc(title)}</title>\n  <meta name="description" content="${esc(desc)}">\n  <link rel="canonical" href="${esc(config.siteUrl + url.pathname)}">\n  <meta property="og:title" content="${esc(title)}">\n  <meta property="og:description" content="${esc(desc)}">\n  <meta property="og:type" content="website">`);
  res.writeHead(status, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache', ...SECURITY });
  res.end(req.method === 'HEAD' ? undefined : html);
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { return send(res, 400, { error: 'URL no válida.' }); }
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Método no permitido.');
    if (url.pathname === '/robots.txt') return send(res, 200, `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /cuenta\nSitemap: ${config.siteUrl}/sitemap.xml\n`, { 'Content-Type': MIME['.txt'] });
    if (url.pathname === '/sitemap.xml') {
      const urls = [...Object.keys(PAGES), ...PRODUCTS.map((p) => `/producto/${p.id}`)];
      return send(res, 200, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(config.siteUrl + u)}</loc></url>`).join('\n')}\n</urlset>\n`, { 'Content-Type': MIME['.xml'] });
    }
    // Archivos estáticos (con protección frente a rutas fuera de /public).
    const rel = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    const file = path.join(PUBLIC_DIR, rel);
    if (rel && file.startsWith(PUBLIC_DIR + path.sep) && path.extname(file) && fs.existsSync(file) && fs.statSync(file).isFile()) return serveFile(req, res, file, SECURITY);
    if (path.extname(url.pathname)) throw new HttpError(404, 'Archivo no encontrado.');
    return serveApp(req, res, url);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error(`[error] ${req.method} ${url.pathname}:`, err);
    if (res.headersSent) return res.end();
    send(res, status, { error: status >= 500 && !err.status ? 'Error interno del servidor.' : err.message });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`\n  Pomar está en marcha →  http://localhost:${config.port}`);
  console.log(`  Base de datos: ${db.engine === 'sqlite' ? 'SQLite (data/pomar.db)' : 'JSON (data/pomar.json)'} · Opinión con IA: ${config.ai.enabled ? 'activada' : 'no configurada (opcional)'}\n`);
  startNewsScheduler();
});
