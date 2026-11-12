import { html, api, icon, timeAgo, getCatalog, session } from '../lib.js';
import { story, productCard, kindTag, mountGallery, sourcesLine } from '../ui.js';

const FEATURED = ['iphone-17-pro', 'iphone-air', 'macbook-air-m4', 'apple-watch-ultra-3'];
const settle = (p) => p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e }));

export default async function home({ el }) {
  const [news, cat, up, os, learn] = await Promise.all([settle(api('/api/news?limit=80')), settle(getCatalog()), settle(api('/api/upcoming')), settle(api('/api/os')), settle(api('/api/learn'))]);
  const items = news.ok ? news.v.items : [];
  const sources = news.ok ? news.v.sources : [];
  const live = sources.filter((s) => s.ok).length;
  const latest = items.filter((i) => i.kind === 'oficial' || i.kind === 'noticia');
  const rumors = items.filter((i) => i.kind === 'rumor').slice(0, 4);
  const opinion = items.filter((i) => i.kind === 'opinion').slice(0, 4);
  const software = items.filter((i) => i.topics.includes('Software')).slice(0, 3);
  const products = cat.ok ? cat.v.products : [];
  const picks = ['iphone-17', 'iphone-duo', 'macbook-air-m5', 'macbook-neo', 'ipad-air-m4', 'apple-watch-series-12', 'airpods-pro-3', 'mac-mini-m6'].map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const history = learn.ok ? learn.v.timeline.filter((t) => [1976, 1984, 2007, 2020].includes(t.year)) : [];

  el.innerHTML = html`
  <section class="wrap hero">
    <div class="hero__copy">
      <span class="eyebrow" data-reveal>Web independiente para aficionados a Apple</span>
      <h1 class="display" data-split>Todo Apple, contado con criterio.</h1>
      <p class="lede" data-reveal style="--d:380ms">Actualidad con fuente y fecha, una enciclopedia que distingue el dato del rumor, un comparador que no siempre recomienda lo más caro y un asesor que sabe decirte «no lo cambies».</p>
      <div class="hero__cta" data-reveal style="--d:480ms">
        <a class="btn btn--magnetic" href="/enciclopedia">Explorar la enciclopedia ${icon('arrow')}</a>
        <a class="btn btn--ghost" href="/comparar">Comparar dispositivos</a>
      </div>
    </div>
    <div class="hero__media" data-reveal style="--d:200ms">
      <div class="viewer viewer--hero" id="hero-gallery"></div>
      <a class="hero__caption glass" id="hero-caption" href="/enciclopedia" hidden></a>
    </div>
  </section>

  <div class="ticker"><div class="wrap ticker__row" data-reveal>
    <span class="ticker__dot ${live ? '' : 'ticker__dot--off'}" aria-hidden="true"></span>
    ${live ? html`<span><strong>${items.length} titulares</strong> de ${live} ${live === 1 ? 'fuente conectada' : 'fuentes conectadas'}</span><span>Actualizado ${timeAgo(new Date(news.v.fetchedAt).toISOString())}</span>`
      : html`<span><strong>Sin conexión con las fuentes de noticias.</strong> ${items.length ? 'Se muestra la última copia guardada.' : 'Se reintentará automáticamente.'}</span>`}
    <a class="link" href="/actualidad" style="margin-left:auto">Toda la actualidad ${icon('arrow')}</a>
  </div></div>

  <section class="section wrap" aria-labelledby="h-news">
    <div class="section__head"><div><span class="eyebrow">Actualidad</span><h2 class="h2" id="h-news" data-split>Lo último del universo Apple</h2></div>${sources.length ? sourcesLine(sources) : ''}</div>
    ${latest.length ? html`<div class="news-lead">
      <div data-reveal>${story(latest[0], 'lead')}</div>
      <div data-stagger>${latest.slice(1, 5).map((n) => story(n, 'compact'))}</div>
    </div>` : html`<div class="empty"><p class="h3">Todavía no hay titulares</p><p>${news.ok ? 'No se ha podido conectar con ninguna fuente. Pomar no muestra noticias de ejemplo: cuando haya conexión aparecerán aquí las reales.' : news.e.message}</p></div>`}
    ${rumors.length || opinion.length ? html`<div class="grid grid--2" style="margin-top:56px;gap:clamp(24px,4vw,64px)">
      <div><div class="section__head" style="margin-bottom:8px"><h3 class="h3">Rumores y filtraciones</h3>${kindTag('rumor')}</div><p class="small muted" style="margin-bottom:12px">Información no confirmada por Apple. Tómala con cautela.</p><div data-stagger>${rumors.map((n) => story(n, 'compact'))}</div></div>
      <div><div class="section__head" style="margin-bottom:8px"><h3 class="h3">Análisis y opinión</h3>${kindTag('opinion')}</div><p class="small muted" style="margin-bottom:12px">Reseñas y columnas de los medios, enlazadas a su original.</p><div data-stagger>${opinion.map((n) => story(n, 'compact'))}</div></div>
    </div>` : ''}
  </section>

  ${up.ok ? html`<section class="section section--alt" aria-labelledby="h-up"><div class="wrap">
    <div class="section__head"><div><span class="eyebrow">Calendario</span><h2 class="h2" id="h-up" data-split>Próximos lanzamientos</h2></div></div>
    <div class="grid grid--3" data-stagger>${up.v.upcoming.map((u) => html`<article class="card upcoming">
      ${kindTag(u.kind)}<time>${u.when}</time><h3 class="h3">${u.title}</h3><p>${u.text}</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap">${u.productId ? html`<a class="link" href="/producto/${u.productId}">Ver ficha ${icon('arrow')}</a>` : ''}<a class="link" href="${u.source.url}" target="_blank" rel="noopener noreferrer">Fuente: ${u.source.label} ${icon('external')}</a></div>
    </article>`)}</div>
  </div></section>` : ''}

  ${os.ok ? html`<section class="section wrap" aria-labelledby="h-os">
    <div class="section__head"><div><span class="eyebrow">Software</span><h2 class="h2" id="h-os" data-split>Sistemas operativos</h2></div><a class="link" href="/sistemas">Historia de cada sistema ${icon('arrow')}</a></div>
    <div class="grid grid--2" style="gap:clamp(24px,4vw,64px)">
      <div data-stagger>${os.v.systems.map((s) => html`<a class="os-row" href="/sistemas#${s.id}"><h3>${s.name}</h3><span class="muted small">${s.device}</span><span class="tag">${s.current}</span></a>`)}</div>
      <div><h3 class="h3" style="margin-bottom:6px">Últimas actualizaciones</h3>${software.length ? html`<div data-stagger>${software.map((n) => story(n, 'compact'))}</div>` : html`<p class="muted small">Las noticias de actualizaciones aparecerán aquí cuando haya conexión con las fuentes.</p>`}</div>
    </div>
  </section>` : ''}

  ${picks.length ? html`<section class="section section--alt" aria-labelledby="h-enc"><div class="wrap">
    <div class="section__head"><div><span class="eyebrow">Enciclopedia</span><h2 class="h2" id="h-enc" data-split>Fichas con fotos y veredicto</h2></div><a class="link" href="/enciclopedia">Ver los ${products.length} productos ${icon('arrow')}</a></div>
    <div class="grid grid--4" data-stagger>${picks.map(productCard)}</div>
  </div></section>` : ''}

  ${history.length ? html`<section class="section wrap" aria-labelledby="h-his">
    <div class="section__head"><div><span class="eyebrow">Historia</span><h2 class="h2" id="h-his" data-split>De un garaje a los dos nanómetros</h2></div><a class="link" href="/descubrir">Descubrir más ${icon('arrow')}</a></div>
    <div class="grid grid--4" data-stagger>${history.map((t) => html`<article class="card fact"><span class="tag">${t.year}</span><h3>${t.title}</h3><p>${t.text}</p></article>`)}</div>
  </section>` : ''}

  <section class="section wrap" style="text-align:center">
    <span class="eyebrow" data-reveal>Mi ecosistema</span>
    <h2 class="h1" data-split style="margin:18px auto 20px;max-width:16ch">¿Toca cambiar de iPhone, o no?</h2>
    <p class="lede" data-reveal style="margin:0 auto 30px">Registra tus dispositivos y recibe un análisis honesto de qué merece la pena actualizar, cuándo, y qué puedes seguir disfrutando sin gastar.</p>
    <a class="btn btn--magnetic" data-reveal href="/ecosistema">${session.user ? 'Abrir mi ecosistema' : 'Crear mi ecosistema'} ${icon('arrow')}</a>
  </section>`;

  // Foto de portada: el primer producto destacado que tenga fotos; si no hay ninguna, un panel con cifras reales.
  (async () => {
    const host = el.querySelector('#hero-gallery'), cap = el.querySelector('#hero-caption');
    for (const id of FEATURED) {
      const p = products.find((x) => x.id === id); if (!p) continue;
      const r = await mountGallery(host, p, { thumbs: false });
      if (!host.isConnected) return;
      if (r.count) { cap.hidden = false; cap.href = `/producto/${p.id}`; cap.innerHTML = html`<span><strong>${p.name}</strong></span><span class="tag tag--oficial">Ver ficha</span>`; return; }
    }
    host.classList.remove('gallery');
    host.innerHTML = html`<div class="hero__panel"><div><b>${products.length}</b><span>fichas de producto</span></div><div><b>${sources.length || 5}</b><span>fuentes de noticias</span></div><div><b>${new Set(products.map((p) => p.family)).size}</b><span>familias</span></div><div><b>${products.length ? new Date().getFullYear() - Math.min(...products.map((p) => p.year)) : 0}</b><span>años de historia</span></div></div>`;
  })();
  return null;
}
