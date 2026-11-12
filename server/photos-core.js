// Lógica pura de la galería (sin dependencias de Node): se usa en el servidor y en la versión estática.
import { APPLE_PRESS } from './data/apple-press.js';
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
// Variantes de modelo: si no están en el nombre buscado, no deben aparecer en el título de la foto
// (evita que «iPhone 17» muestre fotos del «iPhone 17 Pro Max»).
const VARIANTS = ['pro', 'max', 'plus', 'mini', 'air', 'ultra', 'se', 'neo', 'studio', 'duo'];
const JUNK = /\b(logo|icon|wordmark|screenshot|diagram|chart|graph|map|box|case|cover|funda|advert|keynote|store|event|queue|app|fema|pos|teardown|pcb|chip|soc)\b/;

// Nombres alternativos de categoría en Commons para productos cuyo nombre en Pomar no coincide.
const CATEGORIES = {
  'iphone-2007': ['iPhone (1st generation)', 'iPhone 2G', 'Original iPhone'], 'ipad-2010': ['iPad (1st generation)', 'iPad 1'],
  'apple-watch-2015': ['Apple Watch (1st generation)', 'Apple Watch Series 0'], 'airpods-2016': ['AirPods (1st generation)', 'AirPods 1'],
  'ipod-2001': ['iPod (1st generation)', 'iPod classic (1st generation)', 'IPod 1G'], 'homepod-2': ['HomePod (2nd generation)', 'HomePod 2'],
  'homepod-mini': ['HomePod mini'], 'apple-tv-4k-2022': ['Apple TV 4K (3rd generation)'], 'mac-pro-2023': ['Mac Pro (2023)', 'Mac Pro (Apple silicon)'],
  'mac-studio-2025': ['Mac Studio (2025)', 'Mac Studio'], 'mac-studio-2026': ['Mac Studio (2026)'], 'mac-mini-m6': ['Mac mini (2026)', 'Mac mini M6'],
  'apple-watch-se-3': ['Apple Watch SE 3', 'Apple Watch SE (3rd generation)'], 'airpods-4': ['AirPods 4', 'AirPods (4th generation)'], 'airpods-5': ['AirPods 5', 'AirPods (5th generation)'],
  'airpods-pro-2': ['AirPods Pro 2', 'AirPods Pro (2nd generation)'], 'airpods-pro-3': ['AirPods Pro 3'], 'airpods-max-2': ['AirPods Max 2'],
  'macbook-air-m1': ['MacBook Air (M1)', 'MacBook Air (M1, 2020)'], 'macbook-pro-14-m5': ['MacBook Pro (M5)', 'MacBook Pro (14-inch, M5)'], 'macbook-pro-14-m6': ['MacBook Pro (M6)'],
  'macbook-pro-m5-pro': ['MacBook Pro (M5 Pro and M5 Max)', 'MacBook Pro (2026)'], 'imac-m4': ['iMac (M4)', 'iMac (24-inch, 2024)'], 'imac-m6': ['iMac (M6)'],
  'ipad-a16': ['iPad (A16)', 'iPad (11th generation)'], 'ipad-mini-a17': ['iPad mini (A17 Pro)', 'iPad mini (7th generation)'], 'ipad-mini-oled': ['iPad mini (8th generation)'],
  'ipad-air-m3': ['iPad Air (M3)'], 'ipad-air-m4': ['iPad Air (M4)'], 'ipad-pro-m4': ['iPad Pro (M4)'], 'ipad-pro-m5': ['iPad Pro (M5)'],
  'apple-watch-ultra-3': ['Apple Watch Ultra 3'], 'apple-watch-ultra-4': ['Apple Watch Ultra 4'], 'vision-pro-m5': ['Apple Vision Pro (M5)'], 'homeview': ['Apple HomeView', 'HomeView'],
  'apple-tv-4k-2026': ['Apple TV 4K (4th generation)', 'Apple TV 4K (2026)'], 'apple-pencil-pro': ['Apple Pencil Pro'], 'macbook-pro-oled': ['MacBook Pro (OLED)'],
};
const QUERIES = { 'macintosh-128k': 'Macintosh 128K', 'imac-g3': 'iMac G3', 'iphone-2007': 'iPhone 1st generation', 'ipad-2010': 'iPad 1st generation' };
export const photoQuery = (p) => QUERIES[p.id] || p.name.replace(/[()]/g, ' ').replace(/"/g, '').replace(/\s+/g, ' ').trim();

// strict = true (búsqueda de texto): el título debe contener el nombre del producto y ninguna otra variante.
// strict = false (categoría propia del producto en Commons): basta con que sea una foto válida y con licencia.
export function pickPhotos(pages, query, max = 8, strict = true) {
  const tokens = norm(query).split(' ').filter(Boolean);
  const squashedQuery = tokens.join('');
  const banned = VARIANTS.filter((v) => !tokens.includes(v));
  return Object.values(pages || {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((pg) => {
      const info = pg.imageinfo?.[0]; if (!info) return null;
      const title = norm(String(pg.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, ''));
      const words = title.split(' '), squashed = words.join('');
      const meta = info.extmetadata || {};
      const license = stripHtml(meta.LicenseShortName?.value);
      if (!/^image\/(jpeg|png|webp)$/.test(info.mime || '') || (info.width || 0) < 700 || !license || JUNK.test(title) || /[\u3040-\u30ff\u4e00-\u9fff]/.test(pg.title || '')) return null;
      if (banned.some((v) => words.includes(v) || squashed.includes(squashedQuery + v))) return null;
      if (strict && !(tokens.every((t) => words.includes(t)) || squashed.includes(squashedQuery))) return null;
      return {
        src: info.thumburl || info.url, full: info.url, page: info.descriptionurl,
        title: String(pg.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' '),
        author: stripHtml(meta.Artist?.value).slice(0, 80) || 'Autor no indicado', license, width: info.thumbwidth || info.width, height: info.thumbheight || info.height, local: false,
      };
    }).filter(Boolean)
    .sort((a, b) => Number(named(b.title)) - Number(named(a.title)))
    .slice(0, max);
  function named(t) { const sq = norm(t).replace(/ /g, ''); return sq.includes(squashedQuery); }
}

const IMAGE_PROPS = { prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '1280' };
const apiUrl = (params) => { const url = new URL('https://commons.wikimedia.org/w/api.php'); url.search = new URLSearchParams({ action: 'query', format: 'json', origin: '*', ...params, ...IMAGE_PROPS }); return url; };
// Archivos de la categoría del producto en Commons (p. ej. «Category:iPhone 17 Pro»).
export const commonsCategoryUrl = (query) => apiUrl({ generator: 'categorymembers', gcmtitle: `Category:${query}`, gcmtype: 'file', gcmlimit: '40' });
export const commonsUrl = (query) => apiUrl({ generator: 'search', gsrnamespace: '6', gsrsearch: `${query} filetype:bitmap`, gsrlimit: '40' });

// ---------- Imágenes oficiales de Apple Newsroom ----------
// El propietario del sitio declara tener permiso de Apple para usarlas. Se enlazan desde apple.com (no se copian)
// y se muestran con crédito a Apple y enlace a la nota de prensa.
const APPLE = 'https://www.apple.com/newsroom/';
export const applePressUrl = (product) => (APPLE_PRESS[product.id] ? APPLE + APPLE_PRESS[product.id][0] : null);
export function applePhotosFromHtml(html, product, max = 8) {
  const [slug, only] = APPLE_PRESS[product.id] || [];
  if (!slug) return [];
  const filter = only ? new RegExp(only, 'i') : null;
  const seen = new Set(), out = [];
  for (const m of String(html).matchAll(/\/newsroom\/images\/([^"'\s,)<>]+?\.(?:jpg|png))\.large\.jpg/g)) {
    const base = m[1], name = base.split('/').pop();
    if (seen.has(base)) continue; seen.add(base);
    if (/shot-on|photo-taken|taken-with|selfie|sample|-photo-|portrait-mode/i.test(name) || (filter && !filter.test(name))) continue;
    const title = name.replace(/\.(jpg|png)$/i, '').replace(/_(big|inline|Full-Bleed-Image|big_carousel)$/i, '').replace(/[-_]\d{6,8}$/, '').replace(/^Apple[-_]/i, '').replace(/[-_]+/g, ' ');
    out.push({ src: `${APPLE}images/${base}.large_2x.jpg`, full: `${APPLE}images/${base}.large_2x.jpg`, page: APPLE + slug, title, author: 'Apple', license: 'Apple Newsroom', local: false, apple: true });
    if (out.length >= max) break;
  }
  return out;
}

// Busca primero en la categoría del producto y, si no hay nada, por texto. `get` recibe una URL y devuelve el JSON.
export async function findPhotos(product, get, getText) {
  const press = applePressUrl(product);
  if (press && getText) {
    try { const list = applePhotosFromHtml(await getText(press), product); if (list.length) return { photos: list, via: 'Apple Newsroom' }; } catch { /* se intenta con Commons */ }
  }
  const query = photoQuery(product);
  const names = [...new Set([...(CATEGORIES[product.id] || []), query])];
  for (const name of names) {
    const list = pickPhotos((await get(commonsCategoryUrl(name)))?.query?.pages, query, 8, false);
    if (list.length) return { photos: list, via: `categoría «${name}»` };
  }
  const list = pickPhotos((await get(commonsUrl(query)))?.query?.pages, query);
  return { photos: list, via: list.length ? 'búsqueda' : 'nada' };
}
