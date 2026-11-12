// Construye la versión estática en ./dist para GitHub Pages:  node scripts/build-static.mjs
// Las noticias se generan aparte con scripts/fetch-news.mjs (lo hace el workflow antes de publicar).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRODUCTS } from '../server/data/products.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE = (process.env.SITE_URL || 'https://cuperttino.github.io').replace(/\/$/, '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });
// Motor en el navegador: mismos módulos que el servidor.
const local = path.join(DIST, 'js', 'local');
fs.mkdirSync(path.join(local, 'data'), { recursive: true });
for (const f of ['compare.js', 'advisor.js', 'search.js', 'photos-core.js']) fs.copyFileSync(path.join(ROOT, 'server', f), path.join(local, f));
fs.cpSync(path.join(ROOT, 'server', 'data'), path.join(local, 'data'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'scripts', 'static-backend.js'), path.join(DIST, 'js', 'backend.js'));

// Manifiesto de fotos propias (en estático no se puede listar una carpeta).
const fotos = {};
for (const d of fs.readdirSync(path.join(DIST, 'fotos'), { withFileTypes: true })) {
  if (d.isDirectory()) fotos[d.name] = fs.readdirSync(path.join(DIST, 'fotos', d.name)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
}
fs.writeFileSync(path.join(DIST, 'fotos', 'index.json'), JSON.stringify(fotos));

// Una página HTML por ruta, con su título y descripción (SEO y enlaces directos sin servidor).
const PAGES = {
  '/': ['Pomar · El huerto de los aficionados a Apple', 'Actualidad, enciclopedia de productos, comparador honesto y gestor de tu ecosistema Apple. Web independiente, no afiliada a Apple.'],
  '/actualidad': ['Actualidad Apple · Pomar', 'Noticias oficiales, rumores y análisis de Apple, con fuente y fecha, enlazados al artículo original.'],
  '/enciclopedia': ['Enciclopedia de productos Apple · Pomar', 'Fichas técnicas, fotografías y valoración honesta de iPhone, iPad, Mac, Apple Watch, AirPods y más.'],
  '/comparar': ['Comparador de productos Apple · Pomar', 'Enfrenta hasta cuatro productos Apple y recibe un veredicto razonado.'],
  '/ecosistema': ['Mi ecosistema · Pomar', 'Registra tus dispositivos Apple y recibe consejos honestos sobre qué actualizar y cuándo.'],
  '/descubrir': ['Descubrir Apple · Pomar', 'Historia, Apple Silicon, evolución del diseño del iPhone, trucos y curiosidades.'],
  '/sistemas': ['Sistemas operativos de Apple · Pomar', 'iOS, iPadOS, macOS, watchOS, visionOS y tvOS: versión actual e hitos.'],
  '/cuenta': ['Perfil · Pomar', 'Tu perfil local de Pomar.'], '/acerca': ['Cómo trabajamos · Pomar', 'Las reglas de Pomar: fuentes, fichas, fotografías y veredictos.'],
};
for (const p of PRODUCTS) PAGES[`/producto/${p.id}`] = [`${p.name} (${p.year}): ficha, fotos y opinión · Pomar`, `${p.name}: ${[p.chip, p.display].filter(Boolean).join(' · ')}. ${p.buy?.text || ''}`.slice(0, 180)];
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const CSP = "default-src 'self'; img-src 'self' data: https://upload.wikimedia.org; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://commons.wikimedia.org; base-uri 'self'; form-action 'self'";
const page = (route, [title, desc]) => template.replace('<!--META-->', `<title>${esc(title)}</title>\n  <meta name="description" content="${esc(desc)}">\n  <link rel="canonical" href="${esc(SITE + route)}">\n  <meta property="og:title" content="${esc(title)}">\n  <meta property="og:description" content="${esc(desc)}">\n  <meta property="og:type" content="website">\n  <meta http-equiv="Content-Security-Policy" content="${CSP}">`);
// GitHub Pages sirve /ruta desde ruta.html sin redirecciones (así se conservan los parámetros ?ids=…).
for (const [route, meta] of Object.entries(PAGES)) {
  const file = route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, `${route}.html`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, page(route, meta));
}
fs.writeFileSync(path.join(DIST, '404.html'), page('/', PAGES['/']));
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(PAGES).filter((r) => r !== '/cuenta').map((r) => `  <url><loc>${esc(SITE + r)}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
if (!fs.existsSync(path.join(DIST, 'news.json'))) fs.writeFileSync(path.join(DIST, 'news.json'), JSON.stringify({ items: [], sources: [], fetchedAt: null }));
console.log(`Sitio estático listo en dist/ (${Object.keys(PAGES).length} páginas).`);
