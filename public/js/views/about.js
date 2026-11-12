import { html, api, session } from '../lib.js';

export default async function about({ el }) {
  const news = await api('/api/news?limit=1').catch(() => ({ sources: [] }));
  el.innerHTML = html`<div class="wrap"><header class="page-head"><span class="eyebrow" data-reveal>Cómo trabajamos</span><h1 class="h1" data-split>Las reglas del huerto</h1></header>
  <div class="prose" style="padding-bottom:80px" data-reveal>
    <p class="lede">Pomar es una web independiente hecha por aficionados. No está afiliada a Apple ni recibe comisiones por lo que recomienda.</p>
    <h2 class="h2">Noticias</h2>
    <p>Los titulares proceden de los feeds RSS públicos de cada medio. Mostramos titular, un extracto breve, la fecha y un enlace al artículo original; no reproducimos el contenido ni sus imágenes. Solo Apple Newsroom se etiqueta como «oficial». Los rumores se detectan por el lenguaje del titular y se marcan siempre como no oficiales; la clasificación es automática y puede equivocarse.</p>
    <ul>${news.sources.map((s) => html`<li><a href="${s.site}" target="_blank" rel="noopener noreferrer">${s.name}</a>${s.official ? ' (fuente oficial)' : ''}</li>`)}</ul>
    <h2 class="h2">Fichas de producto</h2>
    <p>Los precios son los de lanzamiento en Estados Unidos, en dólares y sin impuestos, porque es la referencia más estable y verificable. No publicamos «precio actual» porque cambia cada semana según tienda y país.</p>
    <p>Los productos lanzados en los últimos meses llevan la etiqueta «ficha parcial»: solo incluimos los datos contrastados con las fuentes enlazadas en cada ficha, y lo demás figura como «Sin dato verificado».</p>
    <h2 class="h2">Fotografías</h2>
    <p>Las galerías muestran fotografías reales con licencia libre obtenidas de <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>, siempre con el nombre del autor, la licencia y un enlace a la página original. La búsqueda es automática por nombre de producto, así que puede colarse alguna imagen imprecisa, y los productos muy recientes pueden no tener fotos todavía. Quien instala Pomar puede añadir sus propias fotos a cada ficha. No usamos las imágenes de prensa de Apple porque no tenemos licencia para redistribuirlas.</p>
    <h2 class="h2">Veredictos y asesor</h2>
    <p>El comparador y el asesor del ecosistema funcionan con un motor de reglas transparente que pondera autonomía, pantalla, chip, cámaras, soporte de software y precio, junto con la valoración editorial de cada ficha. No favorecen al modelo más caro ni al más nuevo, y «no lo cambies» es una respuesta habitual. La opinión ampliada con IA es opcional y solo se activa si quien instala Pomar configura una clave en el servidor.</p>
    <h2 class="h2">Tus datos</h2>
    <p>${session.static ? 'Esta versión publicada no tiene servidor: tu perfil y tus dispositivos se guardan únicamente en tu navegador y no salen de él. No hay cuentas ni contraseñas.' : 'La cuenta y tus dispositivos se guardan en la base de datos de esta instalación. La contraseña se almacena cifrada con scrypt y la sesión viaja en una cookie que el navegador no expone a scripts.'}</p>
  </div></div>`;
  return 'Cómo trabajamos';
}
