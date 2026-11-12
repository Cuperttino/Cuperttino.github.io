import { html, api, icon, fmtMonth, fmtUSD, fmtWeight, NA, STATUS, BUY, session } from '../lib.js';
import { productCard, mountGallery } from '../ui.js';

const OS_STATUS = { actual: 'Recibe actualizaciones', limitado: 'Final del ciclo de soporte', 'sin-soporte': 'Sin actualizaciones' };

export default async function product({ el, params }) {
  const { product: p, related } = await api(`/api/products/${params[0]}`);
  const v = (x) => (x == null || x === '' ? NA : x);
  const specs = [
    ['Generación', p.gen], ['Lanzamiento', fmtMonth(p.released)], ['Procesador', p.chip], ['Arquitectura', p.arch], ['Memoria RAM', p.ram],
    ['Almacenamiento', p.storage?.join(' · ')], ['Pantalla', p.display], ['Cámaras', p.cameras], ['Batería y autonomía', p.battery], ['Conectividad', p.connectivity],
    ['Dimensiones', p.dims], ['Peso', p.weightNote || fmtWeight(p.weight)], ['Colores', p.colors?.map(([n]) => n).join(', ')], ['Sistemas compatibles', p.os],
    ['Compatibilidad', p.compat], ['Apple Intelligence', p.ai == null ? null : p.ai ? 'Compatible' : 'No compatible'],
  ].filter(([label, val]) => !(val == null && ['Cámaras', 'Pantalla', 'Batería y autonomía', 'Memoria RAM', 'Arquitectura', 'Apple Intelligence'].includes(label) && p.verified === 'completa'));

  el.innerHTML = html`
  <div class="wrap">
    <nav class="crumbs" aria-label="Migas de pan"><a href="/enciclopedia">Enciclopedia</a><span>/</span><a href="/enciclopedia?familia=${encodeURIComponent(p.family)}">${p.family}</a><span>/</span><span aria-current="page">${p.name}</span></nav>
    <div class="product-top">
      <div class="viewer" id="p-gallery" data-reveal></div>
      <div class="product-info">
        <div class="tagrow" data-reveal><span class="tag">${p.family}</span><span class="tag">${STATUS[p.status]}</span>${p.verified === 'parcial' ? html`<span class="tag tag--rumor">Ficha parcial</span>` : ''}</div>
        <h1 class="h1" data-split>${p.name}</h1>
        <p class="lede" data-reveal style="margin-top:14px;--d:200ms">${p.gen} · ${fmtMonth(p.released)}</p>
        <p class="price" data-reveal style="--d:260ms">${p.price != null ? html`${fmtUSD(p.price)}<small>Precio original de lanzamiento en EE. UU., modelo base, sin impuestos.${p.priceNote ? ` ${p.priceNote}.` : ''}</small>` : html`<span class="na" style="font-size:1rem">Precio de lanzamiento sin dato verificado</span>`}</p>
        ${p.colors?.length ? html`<div data-reveal style="margin-top:22px;--d:320ms"><p class="small muted">Colores disponibles</p>
          <ul class="swatches" aria-label="Colores disponibles">${p.colors.map(([name, h]) => html`<li class="swatch-chip"><i style="background:${h}" aria-hidden="true"></i>${name}</li>`)}</ul>
          <p class="small muted" style="margin-top:8px">Muestras de color aproximadas.</p></div>` : ''}
        ${p.verified === 'parcial' ? html`<div class="notice notice--warn" data-reveal style="margin-top:22px">${icon('alert')}<span>Producto reciente. Esta ficha incluye solo los datos que hemos podido contrastar con las fuentes enlazadas al final; el resto aparece como «Sin dato verificado» en lugar de rellenarse con suposiciones.</span></div>` : ''}
        <article class="card verdict" data-reveal>
          <h3 class="h3">¿Merece la pena comprarlo hoy? <span class="tag tag--${p.buy.v}">${BUY[p.buy.v]}</span></h3>
          <p>${p.buy.text}</p>
          <p class="muted small"><strong style="color:var(--ink-2)">Rendimiento actual.</strong> ${p.today}</p>
          ${p.osStatus ? html`<p class="muted small"><strong style="color:var(--ink-2)">Soporte de software.</strong> ${OS_STATUS[p.osStatus]}.</p>` : ''}
        </article>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px" data-reveal>
          <a class="btn" href="/comparar?ids=${p.id}${related[0] ? `,${related[0].id}` : ''}">Comparar ${icon('arrow')}</a>
          <a class="btn btn--ghost" href="/ecosistema?anadir=${p.id}">${session.user ? 'Añadir a mi ecosistema' : 'Lo tengo'}</a>
        </div>
      </div>
    </div>

    <section class="section" aria-labelledby="h-specs">
      <div class="section__head"><div><span class="eyebrow">Ficha técnica</span><h2 class="h2" id="h-specs" data-split>Especificaciones</h2></div></div>
      <dl class="specs">${specs.map(([label, val]) => html`<div class="spec" data-reveal><dt>${label}</dt><dd>${v(val)}</dd></div>`)}</dl>
    </section>

    <section class="section--tight"><div class="grid grid--2" style="gap:clamp(24px,5vw,72px)">
      <div><span class="eyebrow">Lo esencial</span><h2 class="h2" style="margin:14px 0 18px" data-split>Características destacadas</h2><ul class="bullets" data-stagger>${p.highlights.map((t) => html`<li>${t}</li>`)}</ul></div>
      <div><span class="eyebrow">Para aficionados</span><h2 class="h2" style="margin:14px 0 18px" data-split>Curiosidades</h2><ul class="bullets bullets--plain" data-stagger>${p.trivia.map((t) => html`<li>${t}</li>`)}</ul></div>
    </div></section>

    ${related.length ? html`<section class="section" aria-labelledby="h-rel">
      <div class="section__head"><div><span class="eyebrow">Misma línea</span><h2 class="h2" id="h-rel" data-split>Otras generaciones</h2></div></div>
      <div class="grid grid--4" data-stagger>${related.map(productCard)}</div>
    </section>` : ''}

    <section class="section--tight" style="padding-bottom:64px"><h2 class="h3" style="margin-bottom:10px">Fuentes de esta ficha</h2>
      <ul class="small">${p.sources.map((s) => html`<li style="padding:4px 0"><a class="link" href="${s.url}" target="_blank" rel="noopener noreferrer">${s.label} ${icon('external')}</a></li>`)}</ul>
      <p class="small muted" style="margin-top:10px;max-width:70ch">Las fotografías proceden de Wikimedia Commons, con licencia libre y atribución a su autor bajo cada imagen, o de la carpeta de fotos propias de esta instalación. No se usan las imágenes de prensa de Apple porque no hay licencia para redistribuirlas.</p>
    </section>
  </div>`;

  // La galería se carga en paralelo para no retrasar la ficha.
  mountGallery(el.querySelector('#p-gallery'), p);
  return `${p.name} (${p.year})`;
}
