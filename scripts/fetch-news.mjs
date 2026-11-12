// Descarga los feeds reales y escribe dist/news.json. Lo ejecuta GitHub Actions antes de publicar.
// Si una fuente falla, se conserva su última copia tomada del sitio ya publicado.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.SITE_URL || 'https://cuperttino.github.io').replace(/\/$/, '');
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
try {
  const prev = await fetch(`${SITE}/news.json`, { signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.json() : null));
  if (prev?.items?.length) fs.writeFileSync(path.join(ROOT, 'data', 'news-cache.json'), JSON.stringify({ items: prev.items, sources: Object.fromEntries((prev.sources || []).map((s) => [s.id, s])), fetchedAt: prev.fetchedAt || 0 }));
} catch { /* primera publicación o sitio no accesible */ }

const { refresh, newsStatus } = await import('../server/news.js');
const state = await refresh();
const out = { items: state.items.slice(0, 200), sources: newsStatus(), fetchedAt: state.fetchedAt };
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dist', 'news.json'), JSON.stringify(out));
for (const s of out.sources) console.log(`${s.ok ? 'OK ' : 'FALLO'} ${s.name}: ${s.count} titulares${s.error ? ` (${s.error})` : ''}`);
if (!out.items.length) console.warn('Aviso: no se obtuvo ningún titular.');
