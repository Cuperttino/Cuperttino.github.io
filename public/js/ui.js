// Componentes de interfaz reutilizados por varias vistas.
import { html, raw, esc, icon, api, timeAgo, KIND, STATUS, fmtUSD } from './lib.js';

export const kindTag = (kind) => html`<span class="tag tag--${kind}">${KIND[kind] || kind}</span>`;

export function story(n, variant = '') {
  return html`<a class="story ${variant ? `story--${variant}` : ''}" href="${n.link}" target="_blank" rel="noopener noreferrer">
    <div class="story__meta">${kindTag(n.kind)}<span>${n.sourceName}</span><span>·</span><time datetime="${n.date}">${timeAgo(n.date)}</time></div>
    <h3 class="story__title">${n.title}${icon('external')}</h3>
    ${variant !== 'compact' && n.excerpt ? html`<p class="story__excerpt">${n.excerpt}</p>` : ''}
  </a>`;
}

export function productCard(p) {
  return html`<a class="card product-card" href="/producto/${p.id}">
    <span class="product-card__year">${p.year}</span>
    <div class="product-card__swatches" aria-hidden="true">${(p.colors || []).slice(0, 6).map(([, hex]) => raw(`<i style="background:${esc(hex)}"></i>`))}</div>
    <h3>${p.name}</h3>
    <p>${p.chip || p.gen}</p>
    <div class="product-card__foot"><span class="muted">${p.price != null ? `Desde ${fmtUSD(p.price)}` : STATUS[p.status]}</span>${p.verified === 'parcial' ? html`<span class="tag tag--rumor" title="Producto reciente: solo datos contrastados">Ficha parcial</span>` : html`<span class="tag">${STATUS[p.status]}</span>`}</div>
  </a>`;
}

export const sourcesLine = (sources) => html`<div class="sources">${sources.map((s) => html`<span title="${s.ok === false ? `Sin conexión: ${s.error || ''}` : 'Conectado'}"><i class="${s.ok ? '' : 'off'}"></i>${s.name}${s.ok === false ? ' (sin conexión)' : ''}</span>`)}</div>`;

// Galería de fotos de un producto: imagen principal con fundido, miniaturas, teclado, gesto táctil y ampliación.
// Las fotos proceden de la carpeta local del producto o de Wikimedia Commons (con autor y licencia).
export async function mountGallery(el, product, { thumbs = true } = {}) {
  el.classList.add('gallery'); el.innerHTML = '<div class="gallery__main"><div class="skeleton" style="position:absolute;inset:0;border-radius:0"></div></div>';
  let data;
  try { data = await api(`/api/products/${product.id}/photos`); } catch (err) { data = { photos: [], error: err.message, folder: `public/fotos/${product.id}/` }; }
  const photos = data.photos;
  if (!photos.length) {
    el.innerHTML = html`<div class="gallery__empty"><p class="h3">${data.error ? 'No se pudieron cargar las fotos' : 'Todavía no hay fotos de este producto'}</p>
      <p>${data.error ? `${data.error} ` : 'No hemos encontrado fotografías con licencia libre en Wikimedia Commons. '}Puedes añadir las tuyas copiándolas en la carpeta <code>${data.folder}</code>.</p></div>`;
    return { count: 0 };
  }
  let i = 0;
  const credit = (p) => (p.local ? html`<span>Foto propia</span>` : html`<span>Foto: ${p.author} · ${p.license} · <a href="${p.page}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></span>`);
  el.innerHTML = html`<div class="gallery__main" tabindex="0" role="group" aria-roledescription="galería" aria-label="Fotos de ${product.name}. Usa las flechas para cambiar de imagen.">
      <div class="gallery__frames"></div>
      ${photos.length > 1 ? html`<button class="gallery__nav gallery__nav--prev" type="button" aria-label="Foto anterior">${icon('arrow')}</button><button class="gallery__nav gallery__nav--next" type="button" aria-label="Foto siguiente">${icon('arrow')}</button><span class="gallery__count glass"></span>` : ''}
      <button class="gallery__zoom glass" type="button" aria-label="Ampliar foto">${icon('plus')}</button>
    </div>
    <p class="gallery__credit"></p>
    ${thumbs && photos.length > 1 ? html`<div class="gallery__thumbs" role="group" aria-label="Miniaturas">${photos.map((p, n) => html`<button type="button" data-n="${n}" aria-label="Foto ${n + 1} de ${photos.length}"><img src="${p.src}" alt="" loading="lazy" decoding="async"></button>`)}</div>` : ''}
    <dialog class="lightbox" aria-label="Foto ampliada de ${product.name}"><button class="lightbox__close tool glass" type="button" aria-label="Cerrar">${icon('close')}</button><img alt=""></dialog>`;
  const frames = el.querySelector('.gallery__frames'), main = el.querySelector('.gallery__main'), box = el.querySelector('.lightbox');
  function show(n, first = false) {
    i = (n + photos.length) % photos.length; const p = photos[i];
    const img = new Image(); img.alt = `${product.name}: ${p.title}`; img.decoding = 'async'; img.className = 'gallery__img';
    img.onload = img.onerror = () => { frames.appendChild(img); requestAnimationFrame(() => img.classList.add('is-in')); [...frames.children].slice(0, -1).forEach((old) => { old.classList.add('is-out'); setTimeout(() => old.remove(), 700); }); };
    img.src = p.src; if (first) img.fetchPriority = 'high';
    el.querySelector('.gallery__credit').innerHTML = credit(p);
    const count = el.querySelector('.gallery__count'); if (count) count.textContent = `${i + 1} / ${photos.length}`;
    el.querySelectorAll('.gallery__thumbs button').forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
  }
  el.querySelector('.gallery__nav--prev')?.addEventListener('click', () => show(i - 1));
  el.querySelector('.gallery__nav--next')?.addEventListener('click', () => show(i + 1));
  el.querySelector('.gallery__thumbs')?.addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (b) show(Number(b.dataset.n)); });
  main.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1); } });
  let x0 = null;
  main.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  main.addEventListener('pointerup', (e) => { if (x0 != null && Math.abs(e.clientX - x0) > 44 && photos.length > 1) show(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  el.querySelector('.gallery__zoom').addEventListener('click', () => { const im = box.querySelector('img'); im.src = photos[i].full; im.alt = `${product.name}: ${photos[i].title}`; box.showModal(); });
  box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.lightbox__close')) box.close(); });
  show(0, true);
  return { count: photos.length, source: data.source };
}

export const errorBox = (message, retry = true) => html`<div class="empty" role="alert"><p class="h3">No se pudo cargar</p><p>${message}</p>${retry ? html`<button class="btn btn--ghost" data-retry type="button">Reintentar</button>` : ''}</div>`;
export const skeleton = (n = 4, h = 90) => raw(Array.from({ length: n }, () => `<div class="skeleton" style="height:${h}px;margin-bottom:12px"></div>`).join(''));
