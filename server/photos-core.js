// Lógica pura de la galería (sin dependencias de Node): se usa en el servidor y en la versión estática.
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
// Variantes de modelo: si no están en el nombre buscado, no deben aparecer en el título de la foto
// (evita que «iPhone 17» muestre fotos del «iPhone 17 Pro Max»).
const VARIANTS = ['pro', 'max', 'plus', 'mini', 'air', 'ultra', 'se', 'neo', 'studio', 'duo'];
const JUNK = /\b(logo|icon|wordmark|screenshot|diagram|chart|graph|map|box|case|cover|funda|advert|keynote|store|event|queue)\b/;

const QUERIES = { 'macintosh-128k': 'Macintosh 128K', 'imac-g3': 'iMac G3' };
export const photoQuery = (p) => QUERIES[p.id] || p.name.replace(/[()]/g, ' ').replace(/"/g, '').replace(/\s+/g, ' ').trim();

export function pickPhotos(pages, query, max = 8) {
  const tokens = norm(query).split(' ').filter(Boolean);
  const banned = VARIANTS.filter((v) => !tokens.includes(v));
  return Object.values(pages || {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((pg) => {
      const info = pg.imageinfo?.[0]; if (!info) return null;
      const title = norm(String(pg.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, ''));
      const words = title.split(' ');
      const meta = info.extmetadata || {};
      const license = stripHtml(meta.LicenseShortName?.value);
      if (!/^image\/(jpeg|png|webp)$/.test(info.mime || '') || (info.width || 0) < 800 || !license) return null;
      if (!tokens.every((t) => words.includes(t)) || banned.some((v) => words.includes(v)) || JUNK.test(title)) return null;
      return {
        src: info.thumburl || info.url, full: info.url, page: info.descriptionurl,
        title: String(pg.title || '').replace(/^File:/i, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' '),
        author: stripHtml(meta.Artist?.value).slice(0, 80) || 'Autor no indicado', license, width: info.thumbwidth || info.width, height: info.thumbheight || info.height, local: false,
      };
    }).filter(Boolean).slice(0, max);
}


export function commonsUrl(query) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrnamespace: '6', gsrsearch: `${query} filetype:bitmap`, gsrlimit: '30', prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size', iiurlwidth: '1280' });
  return url;
}
