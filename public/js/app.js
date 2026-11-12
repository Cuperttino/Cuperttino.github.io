// Arranque, enrutador y comportamientos globales (tema, menú, buscador).
import { html, api, session, loadSession, icon, debounce, esc } from './lib.js';
import { initMotion, scan, pageTransition } from './motion.js';
import { errorBox } from './ui.js';

const ROUTES = [
  [/^\/$/, () => import('./views/home.js')],
  [/^\/actualidad$/, () => import('./views/news.js')],
  [/^\/enciclopedia$/, () => import('./views/catalog.js')],
  [/^\/producto\/([\w-]+)$/, () => import('./views/product.js')],
  [/^\/comparar$/, () => import('./views/compare.js')],
  [/^\/ecosistema$/, () => import('./views/ecosystem.js')],
  [/^\/descubrir$/, () => import('./views/learn.js')],
  [/^\/sistemas$/, () => import('./views/os.js')],
  [/^\/cuenta$/, () => import('./views/account.js')],
  [/^\/acerca$/, () => import('./views/about.js')],
];
const view = document.getElementById('view');
let disposers = [];
let navId = 0;

async function render(url, { scroll = true } = {}) {
  const id = ++navId;
  // Normaliza /ruta/ y /ruta.html a /ruta (enlaces directos en alojamientos estáticos).
  const clean = url.pathname.replace(/\/index\.html$|\.html$/, '').replace(/(.)\/$/, '$1') || '/';
  if (clean !== url.pathname) { url = new URL(clean + url.search + url.hash, url.origin); history.replaceState(null, '', url); }
  const match = ROUTES.map(([re, load]) => ({ m: url.pathname.match(re), load })).find((r) => r.m);
  disposers.splice(0).forEach((d) => { try { d(); } catch { /* nada */ } });
  // Si la vista ya se abandonó cuando llega un recurso tardío (p. ej. una galería), se libera al momento.
  const ctx = { url, params: match?.m.slice(1) || [], query: url.searchParams, el: view, onDispose: (fn) => (id === navId ? disposers.push(fn) : fn()), navigate };
  try {
    if (!match) throw Object.assign(new Error('Esta página no existe.'), { status: 404 });
    const mod = await match.load();
    await session.ready;
    if (id !== navId) return;
    const title = await mod.default(ctx);
    if (id !== navId) return;
    document.title = title ? `${title} · Pomar` : 'Pomar · El huerto de los aficionados a Apple';
  } catch (err) {
    if (id !== navId) return;
    console.error(err);
    view.innerHTML = html`<div class="wrap section">${err.status === 404
      ? html`<div class="empty"><p class="h3">Página no encontrada</p><p>${err.message}</p><a class="btn" href="/">Volver al inicio</a></div>`
      : errorBox(err.message)}</div>`;
    view.querySelector('[data-retry]')?.addEventListener('click', () => render(url));
    document.title = 'Pomar';
  }
  document.querySelectorAll('.nav__links a').forEach((a) => {
    const on = url.pathname === a.pathname || (a.pathname === '/enciclopedia' && url.pathname.startsWith('/producto/'));
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  scan(view);
  if (url.hash) requestAnimationFrame(() => document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView());
  else if (scroll) scrollTo(0, 0);
}

export function navigate(href, { replace = false } = {}) {
  const url = new URL(href, location.origin);
  if (url.pathname === location.pathname && url.search === location.search && url.hash) { history.replaceState(null, '', url); document.getElementById(url.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }); return; }
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  closeMenu(); closeSearch();
  return pageTransition(() => render(url)).then(() => view.focus({ preventScroll: true }));
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.origin !== location.origin || a.hasAttribute('download')) return;
  e.preventDefault(); navigate(a.href);
});
addEventListener('popstate', () => pageTransition(() => render(new URL(location.href), { scroll: false })));

// ---------- tema ----------
document.getElementById('toggle-theme').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const apply = () => { root.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('pomar-theme', root.dataset.theme); } catch { /* modo privado */ } };
  document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches ? document.startViewTransition(apply) : apply();
});

