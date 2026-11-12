// Backend de la versión estática (GitHub Pages): no hay servidor, así que la API se resuelve en el navegador.
// - Catálogo, comparador, asesor y buscador: los mismos módulos que usa el servidor (copiados a ./local/).
// - Noticias: news.json, generado por GitHub Actions a partir de los feeds reales.
// - Fotos: API pública de Wikimedia Commons (admite CORS) + manifiesto de fotos propias.
// - Mi ecosistema: se guarda en este navegador (localStorage). No hay cuentas ni contraseñas en este modo.
import { PRODUCTS, byId, FAMILIES, summary } from './local/data/products.js';
import { OS, UPCOMING, TIMELINE, SILICON, IPHONE_DESIGN, TIPS, TRIVIA, TECH } from './local/data/content.js';
import { compare } from './local/compare.js';
import { advise } from './local/advisor.js';
import { search, norm } from './local/search.js';
import { findPhotos } from './local/photos-core.js';

const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(`pomar:${k}`)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`pomar:${k}`, JSON.stringify(v)); } catch { fail(507, 'Este navegador no permite guardar datos (¿modo privado?).'); } },
  del(k) { try { localStorage.removeItem(`pomar:${k}`); } catch { /* nada */ } },
};
const str = (v, max) => (v == null || v === '' ? null : String(v).trim().slice(0, max) || null);

