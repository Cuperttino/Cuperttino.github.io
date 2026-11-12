// Pruebas básicas: node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, classify, isRelevant } from '../server/news.js';
import { PRODUCTS, byId } from '../server/data/products.js';
import { compare } from '../server/compare.js';
import { advise } from '../server/advisor.js';
import { search } from '../server/search.js';
import { pickPhotos, photoQuery } from '../server/photos.js';

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Demo</title>
<item><title><![CDATA[Apple &amp; friends: a &#8220;test&#8221;]]></title><link>https://example.com/a?utm_source=rss&amp;id=1</link><pubDate>Wed, 11 Nov 2026 16:33:39 +0000</pubDate><category>iPhone</category><description><![CDATA[<p>Hola <b>mundo</b></p>]]></description></item>
<item><title>Sin enlace</title><pubDate>Wed, 11 Nov 2026 16:33:39 +0000</pubDate></item></channel></rss>`;
const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><updated>2026-11-10T16:00:26.015Z</updated>
<entry><title>Nota oficial</title><link rel="enclosure" href="https://example.com/img.jpg"/><link href="https://example.com/nota/"/><updated>2026-11-10T16:00:26.015Z</updated><content type="html">&lt;p&gt;Texto&lt;/p&gt;</content></entry></feed>`;

test('parseFeed lee RSS 2.0, decodifica entidades y descarta entradas sin enlace', () => {
  const items = parseFeed(RSS);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Apple & friends: a “test”');
  assert.equal(items[0].link, 'https://example.com/a?id=1');
  assert.equal(items[0].excerpt, 'Hola mundo');
  assert.equal(items[0].date, '2026-11-11T16:33:39.000Z');
});
test('parseFeed lee Atom e ignora los enlaces de tipo enclosure', () => {
  const [item] = parseFeed(ATOM);
  assert.equal(item.link, 'https://example.com/nota/');
  assert.equal(item.excerpt, 'Texto');
});
test('classify distingue oficial, rumor, opinión y noticia', () => {
  const it = (title) => ({ title, categories: [] });
  assert.equal(classify(it('Apple unveils X'), { official: true }).kind, 'oficial');
  assert.equal(classify(it('iPhone 18 rumored to get larger battery'), {}).kind, 'rumor');
  assert.equal(classify(it('iPad mini 8 review: hands-on'), {}).kind, 'opinion');
  assert.equal(classify(it('watchOS 27.3 adds three features'), {}).kind, 'noticia');
  assert.equal(classify(it('El iPhone 18 tendría una batería mayor, según una filtración'), {}).kind, 'rumor');
  assert.equal(classify(it('Análisis del iPad mini 8: tras dos semanas de uso'), {}).kind, 'opinion');
  assert.equal(classify(it('Apple lanza iOS 27.3 con tres novedades'), {}).kind, 'noticia');
  assert.equal(isRelevant(it('Lidl lanza unas botas impermeables por 19,99 €'), {}), false);
  assert.equal(isRelevant(it('El nuevo MacBook Pro llega a las tiendas'), {}), true);
  assert.ok(classify(it('watchOS 27.3 adds three features'), {}).topics.includes('Apple Watch'));
});
test('el catálogo es coherente', () => {
  assert.equal(new Set(PRODUCTS.map((p) => p.id)).size, PRODUCTS.length);
  for (const p of PRODUCTS) {
    assert.match(p.released, /^\d{4}-\d{2}$/, p.id);
    assert.ok(['si', 'depende', 'no'].includes(p.buy.v), p.id);
    assert.ok(p.sources?.length && p.highlights?.length && p.trivia?.length, p.id);
  }
});
test('el comparador no favorece siempre al más nuevo ni al más caro', () => {
  const v = compare([byId.get('iphone-17-pro'), byId.get('iphone-18-pro')]).verdict;
  assert.equal(v.pick.id, 'iphone-17-pro');
  assert.equal(v.upgrade.kind, 'incremental');
  const v2 = compare([byId.get('iphone-13'), byId.get('iphone-17')]).verdict;
  assert.equal(v2.pick.id, 'iphone-17');
  assert.equal(v2.upgrade.kind, 'importante');
  assert.equal(compare([byId.get('iphone-17'), byId.get('macbook-air-m4')]).verdict.comparable, false);
});
test('el asesor sabe decir «no lo cambies» y detecta lo obsoleto', () => {
  const a = advise([{ id: 1, product_id: 'macbook-air-m4', purchased_at: '2025-04' }, { id: 2, product_id: 'iphone-x', purchased_at: '2018-01' }]);
  assert.equal(a.items.find((i) => i.productId === 'macbook-air-m4').priority, 'ninguna');
  assert.equal(a.items.find((i) => i.productId === 'iphone-x').priority, 'alta');
});
test('el buscador encuentra productos y propone comparativas', () => {
  const r = search('iphone 17 vs 18 pro');
  assert.equal(r.groups.find((g) => g.label === 'Comparativas').items[0].title, 'iPhone 17 vs iPhone 18 Pro');
  assert.ok(search('trackpad').groups.length > 0);
});
test('la galería filtra por licencia, tamaño y variante de modelo', () => {
  const info = (extra = {}) => ({ thumburl: 'https://upload.wikimedia.org/x.jpg', url: 'https://upload.wikimedia.org/x-full.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:x', mime: 'image/jpeg', width: 3000, height: 2000, extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a href="#">Ana</a>' } }, ...extra });
  const pages = {
    1: { index: 2, title: 'File:IPhone 17 back.jpg', imageinfo: [info()] },
    2: { index: 1, title: 'File:IPhone 17 Pro Max.jpg', imageinfo: [info()] },
    3: { index: 3, title: 'File:IPhone 17 logo.png', imageinfo: [info({ mime: 'image/png' })] },
    4: { index: 4, title: 'File:IPhone 17 tiny.jpg', imageinfo: [info({ width: 300 })] },
    5: { index: 5, title: 'File:IPhone 17 front.jpg', imageinfo: [info({ extmetadata: {} })] },
  };
  const out = pickPhotos(pages, 'iPhone 17');
  assert.equal(out.length, 1);
  assert.equal(out[0].author, 'Ana');
  assert.equal(out[0].license, 'CC BY-SA 4.0');
  assert.equal(pickPhotos(pages, 'iPhone 17 Pro Max').length, 1);
  assert.equal(photoQuery(byId.get('macbook-air-m4')), 'MacBook Air M4');
  assert.equal(pickPhotos({ 1: { title: 'File:IPhone17 rear.jpg', imageinfo: [info()] }, 2: { title: 'File:Orange phone.jpg', imageinfo: [info()] } }, 'iPhone 17').length, 1);
  assert.equal(pickPhotos({ 2: { title: 'File:Orange phone.jpg', imageinfo: [info()] } }, 'iPhone 17', 8, false).length, 1);
});
