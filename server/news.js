// Noticias reales mediante los feeds RSS/Atom públicos de cada medio.
// - Solo se guarda titular, extracto breve, fecha, fuente y enlace al original.
// - No se descargan ni se muestran imágenes de los medios (no hay autorización para ello).
// - Caché en memoria y en disco; si un feed falla se sirve la última copia válida.
import fs from 'node:fs';
import path from 'node:path';
import { config, DATA_DIR } from './config.js';

export const SOURCES = [
  { id: 'apple', name: 'Apple Newsroom', official: true, url: 'https://www.apple.com/es/newsroom/rss-feed.rss', site: 'https://www.apple.com/es/newsroom/' },
  { id: 'macrumors', name: 'MacRumors', url: 'https://feeds.macrumors.com/MacRumors-All', site: 'https://www.macrumors.com/' },
  { id: '9to5mac', name: '9to5Mac', url: 'https://9to5mac.com/feed/', site: 'https://9to5mac.com/' },
  { id: 'appleinsider', name: 'AppleInsider', url: 'https://appleinsider.com/rss/news/', site: 'https://appleinsider.com/' },
  { id: 'macworld', name: 'Macworld', url: 'https://www.macworld.com/feed', site: 'https://www.macworld.com/' },
];

const CACHE_FILE = path.join(DATA_DIR, 'news-cache.json');
let state = { items: [], sources: {}, fetchedAt: 0 };
try { state = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { /* sin caché previa */ }
let refreshing = null;

// ---------- Análisis de XML (RSS 2.0 y Atom) sin dependencias ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—' };
export function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}
const strip = (html) => decode(decode(html)).replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1].trim() : '';
};
const tags = (xml, name) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi'))].map((m) => m[1].trim());

// Quita parámetros de seguimiento (utm_*) del enlace.
function cleanLink(link) {
  try { const u = new URL(link); [...u.searchParams.keys()].filter((k) => /^utm_/i.test(k)).forEach((k) => u.searchParams.delete(k)); return u.toString(); } catch { return link; }
}