let newsPromise;
const loadNews = () => (newsPromise ??= fetch('/news.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))).catch(() => { newsPromise = null; return { items: [], sources: [], fetchedAt: null, offline: true }; }));
let commons;
const commonsManifest = () => (commons ??= fetch('/fotos/commons.json').then((r) => (r.ok ? r.json() : {})).then((d) => d.products || {}).catch(() => ({})));
let manifest;
const localPhotos = () => (manifest ??= fetch('/fotos/index.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})));

async function photos(p) {
  const own = (await localPhotos())[p.id] || [];
  const folder = `public/fotos/${p.id}/`;
  if (own.length) return { photos: own.map((f) => ({ src: `/fotos/${p.id}/${encodeURIComponent(f)}`, full: `/fotos/${p.id}/${encodeURIComponent(f)}`, page: null, title: f.replace(/\.[a-z0-9]+$/i, ''), author: null, license: null, local: true })), source: 'local', folder };
  // Fotos de Commons ya localizadas al construir el sitio (scripts/fetch-photos.mjs).
  const built = (await commonsManifest())[p.id];
  if (built) return { photos: built, source: built.length ? 'commons' : 'none', folder };
  try {
    const { photos: list } = await findPhotos(p, (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))));
    return { photos: list, source: list.length ? 'commons' : 'none', folder };
  } catch { return { photos: [], source: 'none', error: 'No se pudo conectar con Wikimedia Commons.', folder }; }
}

function cleanDevice(b) {
  const p = byId.get(String(b.product_id || '')); if (!p) fail(400, 'Selecciona un modelo del catálogo.');
  const purchased = str(b.purchased_at, 10);
  if (purchased && !/^\d{4}-\d{2}(-\d{2})?$/.test(purchased)) fail(400, 'La fecha de compra no es válida.');
  let price = b.price_paid; if (price === '' || price == null) price = null; else { price = Number(price); if (!Number.isFinite(price) || price < 0 || price > 100000) fail(400, 'El precio pagado no es válido.'); }
  return { product_id: p.id, color: str(b.color, 40), storage: str(b.storage, 40), purchased_at: purchased, price_paid: price, applecare: !!b.applecare, nickname: str(b.nickname, 40) };
}
const withProduct = (d) => ({ ...d, product: byId.has(d.product_id) ? summary(byId.get(d.product_id)) : null });
const needUser = () => store.get('user', null) || fail(401, 'Crea tu perfil para continuar.');
function idsToProducts(raw) {
  const ids = String(raw || '').split(',').filter(Boolean);
  if (ids.length < 2 || ids.length > 4) fail(400, 'Elige entre dos y cuatro productos.');
  if (new Set(ids).size !== ids.length) fail(400, 'No repitas el mismo producto.');
  return ids.map((id) => byId.get(id) || fail(404, `Producto no encontrado: ${id}`));
}

export async function request(path, { method = 'GET', body = {} } = {}) {
  const url = new URL(path, location.origin), q = url.searchParams, p = url.pathname;
  let m;
  if (p === '/api/config') return { ai: false, storage: 'navegador', static: true };
  if (p === '/api/news') {
    const state = await loadNews(); let items = state.items;
    const kind = q.get('kind'), topic = q.get('topic'), source = q.get('source'), text = norm(q.get('q') || '').trim();
    if (kind) items = items.filter((i) => i.kind === kind);
    if (topic) items = items.filter((i) => i.topics.includes(topic));
    if (source) items = items.filter((i) => i.source === source);
    if (text) { const terms = text.split(/\s+/); items = items.filter((i) => terms.every((t) => norm(`${i.title} ${i.excerpt}`).includes(t))); }
    return { items: items.slice(0, Math.min(Number(q.get('limit')) || 60, 200)), total: items.length, topics: [...new Set(state.items.flatMap((i) => i.topics))].sort(), fetchedAt: state.fetchedAt, sources: state.sources };
  }
  if (p === '/api/products') return { families: FAMILIES, products: PRODUCTS.map(summary) };
  if ((m = p.match(/^\/api\/products\/([\w-]+)\/photos$/))) return photos(byId.get(m[1]) || fail(404, 'Producto no encontrado.'));
  if ((m = p.match(/^\/api\/products\/([\w-]+)$/))) {
    const prod = byId.get(m[1]) || fail(404, 'Producto no encontrado.');
    return { product: prod, related: PRODUCTS.filter((x) => x.line === prod.line && x.id !== prod.id).sort((a, b) => b.released.localeCompare(a.released)).slice(0, 4).map(summary) };
  }
  if (p === '/api/compare') { const ps = idsToProducts(q.get('ids')); return { products: ps, ...compare(ps) }; }
  if (p === '/api/compare/ai') fail(501, 'La opinión con IA solo está disponible en la versión con servidor.');
  if (p === '/api/search') return search(q.get('q') || '', (await loadNews()).items);
  if (p === '/api/os') return { systems: OS };
  if (p === '/api/upcoming') return { upcoming: UPCOMING };
  if (p === '/api/learn') return { timeline: TIMELINE, silicon: SILICON, iphoneDesign: IPHONE_DESIGN, tips: TIPS, trivia: TRIVIA, tech: TECH };
  if (p === '/api/auth/me') return { user: store.get('user', null) };
  if (p === '/api/auth/register' || p === '/api/auth/login') {
    const name = str(body.name, 60) || fail(400, 'Indica tu nombre.');
    const user = { id: 1, name, email: 'Perfil guardado en este navegador', created_at: store.get('user', null)?.created_at || new Date().toISOString() };
    store.set('user', user); return { user };
  }
  if (p === '/api/auth/logout') { store.del('user'); return { ok: true }; }
  if (p === '/api/devices' && method === 'GET') { needUser(); return { devices: store.get('devices', []).map(withProduct) }; }
  if (p === '/api/devices' && method === 'POST') {
    needUser(); const list = store.get('devices', []); if (list.length >= 100) fail(400, 'Has alcanzado el máximo de dispositivos.');
    const d = { id: (store.get('seq', 0) || 0) + 1, ...cleanDevice(body), created_at: new Date().toISOString() };
    store.set('seq', d.id); store.set('devices', [...list, d]); return { device: withProduct(d) };
  }
  if ((m = p.match(/^\/api\/devices\/(\d+)$/))) {
    needUser(); const id = Number(m[1]), list = store.get('devices', []); const i = list.findIndex((d) => d.id === id); if (i < 0) fail(404, 'Dispositivo no encontrado.');
    if (method === 'DELETE') { store.set('devices', list.filter((d) => d.id !== id)); return { ok: true }; }
    list[i] = { ...list[i], ...cleanDevice(body) }; store.set('devices', list); return { device: withProduct(list[i]) };
  }
  if (p === '/api/advisor') { needUser(); return advise(store.get('devices', [])); }
  fail(404, 'Ruta no encontrada.');
}
