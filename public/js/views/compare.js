import { html, api, getCatalog, icon, fmtUSD, fmtMonth, fmtWeight, NA, toast } from '../lib.js';
import { scan } from '../motion.js';

const EXAMPLES = [['iphone-17-pro', 'iphone-18-pro'], ['macbook-air-m4', 'macbook-pro-14-m5'], ['apple-watch-series-11', 'apple-watch-ultra-3'], ['ipad-air-m4', 'ipad-pro-m5'], ['iphone-17', 'iphone-air', 'iphone-17-pro']];
const cell = (row, v) => (v == null ? NA : row.format === 'usd' ? fmtUSD(v) : row.format === 'hz' ? `${v} Hz` : row.format === 'h' ? `${String(v).replace('.', ',')} h` : row.format === 'g' ? fmtWeight(v) : row.label === 'Lanzamiento' ? fmtMonth(v) : v);

export default async function compare({ el, query, navigate }) {
  const [{ families, products }, cfg] = await Promise.all([getCatalog(), api('/api/config').catch(() => ({ ai: false }))]);
  const name = (id) => products.find((p) => p.id === id)?.name || id;
  let ids = (query.get('ids') || '').split(',').filter((id) => products.some((p) => p.id === id)).slice(0, 4);
  const slots = Math.min(4, Math.max(2, ids.length, Number(query.get('huecos')) || 0));
  const options = (sel) => html`<option value="">Elegir producto…</option>${families.map((f) => { const l = products.filter((p) => p.family === f).sort((a, b) => b.released.localeCompare(a.released)); return l.length ? html`<optgroup label="${f}">${l.map((p) => html`<option value="${p.id}" ${p.id === sel ? html`selected` : ''}>${p.name} (${p.year})</option>`)}</optgroup>` : ''; })}`;

  el.innerHTML = html`
  <div class="wrap">
    <header class="page-head"><span class="eyebrow" data-reveal>Comparador</span><h1 class="h1" data-split>¿Cuál compraría? Te lo decimos claro</h1>
      <p class="lede" data-reveal style="--d:300ms">Elige entre dos y cuatro productos. Además de la tabla, recibirás un veredicto razonado: qué diferencias se notan de verdad, si merece la pena pagar más y para quién es cada uno.</p></header>
    <form class="picker" id="cmp-form" data-reveal>
      ${Array.from({ length: slots }, (_, i) => html`<div><label for="cmp-${i}">Producto ${i + 1}</label><select class="select" id="cmp-${i}" name="p">${options(ids[i])}</select></div>`)}
      <div style="display:flex;gap:8px">${slots < 4 ? html`<button class="btn btn--ghost" type="button" id="cmp-add" aria-label="Añadir otro producto">${icon('plus')}</button>` : ''}<button class="btn" type="submit" style="flex:1">Comparar</button></div>
    </form>
    <div class="chips" style="margin-top:18px" data-reveal><span class="small muted" style="align-self:center">Prueba con:</span>${EXAMPLES.map((e) => html`<a class="chip" style="display:inline-flex;align-items:center" href="/comparar?ids=${e.join(',')}">${e.map(name).join(' vs ')}</a>`)}</div>
    <div id="cmp-out" style="margin-top:48px;padding-bottom:64px" aria-live="polite"></div>
  </div>`;

  const form = el.querySelector('#cmp-form'), out = el.querySelector('#cmp-out');
  const chosen = () => [...form.querySelectorAll('select')].map((s) => s.value).filter(Boolean);
  form.addEventListener('submit', (e) => {
    e.preventDefault(); const list = chosen();
    if (list.length < 2) return toast('Elige al menos dos productos.', 'error');
    if (new Set(list).size !== list.length) return toast('Has elegido el mismo producto dos veces.', 'error');
    navigate(`/comparar?ids=${list.join(',')}`);
  });
  el.querySelector('#cmp-add')?.addEventListener('click', () => navigate(`/comparar?ids=${chosen().join(',')}&huecos=${slots + 1}`, { replace: true }));
  if (ids.length < 2) { out.innerHTML = html`<div class="empty"><p class="h3">Elige qué quieres enfrentar</p><p>Selecciona los productos arriba o usa uno de los ejemplos.</p></div>`; return 'Comparador'; }

  const data = await api(`/api/compare?ids=${ids.join(',')}`);
  const ps = data.products, v = data.verdict;
  const list = (arr) => html`<ul>${arr.map((x) => html`<li>${x.text}</li>`)}</ul>`;
  out.innerHTML = html`
    ${v.comparable ? html`
    <section aria-labelledby="h-verdict">
      <div class="section__head"><div><span class="eyebrow">Veredicto</span><h2 class="h2" id="h-verdict" data-split>La opinión sincera</h2></div></div>
      <div class="verdict-grid" data-stagger>
        <article class="card pick pick--main"><span class="eyebrow">¿Cuál compraría?</span><h3>${v.pick.name}</h3><p>${v.pick.why}</p></article>
        <article class="card pick"><span class="eyebrow">Mejor relación calidad-precio</span><h3>${v.value.name}</h3><p>${v.value.why}</p></article>
      </div>
      <div style="margin-top:32px">
        <div class="qa" data-reveal><h3>¿Qué diferencias se notan realmente?</h3><div>${v.noticeable.length ? list(v.noticeable) : html`<p>Con los datos verificados, ninguna diferencia es lo bastante grande como para notarse en el uso diario.</p>`}</div></div>
        ${v.minor.length ? html`<div class="qa" data-reveal><h3>¿Y cuáles son solo números?</h3><div class="muted">${list(v.minor)}</div></div>` : ''}
        ${v.worthMore ? html`<div class="qa" data-reveal><h3>¿Merece la pena pagar más?</h3><p>${v.worthMore}</p></div>` : ''}
        ${v.upgrade ? html`<div class="qa" data-reveal><h3>¿Actualización importante o incremental?</h3><p><span class="tag tag--${v.upgrade.kind === 'importante' ? 'si' : v.upgrade.kind === 'moderada' ? 'depende' : 'baja'}" style="margin-right:8px">${v.upgrade.kind}</span>${v.upgrade.text}</p></div>` : ''}
        ${v.profiles.length ? html`<div class="qa" data-reveal><h3>¿Para quién es cada uno?</h3><ul>${v.profiles.map((p) => html`<li><strong>${p.who}:</strong> ${p.name}. <span class="muted">${p.why}</span></li>`)}</ul></div>` : ''}
        <div class="qa" data-reveal><h3>Ventajas de cada uno</h3><ul>${ps.map((p) => { const wins = [...v.noticeable, ...v.minor].filter((d) => d.winner === p.id).map((d) => d.topic.toLowerCase()); return html`<li><strong>${p.name}:</strong> ${wins.length ? `gana en ${[...new Set(wins)].join(', ')}.` : 'no gana en ninguna dimensión medible frente al resto.'} <span class="muted">${p.buy.text}</span></li>`; })}</ul></div>
      </div>
      <p class="small muted" style="margin-top:18px;max-width:80ch">${v.method}</p>
      <article class="card ai-box" data-reveal>
        <h3 class="h3" style="display:flex;gap:8px;align-items:center">${icon('spark')} Opinión ampliada con IA</h3>
        ${cfg.ai ? html`<p class="small muted" style="margin-top:6px">Un modelo de lenguaje redacta una valoración a partir de estas mismas fichas verificadas. Cuéntale para qué lo quieres.</p>
          <form id="ai-form" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><input class="input" name="profile" maxlength="200" placeholder="Ej.: estudio, hago muchas fotos y quiero que me dure 5 años" style="flex:1;min-width:220px" aria-label="Tu perfil de uso"><button class="btn" type="submit">Pedir opinión</button></form>
          <div class="ai-box__text" id="ai-out" aria-live="polite"></div>`
        : html`<p class="small muted" style="margin-top:6px">Esta función está preparada pero no activada: requiere la versión con servidor y una clave de API (consulta el README). El veredicto de arriba no depende de ella.</p>`}
      </article>
    </section>` : html`<div class="notice" data-reveal>${icon('alert')}<div><strong>${v.headline}.</strong> ${v.text}</div></div>`}

    <section style="margin-top:64px" aria-labelledby="h-table">
      <div class="section__head"><div><span class="eyebrow">Lado a lado</span><h2 class="h2" id="h-table" data-split>Diferencias técnicas</h2></div></div>
      <div class="cmp-scroll"><table class="cmp">
        <thead><tr><th scope="col"><span class="eyebrow">Especificación</span></th>${ps.map((p) => html`<th scope="col"><a href="/producto/${p.id}">${p.name}</a><small>${p.gen}${p.verified === 'parcial' ? ' · ficha parcial' : ''}</small></th>`)}</tr></thead>
        <tbody>${data.rows.map((r) => html`<tr><th scope="row">${r.label}</th>${r.values.map((val, i) => html`<td class="${r.best === i ? 'is-best' : ''}">${cell(r, val)}${r.notes?.[i] ? html`<small>${r.notes[i]}</small>` : ''}</td>`)}</tr>`)}</tbody>
      </table></div>
      <ul class="small muted" style="margin-top:20px;display:grid;gap:6px;max-width:90ch">${v.caveats.map((c) => html`<li>${c}</li>`)}</ul>
    </section>`;
  scan(out);

  out.querySelector('#ai-form')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button'), box = out.querySelector('#ai-out');
    btn.disabled = true; box.textContent = 'Redactando la opinión…';
    try { const r = await api('/api/compare/ai', { method: 'POST', body: { ids: ids.join(','), profile: e.target.profile.value } }); box.textContent = r.text; }
    catch (err) { box.textContent = err.message; }
    finally { btn.disabled = false; }
  });
  return ps.map((p) => p.name).join(' vs ');
}