// ---------- menú móvil ----------
const sheet = document.getElementById('sheet'), menuBtn = document.getElementById('open-menu');
function closeMenu() { sheet.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
menuBtn.addEventListener('click', () => { const open = sheet.hidden; sheet.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : ''; });

// ---------- cuenta ----------
export function refreshAccount() {
  const link = document.getElementById('account-link');
  if (session.user) { link.classList.add('has-user'); link.textContent = session.user.name.trim().slice(0, 1).toUpperCase(); link.setAttribute('aria-label', `Cuenta de ${session.user.name}`); }
  else { link.classList.remove('has-user'); link.innerHTML = '<svg class="i" aria-hidden="true"><use href="/icons.svg#user"/></svg>'; link.setAttribute('aria-label', 'Iniciar sesión'); }
}

// ---------- buscador global ----------
const box = document.getElementById('search'), input = document.getElementById('search-input'), results = document.getElementById('search-results');
let active = -1, lastFocus = null, searchSeq = 0;
const SUGGEST = ['iPhone 18 Pro', 'MacBook Air', 'iPhone 17 vs iPhone 18 Pro', 'Apple Silicon', 'trucos macOS'];
const hint = () => html`<div class="search__hint">Escribe para buscar en dispositivos, noticias, sistemas, artículos y curiosidades.<div class="chips">${SUGGEST.map((s) => html`<button class="chip" type="button" data-suggest="${s}">${s}</button>`)}</div></div>`;
function openSearch() { lastFocus = document.activeElement; box.hidden = false; document.body.style.overflow = 'hidden'; input.value = ''; results.innerHTML = hint(); active = -1; input.focus(); }
function closeSearch() { if (box.hidden) return; box.hidden = true; document.body.style.overflow = ''; lastFocus?.focus?.(); }
const items = () => [...results.querySelectorAll('.search__item')];
function setActive(i) { const list = items(); if (!list.length) return; active = (i + list.length) % list.length; list.forEach((el, n) => el.classList.toggle('is-active', n === active)); list[active].scrollIntoView({ block: 'nearest' }); }
const runSearch = debounce(async () => {
  const q = input.value.trim(); const seq = ++searchSeq;
  if (q.length < 2) { results.innerHTML = hint(); return; }
  try {
    const data = await api(`/api/search?q=${encodeURIComponent(q)}`);
    if (seq !== searchSeq) return;
    results.innerHTML = data.groups.length
      ? html`${data.groups.map((g) => html`<div class="search__group">${g.label}</div>${g.items.map((it) => html`<a class="search__item" href="${it.url}" ${it.external ? html`target="_blank" rel="noopener noreferrer"` : ''}><div><b>${it.title}</b><span>${it.kind === 'rumor' ? 'Rumor · ' : ''}${it.sub}</span></div>${icon(it.external ? 'external' : 'arrow')}</a>`)}`)}`
      : html`<div class="search__hint">Sin resultados para «${q}».</div>`;
    active = -1;
  } catch (err) { if (seq === searchSeq) results.innerHTML = `<div class="search__hint">${esc(err.message)}</div>`; }
}, 140);
input.addEventListener('input', runSearch);
results.addEventListener('click', (e) => { const s = e.target.closest('[data-suggest]'); if (s) { input.value = s.dataset.suggest; runSearch(); input.focus(); } else if (e.target.closest('a[target]')) closeSearch(); });
box.addEventListener('click', (e) => { if (e.target === box) closeSearch(); });
document.getElementById('open-search').addEventListener('click', openSearch);
document.getElementById('close-search').addEventListener('click', closeSearch);
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); box.hidden ? openSearch() : closeSearch(); return; }
  if (e.key === '/' && box.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); return; }
  if (e.key === 'Escape') { closeSearch(); closeMenu(); return; }
  if (box.hidden) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
  else if (e.key === 'Enter') { const el = items()[active] || items()[0]; if (el) { e.preventDefault(); el.click(); } }
  else if (e.key === 'Tab') { e.preventDefault(); input.focus(); } // el foco no sale del diálogo
});

// ---------- arranque ----------
initMotion();
loadSession().then(refreshAccount);
render(new URL(location.href), { scroll: false }).finally(() => requestAnimationFrame(() => document.documentElement.classList.remove('is-loading')));
