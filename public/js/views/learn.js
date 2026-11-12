import { html, api, getCatalog, icon } from '../lib.js';
import { mountGallery } from '../ui.js';

const SECTIONS = [['historia', 'Historia'], ['diseno', 'Diseño del iPhone'], ['silicon', 'Apple Silicon'], ['generaciones', 'Entre generaciones'], ['tecnologias', 'Tecnologías'], ['trucos', 'Trucos'], ['curiosidades', 'Curiosidades']];
const GEN = [['iphone-13', 'iphone-17'], ['iphone-14-pro', 'iphone-18-pro'], ['macbook-air-m1', 'macbook-air-m5'], ['airpods-pro-2', 'airpods-pro-3'], ['apple-watch-2015', 'apple-watch-series-12'], ['ipad-2010', 'ipad-a16']];

export default async function learn({ el }) {
  const [d, { products }] = await Promise.all([api('/api/learn'), getCatalog()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const steps = d.iphoneDesign.filter((s) => byId.has(s.productId));
  let osFilter = '';

  el.innerHTML = html`
  <div class="wrap"><header class="page-head"><span class="eyebrow" data-reveal>Descubrir</span><h1 class="h1" data-split>Medio siglo de ideas, chips y obsesiones</h1>
    <p class="lede" data-reveal style="--d:300ms">Historia, diseño, tecnologías poco conocidas y trucos para sacar más partido a lo que ya tienes.</p></header></div>
  <nav class="anchors" aria-label="Secciones"><div class="wrap"><div class="chips chips--scroll">${SECTIONS.map(([id, label]) => html`<a class="chip" style="display:inline-flex;align-items:center" href="#${id}">${label}</a>`)}</div></div></nav>

  <section class="section wrap" id="historia" aria-labelledby="h-historia">
    <div class="section__head"><div><span class="eyebrow">Hitos de la compañía</span><h2 class="h2" id="h-historia" data-split>De 1976 a hoy</h2></div></div>
    <ol class="timeline">${d.timeline.map((t) => html`<li class="tl" data-reveal><span class="tl__year">${t.year}</span><div><h3>${t.title}</h3><p>${t.text}</p>
      ${t.productId && byId.has(t.productId) ? html`<a class="link" href="/producto/${t.productId}">Ver la ficha de ${byId.get(t.productId).name} ${icon('arrow')}</a>` : ''}${t.source ? html` <a class="link" href="${t.source.url}" target="_blank" rel="noopener noreferrer">Fuente: ${t.source.label} ${icon('external')}</a>` : ''}</div></li>`)}</ol>
  </section>

  <section class="section section--alt" id="diseno" aria-labelledby="h-diseno"><div class="wrap">
    <div class="section__head"><div><span class="eyebrow">Interactivo</span><h2 class="h2" id="h-diseno" data-split>La evolución del diseño del iPhone</h2></div><p class="muted small" style="max-width:40ch">Elige una etapa para ver sus fotos y abrir la ficha completa.</p></div>
    <div class="design">
      <div data-reveal><div class="viewer viewer--flat" id="design-gallery"></div><p style="margin-top:12px"><a class="link" id="design-link" href="/producto/${steps[0]?.productId}">Abrir la ficha ${icon('arrow')}</a></p></div>
      <div class="design__steps" role="group" aria-label="Etapas del diseño">${steps.map((s, i) => { const p = byId.get(s.productId); return html`<button type="button" data-step="${i}" aria-pressed="${i === 0}"><b>${p.year}</b><div><strong>${s.title}</strong><span>${p.name}. ${s.text}</span></div></button>`; })}</div>
    </div>
  </div></section>

  <section class="section wrap" id="silicon" aria-labelledby="h-silicon">
    <div class="section__head"><div><span class="eyebrow">Procesadores</span><h2 class="h2" id="h-silicon" data-split>Historia de Apple Silicon</h2></div></div>
    <div class="chipline" data-stagger>${d.silicon.map((c) => html`<div><small>${c.year}</small><b>${c.chip}</b><p>${c.text}</p>${c.source ? html`<a class="link small" style="margin-top:8px" href="${c.source.url}" target="_blank" rel="noopener noreferrer">${c.source.label} ${icon('external')}</a>` : ''}</div>`)}</div>
  </section>

  <section class="section section--alt" id="generaciones" aria-labelledby="h-gen"><div class="wrap">
    <div class="section__head"><div><span class="eyebrow">Comparativas</span><h2 class="h2" id="h-gen" data-split>Cuánto ha cambiado cada producto</h2></div></div>
    <div class="grid grid--3" data-stagger>${GEN.filter(([a, b]) => byId.has(a) && byId.has(b)).map(([a, b]) => html`<a class="card fact" href="/comparar?ids=${a},${b}"><span class="tag">${byId.get(a).year} → ${byId.get(b).year}</span><h3>${byId.get(a).name} frente a ${byId.get(b).name}</h3><p class="link" style="margin-top:10px">Abrir comparativa ${icon('arrow')}</p></a>`)}</div>
  </div></section>

  <section class="section wrap" id="tecnologias" aria-labelledby="h-tec">
    <div class="section__head"><div><span class="eyebrow">Bajo el capó</span><h2 class="h2" id="h-tec" data-split>Tecnologías poco conocidas</h2></div></div>
    <div class="grid grid--3" data-stagger>${d.tech.map((t) => html`<article class="card fact"><h3>${t.title}</h3><p>${t.text}</p></article>`)}</div>
  </section>

  <section class="section section--alt" id="trucos" aria-labelledby="h-trucos"><div class="wrap">
    <div class="section__head"><div><span class="eyebrow">Funciones ocultas</span><h2 class="h2" id="h-trucos" data-split>Trucos de iOS y macOS</h2></div>
      <div class="chips" role="group" aria-label="Sistema">${[['', 'Todos'], ['iOS', 'iOS'], ['macOS', 'macOS']].map(([v, l]) => html`<button class="chip" type="button" data-os="${v}" aria-pressed="${v === ''}">${l}</button>`)}</div></div>
    <div class="grid grid--3" id="tips">${d.tips.map((t) => html`<article class="card fact" data-tip="${t.os}" data-reveal><span class="tag">${t.os}</span><h3>${t.title}</h3><p>${t.text}</p></article>`)}</div>
  </div></section>

  <section class="section wrap" id="curiosidades" aria-labelledby="h-cur">
    <div class="section__head"><div><span class="eyebrow">Para la sobremesa</span><h2 class="h2" id="h-cur" data-split>Curiosidades históricas</h2></div></div>
    <div class="grid grid--4" data-stagger>${d.trivia.map((t) => html`<article class="card fact"><h3>${t.title}</h3><p>${t.text}</p></article>`)}</div>
  </section>`;

  el.querySelector('#trucos .chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-os]'); if (!b) return; osFilter = b.dataset.os;
    el.querySelectorAll('[data-os]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    el.querySelectorAll('[data-tip]').forEach((c) => { c.hidden = !!osFilter && c.dataset.tip !== osFilter; });
  });

  // Las fotos de la etapa se cargan cuando la sección entra en pantalla (no antes).
  const host = el.querySelector('#design-gallery');
  let current = -1, seen = false;
  const showStep = (i) => { if (i === current) return; current = i; const p = byId.get(steps[i].productId); el.querySelector('#design-link').href = `/producto/${p.id}`; mountGallery(host, p, { thumbs: false }); };
  const io = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) return; io.disconnect(); seen = true; showStep(0); }, { rootMargin: '200px' });
  if (steps.length) io.observe(host);
  el.querySelector('.design__steps').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]'); if (!b) return;
    el.querySelectorAll('[data-step]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (seen) showStep(Number(b.dataset.step));
  });
  return 'Descubrir Apple';
}
