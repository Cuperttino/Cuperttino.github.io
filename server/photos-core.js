// Lógica pura de la galería (sin dependencias de Node): se usa en el servidor y en la versión estática.
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
// Variantes de modelo: si no están en el nombre buscado, no deben aparecer en el título de la foto
// (evita que «iPhone 17» muestre fotos del «iPhone 17 Pro Max»).
const VARIANTS = ['pro', 'max', 'plus', 'mini', 'air', 'ultra', 'se', 'neo', 'studio', 'duo'];
const JUNK = /\b(logo|icon|wordmark|screenshot|diagram|chart|graph|map|box|case|cover|funda|advert|keynote|store|event|queue)\b/;

// Nombres alternativos de categoría en Commons para productos cuyo nombre en Pomar no coincide.
const CATEGORIES = {};
const QUERIES = { 'macintosh-128k': 'Macintosh 128K', 'imac-g3': 'iMac G3' };
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
      if (!/^image\/(jpeg|png|webp)$/.test(info.mime || '') || (info.width || 0) < 700 || !license || JUNK.test(title)) return null;
      if (banned.some((v) => words.includes(v) || squashed.includes(squashedQuery + v))) return null;
      if (strict && !(tokens.every((t) => words.includes(t)) || squashed.includes(squashedQuery))) return null;
      return {
        src: info.thumburl || info.url, full: info.url, page: info.descriptionurl,
        title: String(pg.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' '),
        author: stripHtml(meta.Artist?.value).slice(0, 80) || 'Autor no indicado', license, width: info.thumbwidth || info.width, height: info.thumbheight || info.height, local: false,
      };
    }).filter(Boolean).slice(0, max);
}

const IMAGE_PROPS = { prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '1280' };
const apiUrl = (params) => { const url = new URL('https://commons.wikimedia.org/w/api.php'); url.search = new URLSearchParams({ action: 'query', format: 'json', origin: '*', ...params, ...IMAGE_PROPS }); return url; };
// Archivos de la categoría del producto en Commons (p. ej. «Category:iPhone 17 Pro»).
export const commonsCategoryUrl = (query) => apiUrl({ generator: 'categorymembers', gcmtitle: `Category:${query}`, gcmtype: 'file', gcmlimit: '40' });
export const commonsUrl = (query) => apiUrl({ generator: 'search', gsrnamespace: '6', gsrsearch: `${query} filetype:bitmap`, gsrlimit: '40' });

// Busca primero en la categoría del producto y, si no hay nada, por texto. `get` recibe una URL y devuelve el JSON.
export async function findPhotos(product, get) {
  const query = photoQuery(product);
  const names = [...new Set([query, ...(CATEGORIES[product.id] || [])])];
  for (const name of names) {
    const list = pickPhotos((await get(commonsCategoryUrl(name)))?.query?.pages, query, 8, false);
    if (list.length) return { photos: list, via: `categoría «${name}»` };
  }
  const list = pickPhotos((await get(commonsUrl(query)))?.query?.pages, query);
  return { photos: list, via: list.length ? 'búsqueda' : 'nada' };
}
