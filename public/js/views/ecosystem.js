import { html, api, getCatalog, icon, fmtMonth, fmtEUR, fmtPrice, session, toast } from '../lib.js';
import { scan, countUp } from '../motion.js';

const RING = { iPhone: 0, 'Apple Watch': 0, AirPods: 0, 'AirPods Max': 0 };
const LINKS = [['iPhone', 'Apple Watch'], ['iPhone', 'AirPods'], ['iPhone', 'MacBook Air'], ['iPhone', 'MacBook Pro'], ['iPhone', 'MacBook'], ['iPhone', 'iMac'], ['iPhone', 'Mac mini'], ['iPad', 'MacBook Air'], ['iPad', 'MacBook Pro'], ['iPad', 'iMac'], ['iPhone', 'iPad'], ['Apple TV', 'HomePod'], ['iPhone', 'AirPods Max']];
const PRIORITY = { alta: 'Prioridad alta', media: 'Prioridad media', baja: 'Prioridad baja', ninguna: 'No hace falta cambiar' };
const TIMING = { esperar: 'Mejor esperar', ahora: 'Buen momento', 'sin prisa': 'Sin prisa', 'no actualizar': 'No actualizar', 'nada que hacer': 'Nada que hacer' };

function orbit(devices, userName) {
  const C = 300, rings = [140, 232];
  const groups = [devices.filter((d) => RING[d.product?.family] === 0), devices.filter((d) => RING[d.product?.family] !== 0)];
  if (!groups[0].length) { groups[0] = groups[1].splice(0, Math.min(4, groups[1].length)); }
  const pos = new Map();
  groups.forEach((g, ri) => g.forEach((d, i) => { const a = (i / g.length) * Math.PI * 2 - Math.PI / 2 + ri * 0.5; pos.set(d.id, [C + Math.cos(a) * rings[ri], C + Math.sin(a) * rings[ri]]); }));
  const links = [];
  for (const [fa, fb] of LINKS) for (const a of devices.filter((d) => d.product?.family === fa)) for (const b of devices.filter((d) => d.product?.family === fb)) links.push([a.id, b.id]);
  const short = (s) => (s.length > 15 ? `${s.slice(0, 14)}…` : s);
  return html`<svg viewBox="0 0 600 600" role="group" aria-label="Mapa de tu ecosistema: ${devices.length} dispositivos conectados">
    ${rings.map((r) => html`<circle class="orbit__ring" cx="${C}" cy="${C}" r="${r}"/>`)}
    ${devices.map((d) => { const [x, y] = pos.get(d.id); return html`<line stroke="var(--line)" x1="${C}" y1="${C}" x2="${x}" y2="${y}"/>`; })}
    ${links.map(([a, b]) => { const [x1, y1] = pos.get(a), [x2, y2] = pos.get(b); return html`<line class="orbit__link" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; })}
    <g class="orbit__hub"><circle cx="${C}" cy="${C}" r="46"/><text x="${C}" y="${C - 2}">${short(userName)}</text><text x="${C}" y="${C + 14}" style="font:400 9.5px var(--sans);opacity:.7">${devices.length} ${devices.length === 1 ? 'dispositivo' : 'dispositivos'}</text></g>
    ${devices.map((d, i) => { const [x, y] = pos.get(d.id); return html`<g class="orbit__node" style="--i:${i}" tabindex="0" role="button" data-node="${d.id}" aria-label="${d.nickname || d.product?.name}">
      <circle cx="${x}" cy="${y}" r="40"/><circle cx="${x + 27}" cy="${y - 27}" r="6" style="fill:${d.product?.colors?.find(([n]) => n === d.color)?.[1] || 'var(--line)'};stroke:var(--surface);stroke-width:2"/>
      <text x="${x}" y="${y - 1}">${short(d.nickname || d.product?.name || 'Dispositivo')}</text><text class="sub" x="${x}" y="${y + 13}">${d.product?.family || ''}</text></g>`; })}
  </svg>`;
}

export default async function ecosystem({ el, query, navigate }) {
  if (!session.user) {
    const back = `/ecosistema${query.get('anadir') ? `?anadir=${query.get('anadir')}` : ''}`;
    el.innerHTML = html`<div class="wrap"><header class="page-head" style="max-width:820px"><span class="eyebrow" data-reveal>Mi ecosistema</span><h1 class="h1" data-split>Tu colección Apple, en un solo panel</h1>
      <p class="lede" data-reveal style="--d:300ms">Registra los dispositivos que tienes, cuánto pagaste y cuándo. Pomar los conecta en un mapa y te dice, con argumentos, cuáles merece la pena actualizar y cuáles siguen siendo excelentes.</p>
      <div style="display:flex;gap:12px;margin-top:28px;flex-wrap:wrap" data-reveal><a class="btn btn--magnetic" href="/cuenta?volver=${encodeURIComponent(back)}">${session.static ? 'Crear mi perfil' : 'Crear cuenta o iniciar sesión'} ${icon('arrow')}</a></div></header>
      <div class="grid grid--3 section--tight" data-stagger>
        <article class="card fact">${icon('shield')}<h3 style="margin-top:14px">Tus datos se quedan aquí</h3><p>${session.static ? 'Tu perfil y tus dispositivos se guardan solo en este navegador. No se envían a ningún servidor.' : 'La cuenta y los dispositivos se guardan en la base de datos de esta instalación. No se envían a terceros.'}</p></article>
        <article class="card fact">${icon('check')}<h3 style="margin-top:14px">Consejos sin comisión</h3><p>No hay enlaces de afiliado. Si tu dispositivo sigue siendo excelente, te lo diremos tal cual.</p></article>
        <article class="card fact">${icon('clock')}<h3 style="margin-top:14px">¿Ahora o esperar?</h3><p>Cada recomendación indica si conviene comprar ya o aguardar a una renovación cercana.</p></article>
      </div></div>`;
    return 'Mi ecosistema';
  }

  const { families, products } = await getCatalog();
  const byId = new Map(products.map((p) => [p.id, p]));
  let devices = [], advice = null;

  el.innerHTML = html`<div class="wrap">
    <header class="page-head" style="display:flex;justify-content:space-between;align-items:end;gap:24px;flex-wrap:wrap"><div><span class="eyebrow" data-reveal>Mi ecosistema</span><h1 class="h1" data-split>Hola, ${session.user.name.split(' ')[0]}</h1></div>
      <button class="btn btn--magnetic" id="eco-add" type="button" data-reveal>${icon('plus')} Añadir dispositivo</button></header>
    <div id="eco-body"></div>
    <section class="section" aria-labelledby="h-adv"><div class="section__head"><div><span class="eyebrow">Asesor</span><h2 class="h2" id="h-adv" data-split>¿Qué deberías actualizar, y cuándo?</h2></div></div><div id="eco-advice" aria-live="polite"></div></section>
  </div>
  <dialog class="modal" id="eco-dialog" aria-labelledby="eco-dialog-title"></dialog>`;
  const body = el.querySelector('#eco-body'), adviceBox = el.querySelector('#eco-advice'), dialog = el.querySelector('#eco-dialog');

  function drawBody() {
    if (!devices.length) { body.innerHTML = html`<div class="empty"><p class="h3">Tu ecosistema está vacío</p><p>Añade tu primer dispositivo para ver el mapa y recibir recomendaciones.</p><button class="btn" type="button" data-add>${icon('plus')} Añadir dispositivo</button></div>`; return; }
    const paid = devices.filter((d) => d.price_paid != null);
    const total = paid.reduce((s, d) => s + d.price_paid, 0);
    body.innerHTML = html`<div class="eco">
      <div class="orbit" data-reveal>${orbit(devices, session.user.name.split(' ')[0])}</div>
      <div>
        <div class="stats" data-reveal>
          <div class="card stat"><b id="st-n">0</b><span>${devices.length === 1 ? 'dispositivo' : 'dispositivos'}</span></div>
          <div class="card stat"><b id="st-t">${paid.length ? '0' : '—'}</b><span>${paid.length ? `invertido (${paid.length} con precio)` : 'sin precios registrados'}</span></div>
          <div class="card stat"><b id="st-c">0</b><span>con AppleCare+</span></div>
        </div>
        <div data-stagger>${devices.map((d) => html`<article class="card device" id="dev-${d.id}">
          <span class="device__dot" style="background:${d.product?.colors?.find(([n]) => n === d.color)?.[1] || 'transparent'}" aria-hidden="true"></span>
          <div><h3><a href="/producto/${d.product_id}">${d.nickname || d.product?.name || d.product_id}</a></h3>
            <p>${[d.nickname ? d.product?.name : null, d.color, d.storage, d.purchased_at ? `comprado en ${fmtMonth(d.purchased_at.slice(0, 7))}` : null, d.price_paid != null ? fmtEUR(d.price_paid) : null, d.applecare ? 'AppleCare+' : null].filter(Boolean).join(' · ') || 'Sin detalles'}</p></div>
          <div class="device__actions"><button class="tool" type="button" data-edit="${d.id}" aria-label="Editar ${d.product?.name}">${icon('edit')}</button><button class="tool" type="button" data-del="${d.id}" aria-label="Eliminar ${d.product?.name}">${icon('trash')}</button></div>
        </article>`)}</div>
      </div></div>`;
    scan(body);
    countUp(body.querySelector('#st-n'), devices.length);
    if (paid.length) countUp(body.querySelector('#st-t'), total, (n) => fmtEUR(Math.round(n)));
    countUp(body.querySelector('#st-c'), devices.filter((d) => d.applecare).length);
  }

  function drawAdvice() {
    if (!advice) return;
    if (!advice.items.length) { adviceBox.innerHTML = html`<p class="muted">${advice.summary}</p>`; return; }
    adviceBox.innerHTML = html`<p class="lede" style="margin-bottom:24px" data-reveal>${advice.summary}</p>
      ${advice.notes.map((n) => html`<div class="notice ${n.kind === 'incompatibilidad' ? 'notice--warn' : ''}" style="margin-bottom:10px" data-reveal>${icon('alert')}<span><strong>${n.kind === 'incompatibilidad' ? 'Incompatibilidad' : n.kind === 'friccion' ? 'Fricción' : 'Aviso'}.</strong> ${n.text}</span></div>`)}
      <div style="margin-top:20px" data-stagger>${advice.items.map((a) => html`<article class="card advice">
        <div class="advice__head"><div><p class="small muted">${a.model}</p><h3>${a.headline}</h3></div><span class="tag tag--${a.priority}">${PRIORITY[a.priority]}</span></div>
        <p>${a.reason}</p>
        ${a.alternative && a.action !== 'conservar' ? html`<dl>
          <dt>Mejor alternativa</dt><dd><a class="link" href="/producto/${a.alternative.id}">${a.alternative.name}</a>${fmtPrice(a.alternative) ? ` · desde ${fmtPrice(a.alternative)} de salida` : ''}${a.alternative.verified === 'parcial' ? ' · ficha parcial' : ''}</dd>
          <dt>Qué cambia</dt><dd>${a.differences.length ? html`<ul>${a.differences.map((t) => html`<li style="margin-bottom:6px">${t}</li>`)}</ul>` : 'Nada que se note en el uso diario.'}</dd>
          ${a.benefit ? html`<dt>Beneficio real</dt><dd>${a.benefit}</dd>` : ''}
          ${a.timing ? html`<dt>¿Ahora o esperar?</dt><dd><strong>${TIMING[a.timing.verdict] || a.timing.verdict}.</strong> ${a.timing.text}${a.timing.rumor ? html` <span class="tag tag--rumor">Rumor</span>` : ''}</dd>` : ''}
          <dt>Comparar</dt><dd><a class="link" href="/comparar?ids=${a.productId},${a.alternative.id}">Ver ${a.model} frente a ${a.alternative.name} ${icon('arrow')}</a></dd>
        </dl>` : a.timing ? html`<p class="small muted" style="margin-top:10px">${a.timing.text}${a.timing.rumor ? html` <span class="tag tag--rumor">Rumor</span>` : ''}</p>` : ''}
      </article>`)}</div>
      ${advice.accessories.length ? html`<h3 class="h3" style="margin:40px 0 6px">Accesorios que podrían encajar</h3><p class="small muted" style="margin-bottom:14px">Solo si responden a un uso real. Ninguno es necesario.</p>
        <div class="grid grid--2" data-stagger>${advice.accessories.map((x) => html`<a class="card fact" href="/producto/${x.productId}"><h3>${x.name}</h3><p>${x.text}</p></a>`)}</div>` : ''}`;
    scan(adviceBox);
  }

  async function reload() {
    try {
      const [d, a] = await Promise.all([api('/api/devices'), api('/api/advisor')]);
      devices = d.devices; advice = a; drawBody(); drawAdvice();
    } catch (err) {
      if (err.status === 401) { session.user = null; return navigate('/cuenta?volver=/ecosistema', { replace: true }); }
      body.innerHTML = html`<div class="empty" role="alert"><p class="h3">No se pudo cargar tu ecosistema</p><p>${err.message}</p><button class="btn btn--ghost" type="button" data-reload>Reintentar</button></div>`;
    }
  }

  function openForm(device, presetId) {
    const d = device || { product_id: presetId || '', color: '', storage: '', purchased_at: '', price_paid: '', applecare: false, nickname: '' };
    dialog.innerHTML = html`<form class="form" method="dialog" novalidate>
      <h2 id="eco-dialog-title">${device ? 'Editar dispositivo' : 'Añadir dispositivo'}</h2>
      <label>Modelo y generación<select class="select" name="product_id" required><option value="">Elegir…</option>${families.map((f) => { const l = products.filter((p) => p.family === f).sort((a, b) => b.released.localeCompare(a.released)); return l.length ? html`<optgroup label="${f}">${l.map((p) => html`<option value="${p.id}" ${p.id === d.product_id ? html`selected` : ''}>${p.name} · ${p.gen}</option>`)}</optgroup>` : ''; })}</select></label>
      <div class="row"><label>Color<select class="select" name="color"></select></label><label>Almacenamiento<select class="select" name="storage"></select></label></div>
      <div class="row"><label>Fecha de compra<input class="input" type="month" name="purchased_at" value="${(d.purchased_at || '').slice(0, 7)}" max="${new Date().toISOString().slice(0, 7)}"></label>
        <label>Precio pagado (€)<input class="input" type="number" name="price_paid" min="0" max="100000" step="0.01" inputmode="decimal" value="${d.price_paid ?? ''}" placeholder="Opcional"></label></div>
      <label>Nombre propio (opcional)<input class="input" name="nickname" maxlength="40" value="${d.nickname || ''}" placeholder="Ej.: iPhone de trabajo"></label>
      <label class="check"><input type="checkbox" name="applecare" ${d.applecare ? html`checked` : ''}> Tiene AppleCare+</label>
      <p class="form__error" role="alert"></p>
      <div class="form__actions"><button class="btn btn--ghost" type="button" data-cancel>Cancelar</button><button class="btn" type="submit">${device ? 'Guardar cambios' : 'Añadir'}</button></div>
    </form>`;
    const f = dialog.querySelector('form');
    const fill = () => {
      const p = byId.get(f.product_id.value);
      const opts = (list, cur, none) => html`<option value="">${none}</option>${(list || []).map((x) => html`<option value="${x}" ${x === cur ? html`selected` : ''}>${x}</option>`)}`;
      f.color.innerHTML = opts(p?.colors?.map(([n]) => n), d.color, p?.colors ? 'Sin especificar' : 'Sin colores verificados');
      f.storage.innerHTML = opts(p?.storage, d.storage, p?.storage ? 'Sin especificar' : 'Sin dato');
      f.color.disabled = !p?.colors; f.storage.disabled = !p?.storage;
    };
    fill(); f.product_id.addEventListener('change', fill);
    f.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); const err = f.querySelector('.form__error'); err.textContent = '';
      if (!f.product_id.value) { err.textContent = 'Selecciona un modelo.'; return; }
      const payload = { product_id: f.product_id.value, color: f.color.value, storage: f.storage.value, purchased_at: f.purchased_at.value, price_paid: f.price_paid.value, applecare: f.applecare.checked, nickname: f.nickname.value };
      const btn = f.querySelector('[type=submit]'); btn.disabled = true;
      try {
        await api(device ? `/api/devices/${device.id}` : '/api/devices', { method: device ? 'PUT' : 'POST', body: payload });
        dialog.close(); toast(device ? 'Dispositivo actualizado.' : 'Dispositivo añadido a tu ecosistema.'); await reload();
      } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
    });
    dialog.showModal();
  }

  function confirmDelete(d) {
    dialog.innerHTML = html`<form class="form" method="dialog"><h2 id="eco-dialog-title">¿Eliminar ${d.nickname || d.product?.name}?</h2><p class="muted">Se quitará de tu ecosistema. Esta acción no se puede deshacer.</p>
      <div class="form__actions"><button class="btn btn--ghost" type="button" data-cancel>Cancelar</button><button class="btn btn--danger" type="submit">Eliminar</button></div></form>`;
    dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
    dialog.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await api(`/api/devices/${d.id}`, { method: 'DELETE' }); dialog.close(); toast('Dispositivo eliminado.'); await reload(); }
      catch (ex) { dialog.close(); toast(ex.message, 'error'); }
    });
    dialog.showModal();
  }

  el.querySelector('#eco-add').addEventListener('click', () => openForm());
  body.addEventListener('click', (e) => {
    const t = e.target.closest('[data-add],[data-edit],[data-del],[data-node],[data-reload]'); if (!t) return;
    if (t.dataset.add !== undefined) openForm();
    else if (t.dataset.reload !== undefined) reload();
    else if (t.dataset.edit) openForm(devices.find((d) => d.id === Number(t.dataset.edit)));
    else if (t.dataset.del) confirmDelete(devices.find((d) => d.id === Number(t.dataset.del)));
    else if (t.dataset.node) focusDevice(t.dataset.node);
  });
  body.addEventListener('keydown', (e) => { const n = e.target.closest?.('[data-node]'); if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); focusDevice(n.dataset.node); } });
  function focusDevice(id) {
    body.querySelectorAll('.device, .orbit__node').forEach((x) => x.classList.remove('is-on'));
    const card = body.querySelector(`#dev-${id}`); card?.classList.add('is-on'); body.querySelector(`[data-node="${id}"]`)?.classList.add('is-on');
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  await reload();
  const preset = query.get('anadir');
  if (preset && byId.has(preset)) { history.replaceState(null, '', '/ecosistema'); openForm(null, preset); }
  return 'Mi ecosistema';
}
