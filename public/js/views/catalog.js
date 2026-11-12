import { html, getCatalog, icon, debounce } from '../lib.js';
import { productCard } from '../ui.js';
import { scan } from '../motion.js';

const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default async function catalog({ el, query }) {
  const { families, products } = await getCatalog();
  const state = { family: query.get('familia') || '', status: '', q: '' };
  el.innerHTML = html`
  <div class="wrap">
    <header class="page-head"><span class="eyebrow" data-reveal>Enciclopedia</span><h1 class="h1" data-split>${products.length} productos, del Macintosh al iPhone Duo</h1>
      <p class="lede" data-reveal style="--d:300ms">Cada ficha reúne especificaciones contrastadas, una galería de fotos y una valoración sincera de si merece la pena hoy. Cuando un dato no está verificado, lo decimos.</p></header>
    <div class="toolbar" data-reveal>
      <div class="field">${icon('search')}<input class="input" id="cat-q" type="search" placeholder="Filtrar por nombre, chip o año…" aria-label="Filtrar productos"></div>
      <select class="select" id="cat-status" style="max-width:220px" aria-label="Filtrar por estado"><option value="">Cualquier época</option><option value="actual">En catálogo</option><option value="anterior">Generación anterior</option><option value="historico">Históricos</option></select>
    </div>
    <div class="chips chips--scroll" id="cat-fam" role="group" aria-label="Familia de producto"><button class="chip" type="button" data-fam="" aria-pressed="${!state.family}">Todas</button>${families.filter((f) => products.some((p) => p.family === f)).map((f) => html`<button class="chip" type="button" data-fam="${f}" aria-pressed="${state.family === f}">${f}</button>`)}</div>
    <div id="cat-list" style="padding-bottom:40px"></div>
  </div>`;
  const list = el.querySelector('#cat-list');
  function draw() {
    const terms = norm(state.q).split(/\s+/).filter(Boolean);
    const shown = products.filter((p) => (!state.family || p.family === state.family) && (!state.status || p.status === state.status) && terms.every((t) => norm(`${p.name} ${p.family} ${p.chip || ''} ${p.year} ${p.gen}`).includes(t)));
    const groups = families.map((f) => [f, shown.filter((p) => p.family === f).sort((a, b) => b.released.localeCompare(a.released))]).filter(([, l]) => l.length);
    list.innerHTML = groups.length
      ? html`${groups.map(([f, l]) => html`<h2 class="family-title h2">${f}<span>${l.length} ${l.length === 1 ? 'ficha' : 'fichas'}</span></h2><div class="grid grid--4" data-stagger>${l.map(productCard)}</div>`)}`
      : html`<div class="empty" style="margin-top:32px"><p class="h3">Ningún producto coincide</p><p>Prueba con otro término o quita los filtros.</p></div>`;
    scan(list);
  }
  el.querySelector('#cat-fam').addEventListener('click', (e) => { const b = e.target.closest('[data-fam]'); if (!b) return; state.family = b.dataset.fam; el.querySelectorAll('[data-fam]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw(); });
  el.querySelector('#cat-status').addEventListener('change', (e) => { state.status = e.target.value; draw(); });
  el.querySelector('#cat-q').addEventListener('input', debounce((e) => { state.q = e.target.value; draw(); }, 120));
  draw();
  return 'Enciclopedia de productos Apple';
}
