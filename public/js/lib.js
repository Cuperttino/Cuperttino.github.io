// Utilidades compartidas del frontend.
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => MAP[c]);

class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s ?? ''));
const val = (v) => (v instanceof Raw ? v.s : Array.isArray(v) ? v.map(val).join('') : v == null ? '' : esc(v));
// Plantilla HTML con escapado automático de todos los valores interpolados.
export const html = (strings, ...vals) => new Raw(strings.reduce((out, s, i) => out + s + (i < vals.length ? val(vals[i]) : ''), ''));

// Todas las peticiones pasan por backend.js: servidor Node en local, o motor en el navegador en la versión estática.
export { request as api } from './backend.js';
import { request as api } from './backend.js';

// Caché en memoria del catálogo (se pide una sola vez por sesión).
let catalog;
export const getCatalog = () => (catalog ??= api('/api/products').catch((e) => { catalog = null; throw e; }));

export const session = { user: null, ready: null, static: false };
export const loadSession = () => (session.ready = Promise.all([api('/api/auth/me'), api('/api/config')]).then(([d, c]) => { session.user = d.user; session.static = !!c.static; }).catch(() => { session.user = null; }));

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const fmtMonth = (ym) => { if (!ym) return ''; const [y, m] = ym.split('-'); return m ? `${MONTHS[Number(m) - 1]} de ${y}` : y; };
export const fmtEuro = (n) => (n == null ? null : `${Number(n).toLocaleString('es-ES')} €`);
export const fmtPrice = (p) => (p.priceEUR != null ? fmtEuro(p.priceEUR) : p.price != null ? fmtUSD(p.price) : null);
export const fmtUSD = (n) => (n == null ? null : `${Number(n).toLocaleString('es-ES')} $`);
export const fmtEUR = (n) => (n == null ? null : Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }));
export const fmtWeight = (g) => (g == null ? null : g >= 1000 ? `${(g / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg` : `${g.toLocaleString('es-ES')} g`);
export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  if (s < 86400 * 7) return `hace ${Math.round(s / 86400)} d`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
export const NA = raw('<span class="na">Sin dato verificado</span>');
export const KIND = { oficial: 'Oficial', rumor: 'Rumor · no oficial', opinion: 'Análisis y opinión', noticia: 'Noticia' };
export const STATUS = { actual: 'En catálogo', anterior: 'Generación anterior', historico: 'Histórico' };
export const BUY = { si: 'Sí, merece la pena', depende: 'Depende', no: 'No recomendable hoy' };

export function toast(message, kind = 'ok') {
  const box = document.getElementById('toasts');
  const t = document.createElement('div'); t.className = `toast toast--${kind}`; t.setAttribute('role', 'status'); t.textContent = message;
  box.appendChild(t); requestAnimationFrame(() => t.classList.add('is-in'));
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 400); }, 3600);
}

export const icon = (name) => raw(`<svg class="i" aria-hidden="true"><use href="/icons.svg#${name}"/></svg>`);
export const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
