import iphone from './iphone.js';
import mac from './mac.js';
import others from './others.js';

import { PRICES_EUR } from './prices-eur.js';

export const PRODUCTS = [...iphone, ...mac, ...others].map((p) => ({ ...p, priceEUR: PRICES_EUR[p.id]?.[0] ?? null, priceEURNote: PRICES_EUR[p.id]?.[1] ?? null }));
export const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

export const FAMILIES = ['iPhone', 'iPad', 'MacBook Air', 'MacBook Pro', 'MacBook', 'iMac', 'Mac mini', 'Mac Studio', 'Mac Pro',
  'Apple Watch', 'AirPods', 'AirPods Max', 'Apple TV', 'HomePod', 'Apple Vision Pro', 'Accesorios', 'Clásicos'];

// Categoría amplia: solo se comparan con veredicto productos de la misma categoría.
const CATEGORY = {
  iPhone: 'telefono', iPad: 'tableta', 'MacBook Air': 'portatil', 'MacBook Pro': 'portatil', MacBook: 'portatil',
  iMac: 'sobremesa', 'Mac mini': 'sobremesa', 'Mac Studio': 'sobremesa', 'Mac Pro': 'sobremesa',
  'Apple Watch': 'reloj', AirPods: 'auriculares', 'AirPods Max': 'auriculares', 'Apple TV': 'hogar', HomePod: 'hogar',
  'Apple Vision Pro': 'visor', Accesorios: 'accesorio', 'Clásicos': 'clasico',
};
export const categoryOf = (p) => CATEGORY[p.family] || 'otro';

// Producto vigente más reciente de la misma línea (sucesor directo), si existe y es distinto.
export function successorOf(p) {
  const same = PRODUCTS.filter((x) => x.line === p.line && x.released > p.released).sort((a, b) => b.released.localeCompare(a.released));
  return same[0] || null;
}

export const summary = (p) => ({
  id: p.id, family: p.family, name: p.name, gen: p.gen, year: p.year, released: p.released, status: p.status,
  verified: p.verified, price: p.price, priceEUR: p.priceEUR, chip: p.chip, colors: p.colors, storage: p.storage, buy: p.buy?.v,
});
