// Galería de fotos de cada producto.
// 1) Fotos propias: cualquier imagen que coloques en public/fotos/<id-del-producto>/ tiene prioridad.
// 2) Wikimedia Commons: fotografías reales con licencia libre, buscadas por nombre de producto
//    mediante su API pública. Se muestran con autor y licencia, enlazadas a su página original.
// No se usan las fotografías de prensa de Apple: no hay licencia para redistribuirlas.
import fs from 'node:fs';
import path from 'node:path';
import { PUBLIC_DIR, DATA_DIR } from './config.js';
import { pickPhotos, photoQuery, findPhotos } from './photos-core.js';
export { pickPhotos, photoQuery };

const LOCAL_DIR = path.join(PUBLIC_DIR, 'fotos');
const CACHE_FILE = path.join(DATA_DIR, 'photos-cache.json');
const DAY = 86_400_000;
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { /* sin caché previa */ }
const pending = new Map();

export function localPhotos(id) {
  try {
    return fs.readdirSync(path.join(LOCAL_DIR, id)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort()
      .map((f) => ({ src: `/fotos/${id}/${encodeURIComponent(f)}`, full: `/fotos/${id}/${encodeURIComponent(f)}`, page: null, title: f.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' '), author: null, license: null, local: true }));
  } catch { return []; }
}

async function fetchCommons(product) {
  const get = async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(9000), headers: { 'User-Agent': 'Pomar/1.0 (galeria de productos; uso personal)', Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  const getText = async (url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pomar/1.0)', Accept: 'text/html' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };
  return (await findPhotos(product, get, getText)).photos;
}

export async function getPhotos(product) {
  const local = localPhotos(product.id);
  if (local.length) return { photos: local, source: 'local' };
  const hit = cache[product.id];
  if (hit && Date.now() - hit.at < (hit.photos.length ? 7 * DAY : DAY)) return { photos: hit.photos, source: hit.photos.length ? 'web' : 'none' };
  if (!pending.has(product.id)) {
    pending.set(product.id, fetchCommons(product).then((photos) => {
      cache[product.id] = { at: Date.now(), photos };
      try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)); } catch { /* caché opcional */ }
      return photos;
    }).finally(() => pending.delete(product.id)));
  }
  try { const photos = await pending.get(product.id); return { photos, source: photos.length ? 'commons' : 'none' }; }
  catch (err) { return { photos: hit?.photos || [], source: hit?.photos?.length ? 'commons' : 'none', error: 'No se pudo conectar con Wikimedia Commons.' }; }
}
