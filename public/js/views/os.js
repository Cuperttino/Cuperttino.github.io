import { html, api, icon } from '../lib.js';
import { story } from '../ui.js';

export default async function os({ el }) {
  const [{ systems }, news] = await Promise.all([api('/api/os'), api('/api/news?topic=Software&limit=6').catch(() => ({ items: [] }))]);
  el.innerHTML = html`<div class="wrap">
    <header class="page-head"><span class="eyebrow" data-reveal>Sistemas operativos</span><h1 class="h1" data-split>El software que da sentido al hardware</h1>
      <p class="lede" data-reveal style="--d:300ms">Versión vigente e hitos de cada plataforma. Para las actualizaciones puntuales, consulta las noticias al final: llegan en directo desde las fuentes.</p></header>
    ${systems.map((s) => html`<section class="section--tight" id="${s.id}" style="border-top:1px solid var(--line)" aria-labelledby="h-${s.id}">
      <div class="grid grid--2" style="gap:clamp(24px,5vw,72px)">
        <div data-reveal><span class="tag">${s.device} · desde ${s.since}</span><h2 class="h1" id="h-${s.id}" style="margin:16px 0 8px">${s.name}</h2><p class="lede">${s.note}</p><p style="margin-top:16px"><span class="tag tag--oficial">Versión actual: ${s.current}</span></p></div>
        <ol class="timeline" style="margin-top:8px">${s.history.map(([y, name, text]) => html`<li class="tl" data-reveal style="grid-template-columns:70px 1fr;padding:14px 0"><span class="tl__year" style="font-size:1.2rem">${y}</span><div><h3 style="font-size:1.1rem">${name}</h3><p class="small">${text}</p></div></li>`)}</ol>
      </div></section>`)}
    <section class="section" aria-labelledby="h-osn"><div class="section__head"><div><span class="eyebrow">En directo</span><h2 class="h2" id="h-osn" data-split>Últimas noticias de software</h2></div><a class="link" href="/actualidad?tema=Software">Ver todas ${icon('arrow')}</a></div>
      ${news.items.length ? html`<div data-stagger>${news.items.map((n) => story(n, 'compact'))}</div>` : html`<p class="muted">Sin conexión con las fuentes en este momento.</p>`}</section>
  </div>`;
  return 'Sistemas operativos de Apple';
}
