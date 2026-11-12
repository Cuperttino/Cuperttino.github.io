import { html, api, icon, timeAgo, debounce, KIND } from '../lib.js';
import { story, sourcesLine, skeleton } from '../ui.js';
import { scan } from '../motion.js';

export default async function news({ el, query }) {
  const state = { kind: query.get('tipo') || '', topic: query.get('tema') || '', source: '', q: query.get('q') || '' };
  el.innerHTML = html`
  <div class="wrap">
    <header class="page-head"><span class="eyebrow" data-reveal>Actualidad</span><h1 class="h1" data-split>Noticias, rumores y análisis</h1>
      <p class="lede" data-reveal style="--d:300ms">Titulares reales obtenidos de los feeds públicos de cada medio, con su fecha y un enlace al artículo original. Los rumores van siempre marcados como no oficiales. Los titulares se muestran en el idioma de la fuente.</p></header>
    <div class="toolbar" data-reveal>
      <div class="field">${icon('search')}<input class="input" id="news-q" type="search" placeholder="Buscar en los titulares…" value="${state.q}" aria-label="Buscar noticias"></div>
      <select class="select" id="news-source" style="max-width:220px" aria-label="Filtrar por fuente"><option value="">Todas las fuentes</option></select>
    </div>
    <div class="chips" id="news-kind" role="group" aria-label="Tipo de información" style="margin-bottom:10px">${[['', 'Todo'], ...Object.entries(KIND)].map(([k, label]) => html`<button class="chip" type="button" data-kind="${k}" aria-pressed="${state.kind === k}">${label}</button>`)}</div>
    <div class="chips chips--scroll" id="news-topic" role="group" aria-label="Categoría"></div>
    <div id="news-status" style="margin:22px 0 4px"></div>
    <div id="news-list" aria-live="polite" aria-busy="true">${skeleton(6, 96)}</div>
  </div>`;

  const list = el.querySelector('#news-list'), status = el.querySelector('#news-status'), topicBox = el.querySelector('#news-topic'), sourceSel = el.querySelector('#news-source');
  let seq = 0, filled = false;

  async function load() {
    const id = ++seq; list.setAttribute('aria-busy', 'true');
    const p = new URLSearchParams({ limit: '120' });
    if (state.kind) p.set('kind', state.kind); if (state.topic) p.set('topic', state.topic); if (state.source) p.set('source', state.source); if (state.q) p.set('q', state.q);
    try {
      const data = await api(`/api/news?${p}`);
      if (id !== seq) return;
      if (!filled) {
        filled = true;
        sourceSel.insertAdjacentHTML('beforeend', html`${data.sources.map((s) => html`<option value="${s.id}">${s.name}${s.official ? ' (oficial)' : ''}</option>`)}`);
      }
      topicBox.innerHTML = html`<button class="chip" type="button" data-topic="" aria-pressed="${!state.topic}">Todas las categorías</button>${data.topics.map((t) => html`<button class="chip" type="button" data-topic="${t}" aria-pressed="${state.topic === t}">${t}</button>`)}`;
      const down = data.sources.filter((s) => s.ok === false);
      status.innerHTML = html`<div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center"><span class="small muted">${data.total} ${data.total === 1 ? 'titular' : 'titulares'}${data.fetchedAt ? ` · actualizado ${timeAgo(new Date(data.fetchedAt).toISOString())}` : ''} · se renueva automáticamente</span>${sourcesLine(data.sources)}</div>
        ${down.length ? html`<div class="notice notice--warn" style="margin-top:12px">${icon('alert')}<span>No se ha podido conectar con ${down.map((s) => s.name).join(', ')}. ${down.some((s) => s.count) ? 'Se muestra su última copia guardada.' : ''} Se reintentará en la próxima actualización.</span></div>` : ''}`;
      list.innerHTML = data.items.length
        ? html`<div data-stagger>${data.items.map((n) => story(n))}</div>`
        : html`<div class="empty"><p class="h3">${data.sources.every((s) => !s.ok) ? 'Sin conexión con las fuentes' : 'Nada coincide con esos filtros'}</p><p>${data.sources.every((s) => !s.ok) ? 'Pomar no inventa noticias: cuando el servidor recupere la conexión, los titulares reales aparecerán aquí.' : 'Prueba a quitar algún filtro o a buscar otro término.'}</p></div>`;
      scan(list);
    } catch (err) {
      if (id !== seq) return;
      list.innerHTML = html`<div class="empty" role="alert"><p class="h3">No se pudieron cargar las noticias</p><p>${err.message}</p><button class="btn btn--ghost" type="button" id="news-retry">Reintentar</button></div>`;
      list.querySelector('#news-retry').addEventListener('click', load);
    } finally { if (id === seq) list.setAttribute('aria-busy', 'false'); }
  }

  el.querySelector('#news-kind').addEventListener('click', (e) => { const b = e.target.closest('[data-kind]'); if (!b) return; state.kind = b.dataset.kind; el.querySelectorAll('[data-kind]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); load(); });
  topicBox.addEventListener('click', (e) => { const b = e.target.closest('[data-topic]'); if (!b) return; state.topic = b.dataset.topic; load(); });
  sourceSel.addEventListener('change', () => { state.source = sourceSel.value; load(); });
  el.querySelector('#news-q').addEventListener('input', debounce((e) => { state.q = e.target.value.trim(); load(); }, 220));
  await load();
  return 'Actualidad Apple';
}
