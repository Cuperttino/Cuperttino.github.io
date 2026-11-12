// Localiza en Wikimedia Commons las fotos de cada producto y escribe dist/fotos/commons.json.
// Lo ejecuta GitHub Actions al publicar. Reutiliza el resultado anterior durante 7 días para no repetir consultas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS } from '../server/data/products.js';
import { findPhotos } from '../server/photos-core.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.SITE_URL || 'https://cuperttino.github.io').replace(/\/$/, '');
const OUT = path.join(ROOT, 'dist', 'fotos', 'commons.json');
const FORCE = process.env.PHOTOS_FORCE === '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Pomar/1.0 (https://cuperttino.github.io; galeria de productos)', Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

let prev = null;
if (!FORCE) { try { prev = await fetch(`${SITE}/fotos/commons.json`, { signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.json() : null)); } catch { /* primera vez */ } }
const fresh = prev && prev.version === 3 && Date.now() - prev.at < 7 * 86_400_000;
const pages = new Map();
const getText = async (url) => {
  if (!pages.has(url)) pages.set(url, fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Pomar/1.0; +https://cuperttino.github.io)', Accept: 'text/html' } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))));
  return pages.get(url);
};
const products = {};
let withPhotos = 0, errors = 0;
for (const p of PRODUCTS) {
  if (fresh && prev.products?.[p.id]?.length) { products[p.id] = prev.products[p.id]; withPhotos++; continue; }
  try {
    const { photos, via } = await findPhotos(p, get, getText);
    products[p.id] = photos; if (photos.length) withPhotos++;
    console.log(`${String(photos.length).padStart(2)} fotos · ${p.id} · ${via}${photos[0] ? ` · ${photos[0].title}` : ''}`);
  } catch (err) { errors++; console.log(` ! error · ${p.id} · ${err.message}`); if (prev?.products?.[p.id]) products[p.id] = prev.products[p.id]; }
  await sleep(250);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ version: 3, at: fresh ? prev.at : Date.now(), products }));
console.log(`Fotos: ${withPhotos} de ${PRODUCTS.length} productos con galería. Errores: ${errors}.`);
