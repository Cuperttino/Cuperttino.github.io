// Sistema de movimiento de Pomar.
// Una sola curva (--ease) y tres duraciones para toda la web. Todo respeta prefers-reduced-motion.
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let io;
function observer() {
  return (io ??= new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }));
}

// Divide un titular en líneas-palabra para la animación tipográfica (conserva el texto accesible).
function split(el) {
  if (el.dataset.splitDone) return; el.dataset.splitDone = '1';
  const text = el.textContent; el.setAttribute('aria-label', text); el.textContent = '';
  text.split(/\s+/).filter(Boolean).forEach((word, i) => {
    const outer = document.createElement('span'); outer.className = 'w'; outer.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('span'); inner.textContent = word; inner.style.setProperty('--i', i);
    outer.appendChild(inner); el.appendChild(outer); el.appendChild(document.createTextNode(' '));
  });
}

// Tras la primera carga, lo que ya está en pantalla al cambiar de página aparece sin animación propia:
// así la única transición visible es el fundido de la vista (evita el efecto de «cargar dos veces»).
let firstLoad = true;
export const markLoaded = () => { firstLoad = false; };

export function scan(root = document) {
  root.querySelectorAll('[data-split]').forEach(split);
  if (reduced()) { root.querySelectorAll('[data-reveal],[data-split]').forEach((el) => el.classList.add('is-in')); return; }
  if (!firstLoad) {
    root.querySelectorAll('[data-stagger]').forEach((group) => [...group.children].forEach((c) => c.setAttribute('data-reveal', '')));
    const limit = innerHeight * 1.05;
    root.querySelectorAll('[data-reveal],[data-split]').forEach((el) => {
      if (el.classList.contains('is-in')) return;
      const r = el.getBoundingClientRect();
      if (r.top < limit && r.bottom > 0) el.classList.add('no-anim', 'is-in');
    });
  }
  // Escalonado: los hijos directos de [data-stagger] entran uno tras otro.
  root.querySelectorAll('[data-stagger]').forEach((group) => [...group.children].forEach((c, i) => { c.setAttribute('data-reveal', ''); c.style.setProperty('--d', `${Math.min(i, 10) * 60}ms`); }));
  root.querySelectorAll('[data-reveal],[data-split]').forEach((el) => observer().observe(el));
}

// Parallax sutil y barra de progreso, con un único listener de scroll.
let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = scrollY;
    document.documentElement.classList.toggle('is-scrolled', y > 8);
    if (reduced()) return;
    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.transform = `translate3d(0, ${(p * Number(el.dataset.parallax || 30)).toFixed(1)}px, 0)`;
    });
  });
}

// Foco de luz que sigue al cursor dentro de las tarjetas (solo con puntero fino).
function onPointer(e) {
  const card = e.target.closest?.('.card, .btn--magnetic');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', `${e.clientX - r.left}px`); card.style.setProperty('--my', `${e.clientY - r.top}px`);
  if (card.classList.contains('btn--magnetic') && !reduced()) {
    card.style.transform = `translate(${((e.clientX - r.left) / r.width - 0.5) * 6}px, ${((e.clientY - r.top) / r.height - 0.5) * 6}px)`;
  }
}

export function initMotion() {
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (matchMedia('(pointer: fine)').matches) {
    document.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerout', (e) => { const b = e.target.closest?.('.btn--magnetic'); if (b && !b.contains(e.relatedTarget)) b.style.transform = ''; });
  }
}

// Transición entre páginas: un único fundido corto de la vista nueva.
export async function pageTransition(update) {
  const main = document.getElementById('view');
  await update();
  if (reduced()) return;
  main.classList.remove('is-entering'); void main.offsetWidth; main.classList.add('is-entering');
}

// Contador animado para cifras.
export function countUp(el, to, format = (n) => Math.round(n).toLocaleString('es-ES')) {
  if (reduced()) { el.textContent = format(to); return; }
  const t0 = performance.now(), dur = 900;
  const step = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = format(to * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
