// Buscador global: dispositivos, sistemas, noticias en caché, artículos y comparativas sugeridas.
import { PRODUCTS, successorOf } from './data/products.js';
import { OS, TIMELINE, TIPS, TRIVIA, TECH, SILICON } from './data/content.js';

export const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function score(haystacks, terms) {
  let total = 0;
  for (const t of terms) {
    let best = 0;
    haystacks.forEach(([text, weight]) => {
      const n = norm(text);
      if (n === t) best = Math.max(best, weight * 3);
      else if (n.startsWith(t) || n.includes(` ${t}`)) best = Math.max(best, weight * 2);
      else if (n.includes(t)) best = Math.max(best, weight);
    });
    if (!best) return 0; // todos los términos deben aparecer
    total += best;
  }
  return total;
}
const top = (list, n) => list.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, n).map(({ s, ...rest }) => rest);

export function search(query, newsItems = [], limit = 6) {
  const q = norm(query).trim();
  if (q.length < 2) return { query, groups: [] };
  const vs = q.split(/\s+(?:vs\.?|contra|frente a)\s+/);
  const terms = q.replace(/\b(vs\.?|contra)\b/g, ' ').split(/\s+/).filter(Boolean);

  const prodScore = (p, t) => score([[p.name, 5], [p.family, 3], [p.chip, 2], [p.gen, 1], [String(p.year), 1]], t);
  const products = top(PRODUCTS.map((p) => ({ s: prodScore(p, terms) && prodScore(p, terms) + (p.status === 'actual' ? 0.5 : 0) + (norm(p.name) === q ? 100 : 0), type: 'producto', id: p.id, title: p.name, sub: `${p.family} · ${p.year}`, url: `/producto/${p.id}` })), limit);

  const comparisons = [];
  if (vs.length === 2) {
    const find = (part) => PRODUCTS.map((p) => ({ p, s: prodScore(p, part.split(/\s+/).filter(Boolean)) + (norm(p.name) === part.trim() ? 100 : 0) - norm(p.name).length / 100 })).filter((x) => x.s > 1).sort((a, b) => b.s - a.s || b.p.released.localeCompare(a.p.released))[0]?.p;
    const a = find(vs[0]), b = find(vs[1]);
    if (a && b && a !== b) comparisons.push({ type: 'comparativa', title: `${a.name} vs ${b.name}`, sub: 'Abrir en el comparador', url: `/comparar?ids=${a.id},${b.id}` });
  }
  for (const r of products.slice(0, 2)) {
    const p = PRODUCTS.find((x) => x.id === r.id), s = successorOf(p);
    const prev = PRODUCTS.filter((x) => x.line === p.line && x.released < p.released).sort((x, y) => y.released.localeCompare(x.released))[0];
    const other = s || prev;
    if (other && comparisons.length < 3) comparisons.push({ type: 'comparativa', title: `${p.name} vs ${other.name}`, sub: 'Abrir en el comparador', url: `/comparar?ids=${p.id},${other.id}` });
  }

  const systems = top(OS.map((o) => ({ s: score([[o.name, 5], [o.current, 4], [o.device, 2], [o.note, 1]], terms), type: 'sistema', title: o.name, sub: `Versión actual: ${o.current}`, url: `/sistemas#${o.id}` })), 4);

  const articles = top([
    ...TIMELINE.map((t) => ({ s: score([[t.title, 4], [t.text, 1], [String(t.year), 2]], terms), type: 'historia', title: `${t.year} · ${t.title}`, sub: t.text, url: '/descubrir#historia' })),
    ...SILICON.map((t) => ({ s: score([[t.chip, 4], [t.text, 1]], terms), type: 'historia', title: `Apple Silicon · ${t.chip}`, sub: t.text, url: '/descubrir#silicon' })),
    ...TIPS.map((t) => ({ s: score([[t.title, 4], [t.text, 1], [t.os, 2]], terms), type: 'truco', title: `${t.os} · ${t.title}`, sub: t.text, url: '/descubrir#trucos' })),
    ...TECH.map((t) => ({ s: score([[t.title, 4], [t.text, 1]], terms), type: 'tecnologia', title: t.title, sub: t.text, url: '/descubrir#tecnologias' })),
  ], limit);

  const curiosities = top([
    ...TRIVIA.map((t) => ({ s: score([[t.title, 4], [t.text, 1]], terms), type: 'curiosidad', title: t.title, sub: t.text, url: '/descubrir#curiosidades' })),
    ...PRODUCTS.flatMap((p) => (p.trivia || []).map((t) => ({ s: score([[t, 1]], terms), type: 'curiosidad', title: p.name, sub: t, url: `/producto/${p.id}` }))),
  ], 5);

  const news = top(newsItems.map((n) => ({ s: score([[n.title, 3], [n.excerpt, 1], [n.sourceName, 1]], terms), type: 'noticia', title: n.title, sub: `${n.sourceName} · ${n.date.slice(0, 10)}`, url: n.link, external: true, kind: n.kind })), limit);

  const groups = [
    ['Dispositivos', products], ['Comparativas', comparisons], ['Sistemas operativos', systems],
    ['Noticias', news], ['Artículos', articles], ['Curiosidades', curiosities],
  ].filter(([, items]) => items.length).map(([label, items]) => ({ label, items }));
  return { query, groups };
}
