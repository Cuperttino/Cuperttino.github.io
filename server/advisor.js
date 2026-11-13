// Asesor del ecosistema. Regla de oro: no recomendar comprar por comprar.
// Cada dispositivo recibe un dictamen razonado; «no hagas nada» es una respuesta válida y frecuente.
import { byId, successorOf, categoryOf, PRODUCTS } from './data/products.js';
import { diff } from './compare.js';

// Renovaciones esperadas según medios (rumores, no anuncios de Apple).
const EXPECTED = {
  iphone: { text: 'Los medios sitúan el iPhone 18 estándar en la primavera de 2027.', rumor: true },
  'iphone-e': { text: 'Se espera un iPhone 18e en la primavera de 2027.', rumor: true },
  ipad: { text: 'Bloomberg apunta a un nuevo iPad básico en la primera mitad de 2027.', rumor: true },
  'ipad-air': { text: 'Bloomberg apunta a un nuevo iPad Air en la primera mitad de 2027.', rumor: true },
  'ipad-pro': { text: 'Bloomberg apunta a un nuevo iPad Pro en la primera mitad de 2027.', rumor: true },
};
const BATTERY_CATS = new Set(['telefono', 'reloj', 'auriculares']);
const yearsSince = (iso) => (Date.now() - new Date(iso.length === 7 ? `${iso}-01` : iso).getTime()) / (365.25 * 86_400_000);
const monthsSince = (iso) => yearsSince(iso) * 12;

function adviseDevice(d) {
  const p = byId.get(d.product_id);
  if (!p) return null;
  const base = { deviceId: d.id, productId: p.id, name: d.nickname || p.name, model: p.name };
  const age = yearsSince(d.purchased_at || p.released);
  const ageText = age < 1 ? 'menos de un año' : `${Math.floor(age)} ${Math.floor(age) === 1 ? 'año' : 'años'}`;
  const cat = categoryOf(p);
  const succ = successorOf(p);
  // Mejor compra de la línea: el más reciente con valoración «sí»; si no, el sucesor directo.
  const line = PRODUCTS.filter((x) => x.line === p.line && x.released > p.released).sort((a, b) => b.released.localeCompare(a.released));
  const alt = line.find((x) => x.buy?.v === 'si') || succ;

  if (cat === 'clasico' || p.year < 2012) {
    return { ...base, priority: 'ninguna', action: 'conservar', headline: 'Pieza de colección', reason: 'Es un modelo histórico. No tiene sentido «actualizarlo»: su valor es otro. Cuídalo.', alternative: null, differences: [], benefit: null, timing: null };
  }
  if (!succ) {
    return { ...base, priority: 'ninguna', action: 'conservar', headline: 'Es el modelo vigente de su línea',
      reason: `No existe un sucesor directo de ${p.name}. No hay nada que actualizar.`, alternative: null, differences: [], benefit: null,
      timing: EXPECTED[p.line] ? { verdict: 'nada que hacer', text: EXPECTED[p.line].text, rumor: true } : null };
  }

  const dd = diff(p, alt);
  const gains = dd.big.filter((x) => x.winner === alt.id);
  const differences = gains.map((g) => g.text);
  const minor = dd.small.map((g) => g.text);
  const altInfo = { id: alt.id, name: alt.name, price: alt.price, priceEUR: alt.priceEUR, verified: alt.verified, note: alt.buy?.text || null };
  const recent = monthsSince(alt.released) <= 4;
  const expected = EXPECTED[p.line];
  let timing = expected ? { verdict: 'esperar', text: `${expected.text} Si no tienes prisa, espera.`, rumor: true }
    : recent ? { verdict: 'ahora', text: `${alt.name} se acaba de renovar (${alt.released}); no se espera relevo cercano.`, rumor: false }
    : { verdict: 'sin prisa', text: 'No hay un relevo anunciado. Si decides cambiar, aprovecha rebajas puntuales.', rumor: false };

  if (p.osStatus === 'sin-soporte') {
    return { ...base, priority: 'alta', action: 'actualizar', headline: 'Ya no recibe actualizaciones de seguridad',
      reason: `${p.name} dejó de recibir versiones del sistema. Seguir usándolo con tus cuentas y datos bancarios es un riesgo real, y cada vez más apps dejarán de funcionar.`,
      alternative: altInfo, differences, minor, benefit: 'Recuperas parches de seguridad, compatibilidad con apps y años de soporte.', timing };
  }
  if (p.osStatus === 'limitado') {
    return { ...base, priority: 'media', action: 'planificar', headline: 'Está al final de su ciclo de soporte',
      reason: `${p.name} sigue funcionando, pero está en la frontera de las actualizaciones del sistema. No corre prisa hoy; conviene ir planificando el relevo.`,
      alternative: altInfo, differences, minor, benefit: gains.length ? `Mejoras que notarías: ${gains.map((g) => g.topic.toLowerCase()).join(', ')}.` : 'Sobre todo, más años de soporte.', timing };
  }

  const batteryNote = BATTERY_CATS.has(cat) && age >= 3
    ? ` Con ${ageText} de uso, lo que más habrás notado es la batería: ${cat === 'auriculares' ? 'en unos auriculares no es sustituible fácilmente, así que el desgaste sí puede justificar el cambio' : 'sustituirla en el servicio técnico cuesta una fracción de un dispositivo nuevo y lo deja como el primer día'}.`
    : '';

  if (age < 2 || gains.length === 0) {
    return { ...base, priority: 'ninguna', action: 'conservar', headline: 'Sigue siendo excelente: no lo cambies',
      reason: gains.length === 0
        ? `Frente a ${alt.name} no hay ninguna diferencia que vayas a notar en el uso diario. Cambiarlo sería gastar por gastar.${batteryNote}`
        : `Tiene ${ageText} y le quedan muchos de vida útil. ${alt.name} mejora en ${gains.map((g) => g.topic.toLowerCase()).join(', ')}, pero no lo suficiente para justificar el gasto tan pronto.`,
      alternative: altInfo, differences, minor, benefit: null, timing: { verdict: 'no actualizar', text: 'Disfrútalo. Vuelve a valorarlo cuando cumpla tres o cuatro años.', rumor: false } };
  }
  if (age < 4 && gains.length < 3) {
    return { ...base, priority: 'baja', action: 'opcional', headline: 'Cambio opcional, sin urgencia',
      reason: `Con ${ageText}, ${p.name} sigue rindiendo bien. ${alt.name} aporta ${gains.length === 1 ? 'una mejora apreciable' : 'un par de mejoras apreciables'} (${gains.map((g) => g.topic.toLowerCase()).join(', ')}); solo merece la pena si alguna te resuelve una molestia concreta.${batteryNote}`,
      alternative: altInfo, differences, minor, benefit: `Notarías: ${gains.map((g) => g.topic.toLowerCase()).join(', ')}.`, timing };
  }
  return { ...base, priority: gains.length >= 3 || age >= 5 ? 'media' : 'baja', action: 'valorar', headline: 'Empieza a tener sentido renovarlo',
    reason: `Tras ${ageText}, el salto a ${alt.name} ya es amplio: ${gains.length} mejoras que se notan.${batteryNote}`,
    alternative: altInfo, differences, minor, benefit: `Notarías: ${gains.map((g) => g.topic.toLowerCase()).join(', ')}.`, timing };
}

