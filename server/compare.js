// Motor de comparación. Trabaja solo con los datos verificados de las fichas:
// si falta un dato en alguno de los productos, esa dimensión no entra en el veredicto.
import { categoryOf } from './data/products.js';

const fmtUSD = (n) => (n == null ? null : `${n.toLocaleString('es-ES')} $`);
const inches = (p) => { const m = (p.display || '').match(/(\d+(?:,\d+)?)\s*"/); return m ? parseFloat(m[1].replace(',', '.')) : null; };
const lenses = (p) => {
  const c = p.cameras || '';
  if (/^Triple/i.test(c)) return 3;
  if (/^Doble/i.test(c) || /Mpx y /.test(c.split('·')[0])) return 2;
  if (/Mpx/.test(c.split('·')[0])) return 1;
  return null;
};
const OS_RANK = { 'sin-soporte': 0, limitado: 1, actual: 2 };
const BUY_RANK = { no: 0, depende: 0.5, si: 1 };

export function tableRows(ps) {
  const row = (label, fn, better) => {
    const values = ps.map(fn);
    let best = null;
    if (better && values.every((v) => typeof v === 'number')) {
      const target = better === 'max' ? Math.max(...values) : Math.min(...values);
      if (values.filter((v) => v === target).length === 1) best = values.indexOf(target);
    }
    return { label, values, best };
  };
  const text = (label, key) => ({ label, values: ps.map((p) => p[key] ?? null), best: null });
  return [
    { label: 'Lanzamiento', values: ps.map((p) => p.released), best: null },
    { ...row('Precio de lanzamiento (EE. UU.)', (p) => p.price, 'min'), format: 'usd', notes: ps.map((p) => p.priceNote || null) },
    text('Procesador', 'chip'), text('Arquitectura', 'arch'), text('Memoria', 'ram'),
    { label: 'Almacenamiento', values: ps.map((p) => (p.storage ? p.storage.join(' · ') : null)), best: null },
    text('Pantalla', 'display'), { ...row('Refresco de pantalla', (p) => p.hz, 'max'), format: 'hz' },
    text('Cámaras', 'cameras'), text('Batería', 'battery'), { ...row('Autonomía de referencia', (p) => p.hours, 'max'), format: 'h' },
    text('Conectividad', 'connectivity'), text('Dimensiones', 'dims'), { ...row('Peso', (p) => p.weight, 'min'), format: 'g', notes: ps.map((p) => p.weightNote || null) },
    text('Sistema operativo', 'os'), text('Compatibilidad', 'compat'),
    { label: 'Apple Intelligence', values: ps.map((p) => (p.ai == null ? null : p.ai ? 'Sí' : 'No')), best: null },
  ];
}

// Diferencias entre dos productos, separando lo que se nota de lo que no.
export function diff(a, b) {
  const big = [], small = [];
  const name = (p) => p.name;
  if (a.hz && b.hz && a.hz !== b.hz && Math.max(a.hz, b.hz) >= 120 && Math.min(a.hz, b.hz) <= 60) {
    const w = a.hz > b.hz ? a : b;
    big.push({ topic: 'Pantalla', winner: w.id, text: `${name(w)} tiene pantalla de 120 Hz: el desplazamiento y las animaciones se ven claramente más fluidos.` });
  }
  if (a.hours && b.hours && a.hours !== b.hours) {
    const w = a.hours > b.hours ? a : b, l = w === a ? b : a;
    const pct = Math.round((w.hours / l.hours - 1) * 100);
    (pct >= 20 ? big : small).push({ topic: 'Autonomía', winner: w.id, text: pct >= 20
      ? `${name(w)} aguanta bastante más: ${w.hours} h frente a ${l.hours} h en la cifra de referencia de Apple (un ${pct} % más).`
      : `La autonomía es parecida (${a.hours} h y ${b.hours} h); no cambiará tu rutina de carga.` });
  }
  if (a.track && a.track === b.track && a.chipGen && b.chipGen && a.chipGen !== b.chipGen) {
    const w = a.chipGen > b.chipGen ? a : b, l = w === a ? b : a;
    const gap = w.chipGen - l.chipGen;
    (gap >= 3 ? big : small).push({ topic: 'Rendimiento', winner: w.id, text: gap >= 3
      ? `Hay ${Math.floor(gap)} generaciones de chip entre ambos (${l.chip} frente a ${w.chip}): se nota en apps exigentes, en la cámara y en los años de actualizaciones que le quedan.`
      : `${w.chip} es más nuevo que ${l.chip}, pero en el uso diario (mensajes, navegador, vídeo, redes) no percibirás diferencia.` });
  } else if (a.track && b.track && a.track !== b.track) {
    small.push({ topic: 'Rendimiento', winner: null, text: `Usan familias de chip distintas (${a.chip} y ${b.chip}); no son comparables directamente con los datos de las fichas.` });
  }
  const la = lenses(a), lb = lenses(b);
  if (la && lb && la !== lb) {
    const w = la > lb ? a : b;
    big.push({ topic: 'Cámaras', winner: w.id, text: `${name(w)} tiene más cámaras traseras (${Math.max(la, lb)} frente a ${Math.min(la, lb)}): ganas encuadres que el otro no puede hacer.` });
  }
  if (a.weight && b.weight && categoryOf(a) === categoryOf(b)) {
    const w = a.weight < b.weight ? a : b, l = w === a ? b : a;
    const pct = Math.round((1 - w.weight / l.weight) * 100);
    if (pct >= 12) big.push({ topic: 'Peso', winner: w.id, text: `${name(w)} es un ${pct} % más ligero; se aprecia al sostenerlo o llevarlo encima.` });
    else if (pct > 0) small.push({ topic: 'Peso', winner: w.id, text: `La diferencia de peso (${pct} %) es difícil de notar.` });
  }
  const ia = inches(a), ib = inches(b);
  if (ia && ib && Math.abs(ia - ib) >= 0.4 && !/ o /.test(a.display + b.display)) {
    const w = ia > ib ? a : b;
    big.push({ topic: 'Tamaño', winner: null, text: `${name(w)} tiene una pantalla sensiblemente mayor (${String(Math.max(ia, ib)).replace('.', ',')}" frente a ${String(Math.min(ia, ib)).replace('.', ',')}"). Más cómodo para ver, menos para una mano.` });
  }
  if (a.ai != null && b.ai != null && a.ai !== b.ai) {
    const w = a.ai ? a : b;
    big.push({ topic: 'Software', winner: w.id, text: `Solo ${name(w)} es compatible con Apple Intelligence y las funciones de Siri con IA.` });
  }
  if (a.osStatus && b.osStatus && OS_RANK[a.osStatus] !== OS_RANK[b.osStatus]) {
    const w = OS_RANK[a.osStatus] > OS_RANK[b.osStatus] ? a : b, l = w === a ? b : a;
    big.push({ topic: 'Soporte', winner: w.id, text: `${name(l)} ${l.osStatus === 'sin-soporte' ? 'ya no recibe actualizaciones del sistema' : 'está al final de su ciclo de actualizaciones'}; ${name(w)} sigue al día.` });
  }
  return { big, small };
}

function featureScore(p, ps) {
  const parts = [];
  const ratio = (get) => {
    const vals = ps.map(get);
    if (vals.some((v) => v == null)) return;
    parts.push(get(p) / Math.max(...vals));
  };
  ratio((x) => x.hours);
  ratio((x) => x.hz);
  if (ps.every((x) => x.track && x.track === ps[0].track && x.chipGen)) ratio((x) => x.chipGen);
  ratio((x) => lenses(x));
  if (ps.every((x) => x.ai != null)) parts.push(p.ai ? 1 : 0.6);
  if (ps.every((x) => x.osStatus)) parts.push((OS_RANK[p.osStatus] + 1) / 3);
  return parts.length ? parts.reduce((s, v) => s + v, 0) / parts.length : 0.5;
}

export function compare(ps) {
  const rows = tableRows(ps);
  const cats = new Set(ps.map(categoryOf));
  const caveats = ['Los precios son los de lanzamiento en Estados Unidos (USD, sin impuestos). El precio actual varía según tienda y país y no se incluye por no disponer de una fuente fiable y actualizada.'];
  const partial = ps.filter((p) => p.verified === 'parcial');
  if (partial.length) caveats.push(`${partial.map((p) => p.name).join(' y ')}: ficha con verificación parcial por ser un producto reciente. Las dimensiones sin dato no intervienen en el veredicto.`);
  if (cats.size > 1 || cats.has('clasico') || cats.has('accesorio')) {
    return { rows, verdict: { comparable: false, headline: 'Son productos de categorías distintas', text: 'Puedes ver las especificaciones lado a lado, pero un veredicto de compra entre categorías diferentes no tendría sentido: no compiten por el mismo uso.', caveats } };
  }

  const scored = ps.map((p) => {
    const f = featureScore(p, ps);
    const overall = 0.6 * f + 0.4 * BUY_RANK[p.buy?.v ?? 'depende'];
    return { p, f, overall, value: p.price ? overall / p.price : 0 };
  });
  const pick = [...scored].sort((a, b) => b.overall - a.overall)[0];
  const usable = scored.filter((s) => s.p.buy?.v !== 'no' && s.p.price);
  const value = [...(usable.length ? usable : scored)].sort((a, b) => b.value - a.value)[0];

  const priced = ps.filter((p) => p.price).sort((a, b) => a.price - b.price || a.released.localeCompare(b.released));
  const cheap = priced[0], dear = priced[priced.length - 1];
  const d = ps.length === 2 ? diff(ps[0], ps[1]) : (cheap && dear && cheap !== dear ? diff(cheap, dear) : { big: [], small: [] });

  // ¿Merece la pena pagar más?
  let worthMore = null;
  if (cheap && dear && cheap !== dear) {
    const gap = dear.price - cheap.price;
    const lead = gap > 0 ? `Los ${fmtUSD(gap)} de diferencia de salida compran` : 'Salieron al mismo precio, pero el más reciente ofrece';
    const wins = d.big.filter((x) => x.winner === dear.id);
    const losses = d.big.filter((x) => x.winner === cheap.id);
    if (wins.length >= 2) worthMore = `${lead} mejoras que se notan (${wins.map((w) => w.topic.toLowerCase()).join(', ')}). Compensa si esas áreas te importan; si no, ${cheap.name} cumple.`;
    else if (wins.length === 1) worthMore = `${gap > 0 ? `Por ${fmtUSD(gap)} más, ` : ''}${dear.name} solo aporta una ventaja clara (${wins[0].topic.toLowerCase()}). Págalos únicamente si esa mejora es importante para ti.`;
    else worthMore = `Con los datos de las fichas, ${dear.name} no ofrece ninguna ventaja que se note en el uso diario frente a ${cheap.name}. ${gap > 0 ? `No merece la pena pagar ${fmtUSD(gap)} más.` : 'Elige por precio real de tienda.'}`;
    if (losses.length) worthMore += ` Ojo: ${cheap.name} incluso gana en ${losses.map((w) => w.topic.toLowerCase()).join(' y ')}.`;
  }

  // ¿Actualización importante o incremental? (solo entre generaciones de una misma línea)
  let upgrade = null;
  const byDate = [...ps].sort((a, b) => a.released.localeCompare(b.released));
  const old = byDate[0], neu = byDate[byDate.length - 1];
  if (old.line === neu.line && old !== neu) {
    const dd = ps.length === 2 ? d : diff(old, neu);
    const n = dd.big.filter((x) => x.winner === neu.id).length;
    upgrade = n >= 3 ? { kind: 'importante', text: `De ${old.name} a ${neu.name} hay un salto importante: ${n} mejoras que se notan.` }
      : n >= 1 ? { kind: 'moderada', text: `De ${old.name} a ${neu.name} hay una mejora moderada: ${n === 1 ? 'un cambio' : `${n} cambios`} que se nota${n === 1 ? '' : 'n'} y el resto son retoques.` }
      : { kind: 'incremental', text: `${neu.name} es una actualización incremental sobre ${old.name}: no hay diferencias que vayas a notar en el día a día.` };
  }

  // Para quién es cada uno.
  const profiles = [];
  const ok = ps.filter((p) => p.buy?.v !== 'no');
  const pool = ok.length ? ok : ps;
  const add = (who, p, why) => { if (p) profiles.push({ who, id: p.id, name: p.name, why }); };
  const pricedPool = pool.filter((p) => p.price).sort((a, b) => a.price - b.price);
  add('Si quieres gastar lo justo', pricedPool[0], pricedPool[0] && `Es el más económico de salida (${fmtUSD(pricedPool[0].price)}) y sigue siendo una compra razonable.`);
  if (pool.every((p) => p.hours)) { const b = [...pool].sort((x, y) => y.hours - x.hours)[0]; add('Si priorizas la batería', b, `${b.hours} h en la cifra de referencia de Apple, la más alta de la comparación.`); }
  if (pool.every((p) => lenses(p))) { const b = [...pool].sort((x, y) => lenses(y) - lenses(x) || y.released.localeCompare(x.released))[0]; if (pool.some((p) => lenses(p) !== lenses(b))) add('Si haces muchas fotos y vídeo', b, 'Tiene el sistema de cámaras más completo.'); }
  if (pool.every((p) => p.weight)) { const b = [...pool].sort((x, y) => x.weight - y.weight)[0]; if (pool.some((p) => p.weight / b.weight > 1.1)) add('Si buscas ligereza', b, `Es el más ligero (${b.weight.toLocaleString('es-ES')} g).`); }
  if (pool.every((p) => p.track === pool[0].track && p.chipGen)) { const b = [...pool].sort((x, y) => y.chipGen - x.chipGen)[0]; if (pool.some((p) => p.chipGen !== b.chipGen)) add('Si lo quieres para muchos años o tareas exigentes', b, `Monta el chip más reciente (${b.chip}).`); }

  const pickWhy = pick.p === value.p
    ? `${pick.p.name} es a la vez el más equilibrado y el que mejor aprovecha cada dólar. ${pick.p.buy?.text ?? ''}`
    : `${pick.p.buy?.text ?? ''}`;

  return {
    rows,
    verdict: {
      comparable: true,
      pick: { id: pick.p.id, name: pick.p.name, why: pickWhy.trim() },
      value: { id: value.p.id, name: value.p.name, why: value.p === pick.p ? 'Coincide con la recomendación principal.' : `Sale ${fmtUSD(pick.p.price - value.p.price)} más barato de salida y conserva lo esencial. ${value.p.buy?.text ?? ''}`.trim() },
      noticeable: d.big, minor: d.small, worthMore, upgrade, profiles, caveats,
      method: 'Veredicto calculado por un motor de reglas a partir de las especificaciones verificadas y la valoración editorial de cada ficha. No favorece al modelo más caro ni al más nuevo: pondera autonomía, pantalla, chip, cámaras, soporte de software y precio.',
    },
  };
}