export function parseFeed(xml) {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blocks = [...xml.matchAll(isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]);
  return blocks.map((b) => {
    let link = '';
    if (isAtom) {
      // Enlace del artículo: rel="alternate" o sin rel (se ignoran enclosure, self, etc.).
      const links = [...b.matchAll(/<link\b([^>]*)>/gi)].map((m) => m[1]);
      const pick = links.find((a) => /rel=["']alternate["']/i.test(a)) || links.find((a) => !/\brel=/i.test(a));
      link = pick?.match(/href=["']([^"']+)["']/i)?.[1] || '';
    } else {
      link = strip(tag(b, 'link')) || strip(tag(b, 'guid'));
    }
    const date = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date');
    const categories = isAtom
      ? [...b.matchAll(/<category[^>]*term=["']([^"']+)["']/gi)].map((m) => decode(m[1]))
      : tags(b, 'category').map(strip);
    const text = strip(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content') || tag(b, 'content:encoded'));
    return {
      title: strip(tag(b, 'title')),
      link: cleanLink(decode(link).trim()),
      date: date ? new Date(strip(date)).toISOString() : null,
      excerpt: text.length > 200 ? text.slice(0, 197).replace(/\s+\S*$/, '') + '…' : text,
      categories,
    };
  }).filter((i) => i.title && /^https?:\/\//.test(i.link) && i.date && i.date !== 'Invalid Date');
}

// ---------- Clasificación ----------
// Tipo: oficial (solo Apple Newsroom), rumor, opinión/análisis o noticia.
const RUMOR = /\b(rumou?r(ed|s)?|leak(ed|s)?|reportedly|allegedly|said to|tipped|expected to|could (launch|get|feature|arrive)|might|may (launch|get|feature)|gurman|kuo|supply chain|analyst|prototype|sources? (say|claim)|planning|in the works|roadmap)\b/i;
const OPINION = /\b(review(ed|s)?|hands[- ]on|opinion|editorial|vs\.?|worth (it|buying)|should you|why (i|you|apple)|here'?s why|i (tried|spent|used)|best |buyer'?s guide|tested)\b/i;
const TOPICS = [
  ['iPhone', /\biphone|ios\b/i], ['iPad', /\bipad(os)?\b/i], ['Mac', /\bmac(book|os| mini| studio| pro)?\b|imac/i],
  ['Apple Watch', /\bapple watch|watchos\b/i], ['AirPods', /\bairpods|beats\b/i], ['Vision', /\bvision ?(pro|os)\b/i],
  ['Hogar', /\bhomepod|apple tv|tvos|homekit|homeview\b/i],
  ['Software', /\b(i|ipad|mac|watch|tv|vision)os\b|\bbeta\b|\bupdate\b|\bapp store\b/i],
  ['Servicios', /\bapple (tv\+|music|arcade|pay|card|fitness|news)\b|icloud/i],
  ['Ofertas', /\b(deals?|black friday|cyber monday|discount|sale|price drop|lowest price|\$\d+ off)\b/i],
  ['Empresa', /\b(earnings|lawsuit|antitrust|ceo|ternus|cook|shares|revenue|regulat|court|eu\b|doj)\b/i],
];

export function classify(item, source) {
  const hay = `${item.title} ${item.categories.join(' ')}`;
  let kind = 'noticia';
  if (source.official) kind = 'oficial';
  else if (RUMOR.test(hay)) kind = 'rumor';
  else if (OPINION.test(hay)) kind = 'opinion';
  const topics = TOPICS.filter(([, re]) => re.test(hay)).map(([t]) => t);
  return { kind, topics: topics.length ? topics : ['General'] };
}

// ---------- Descarga con caché ----------
async function fetchSource(source) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(source.url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Pomar/1.0 (lector RSS personal)', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseFeed(await res.text());
    if (!items.length) throw new Error('El feed no contiene entradas legibles');
    return items.slice(0, 40).map((i) => ({
      id: Buffer.from(i.link).toString('base64url').slice(-40),
      ...i, ...classify(i, source), source: source.id, sourceName: source.name,
    }));
  } finally { clearTimeout(timer); }
}

export async function refresh() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const results = await Promise.allSettled(SOURCES.map(fetchSource));
    const now = Date.now();
    const sources = {};
    let items = [];
    results.forEach((r, i) => {
      const src = SOURCES[i];
      if (r.status === 'fulfilled') {
        sources[src.id] = { ok: true, count: r.value.length, fetchedAt: now };
        items.push(...r.value);
      } else {
        // Se conserva la última copia buena de esa fuente y se anota el error.
        const stale = state.items.filter((it) => it.source === src.id);
        sources[src.id] = { ok: false, error: String(r.reason?.message || r.reason), count: stale.length, fetchedAt: state.sources[src.id]?.fetchedAt || null };
        items.push(...stale);
      }
    });
    const seen = new Set();
    items = items.filter((i) => !seen.has(i.link) && seen.add(i.link)).sort((a, b) => b.date.localeCompare(a.date));
    state = { items, sources, fetchedAt: now };
    try { fs.writeFileSync(CACHE_FILE, JSON.stringify(state)); } catch { /* la caché en disco es opcional */ }
    return state;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

export async function getNews() {
  const stale = Date.now() - state.fetchedAt > config.newsTtlMs;
  if (!state.fetchedAt) await refresh();          // primera vez: esperamos
  else if (stale) refresh().catch(() => {});      // después: se sirve la caché y se refresca en segundo plano
  return state;
}

export function startNewsScheduler() {
  refresh().catch(() => {});
  setInterval(() => refresh().catch(() => {}), config.newsTtlMs).unref();
}

export function newsStatus() {
  return SOURCES.map((s) => ({ id: s.id, name: s.name, site: s.site, official: !!s.official, ...(state.sources[s.id] || { ok: null, count: 0 }) }));
}
