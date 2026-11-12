# Pomar

Plataforma independiente para aficionados a Apple: actualidad en directo, enciclopedia de productos con galería de fotos, comparador con veredicto, gestor del ecosistema personal con asesor de compras y una sección para descubrir la historia y los trucos de la marca.

> Pomar no está afiliada a Apple Inc. Tiene identidad propia y no usa el logotipo ni las imágenes de prensa de Apple.

## Ponerla en marcha

Necesitas [Node.js](https://nodejs.org) 20 o superior (recomendado 22.5+ para usar SQLite). No hay dependencias que instalar.

```bash
cd pomar
npm start
```

Abre <http://localhost:4173>. Para desarrollo con recarga del servidor: `npm run dev`. Pruebas: `npm test`.

## Qué funciona y de dónde salen los datos

| Sección | Cómo funciona |
| --- | --- |
| **Actualidad** | Feeds RSS/Atom reales en español: Apple Newsroom (edición de España) y medios especializados (Applesfera, Actualidad iPhone, Soy de Mac y otros; lista en `server/news.js`). Se actualizan solos cada 15 min, con caché en disco y aviso si una fuente falla. Solo titular, extracto, fecha y enlace al original (sin imágenes de los medios). Cada titular se clasifica como oficial, rumor, análisis o noticia. |
| **Enciclopedia** | Fichas en `server/data/`. Precios de lanzamiento en EE. UU. Los productos de otoño de 2026 llevan «ficha parcial»: solo datos contrastados; lo demás aparece como «Sin dato verificado». |
| **Fotos** | Galería por producto con las imágenes oficiales de la nota de prensa de Apple Newsroom (mapa en `server/data/apple-press.js`; el propietario declara tener permiso de Apple). Si no hay nota, fotos libres de Wikimedia Commons. Tus propias fotos en `public/fotos/<id>/` tienen prioridad. |
| **Comparador** | De 2 a 4 productos. Tabla + veredicto de un motor de reglas (`server/compare.js`) que no favorece al más caro ni al más nuevo. |
| **Mi ecosistema** | Cuentas con contraseña cifrada (scrypt), sesión en cookie HttpOnly, dispositivos guardados en SQLite (`data/pomar.db`). |
| **Asesor** | `server/advisor.js`: prioridad, motivo, alternativa, diferencias, beneficio y «ahora o esperar» por dispositivo. Sabe decir «no lo cambies». |
| **Buscador** | ⌘K o `/`. Dispositivos, noticias, sistemas, artículos, curiosidades y comparativas sugeridas. |

## Dos formas de ejecutarla

**1. Completa, con servidor (en tu ordenador o en un alojamiento con Node).** `npm start`. Incluye cuentas con contraseña, base de datos SQLite, noticias actualizadas por el propio servidor y la opinión con IA opcional.

**2. Estática, en GitHub Pages (la que se publica desde este repositorio).** GitHub Pages no ejecuta servidores, así que `scripts/build-static.mjs` genera una versión que resuelve todo en el navegador:

- Catálogo, comparador, asesor y buscador usan exactamente los mismos módulos que el servidor.
- Las noticias las descarga GitHub Actions cada hora (`scripts/fetch-news.mjs`) y las publica en `news.json`.
- Las fotos se piden directamente a Wikimedia Commons desde el navegador.
- **Mi ecosistema se guarda en el navegador del visitante** (localStorage): no hay cuentas ni contraseñas, y no se sincroniza entre dispositivos.
- La opinión con IA no está disponible (necesita una clave que no puede vivir en una web estática).

El workflow `.github/workflows/update-and-deploy.yml` ejecuta las pruebas, construye `dist/` y lo publica en cada push a `main`, cada hora y a mano desde la pestaña Actions.

## Publicar la versión completa (con cuentas)

La versión completa necesita un alojamiento que ejecute Node. El repositorio incluye `render.yaml` para [Render](https://render.com):

1. Entra en render.com e inicia sesión con tu cuenta de GitHub.
2. **New → Blueprint**, elige este repositorio y pulsa **Apply**.
3. En un par de minutos tendrás una dirección `https://pomar-xxxx.onrender.com` con la web completa.

En el plan gratuito de Render el servicio se duerme tras un rato sin visitas (la primera carga tarda) y **el disco no es permanente**: las cuentas y dispositivos se borran en cada reinicio. Para conservarlos hace falta un plan con disco persistente montado en `data/`, o cualquier otro alojamiento con disco (un VPS, Fly.io, Railway…): basta con `npm start` y las variables `HOST=0.0.0.0` y `NODE_ENV=production`.

## Credenciales opcionales

Nada es obligatorio. Copia `.env.example` como `.env` si quieres cambiar algo.

| Variable | Para qué |
| --- | --- |
| `ANTHROPIC_API_KEY` + `AI_MODEL` | Activa la «opinión ampliada con IA» del comparador. La clave se queda en el servidor; el navegador nunca la ve. Sin ella, el veredicto por reglas funciona igual. |
| `PORT`, `HOST` | Puerto y dirección del servidor. |
| `SITE_URL`, `NODE_ENV=production` | Solo al publicar: URL canónica/sitemap y cookies `Secure`. |

## Estructura

```
server/   index.js (HTTP, API, estáticos, SEO) · db.js · auth.js · news.js · photos.js
          compare.js · advisor.js · search.js · ai.js · data/ (fichas y contenidos)
scripts/  build-static.mjs · fetch-news.mjs · static-backend.js (versión para GitHub Pages)
public/   index.html · css/app.css · js/ (app.js, motion.js, ui.js, views/) · fotos/
test/     pruebas del parser de feeds, catálogo, comparador, asesor, buscador y galería
data/     se crea al arrancar: base de datos y cachés (no se versiona)
```

## Limitaciones conocidas

- La clasificación de rumores es automática (por el lenguaje del titular) y puede fallar.
- La búsqueda de fotos en Commons es automática: puede no encontrar nada para productos muy recientes, o colar alguna imagen imprecisa. Corrígelo con fotos propias.
- No hay «precio actual»: no existe una fuente fiable y gratuita que lo dé por país.
- Recuperación de contraseña por correo: no implementada (requeriría un servicio de envío).