const ORDER = { alta: 0, media: 1, baja: 2, ninguna: 3 };

export function advise(devices) {
  const items = devices.map(adviseDevice).filter(Boolean).sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
  const owned = devices.map((d) => byId.get(d.product_id)).filter(Boolean);
  const has = (fam) => owned.some((p) => p.family === fam);
  const notes = [];

  // Incompatibilidades y fricciones reales del conjunto.
  const phones = owned.filter((p) => p.family === 'iPhone');
  if (has('Apple Watch') && !phones.length) notes.push({ kind: 'incompatibilidad', text: 'Tienes un Apple Watch pero ningún iPhone registrado. El Apple Watch necesita un iPhone para configurarse y actualizarse.' });
  if (has('Apple Watch') && phones.length && phones.every((p) => p.osStatus === 'sin-soporte')) notes.push({ kind: 'incompatibilidad', text: 'Tu iPhone ya no recibe versiones de iOS: no podrá emparejarse con un Apple Watch reciente ni instalarle las últimas versiones de watchOS.' });
  const lightning = owned.filter((p) => /Lightning/.test(p.connectivity || '') && !/USB-C desde/.test(p.connectivity || ''));
  const usbc = owned.filter((p) => /USB-C|Thunderbolt/.test(p.connectivity || ''));
  if (lightning.length && usbc.length) notes.push({ kind: 'friccion', text: `Convives con dos conectores: ${lightning.map((p) => p.name).join(', ')} ${lightning.length === 1 ? 'usa' : 'usan'} Lightning y el resto USB-C. No es grave, pero implica llevar dos cables.` });
  if (owned.some((p) => p.ai === false) && owned.some((p) => p.ai === true)) notes.push({ kind: 'aviso', text: 'No todos tus dispositivos son compatibles con Apple Intelligence; las funciones de IA no estarán disponibles por igual en todos.' });

  // Accesorios: solo los que completan algo que ya tienes, y siempre como opción.
  const accessories = [];
  const pencilIpad = owned.find((p) => ['ipad-air', 'ipad-pro', 'ipad-mini'].includes(p.line) && p.year >= 2024);
  if (pencilIpad && !owned.some((p) => p.id === 'apple-pencil-pro')) accessories.push({ productId: 'apple-pencil-pro', name: 'Apple Pencil Pro', text: `Tu ${pencilIpad.name} es compatible. Solo tiene sentido si dibujas o tomas apuntes a mano; si no, no lo necesitas.` });
  if (phones.length && !owned.some((p) => p.line === 'airtag')) accessories.push({ productId: 'airtag', name: 'AirTag', text: 'Útil si sueles perder llaves o viajas con maleta facturada. Si no es tu caso, ahórratelo.' });

  const counts = items.reduce((acc, i) => ({ ...acc, [i.priority]: (acc[i.priority] || 0) + 1 }), {});
  const summary = !items.length ? 'Añade tus dispositivos para recibir un análisis.'
    : !counts.alta && !counts.media ? 'Tu ecosistema está en muy buena forma. No hay ninguna compra que recomendarte ahora mismo.'
    : counts.alta ? `Hay ${counts.alta} ${counts.alta === 1 ? 'dispositivo que conviene' : 'dispositivos que conviene'} sustituir por seguridad. El resto puede esperar.`
    : `Nada urgente. ${counts.media} ${counts.media === 1 ? 'dispositivo empieza' : 'dispositivos empiezan'} a pedir relevo; el resto está bien.`;

  return { summary, items, notes, accessories, generatedAt: new Date().toISOString() };
}
