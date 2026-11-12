// Se carga antes de pintar para evitar el parpadeo de tema.
(function () {
  try { var t = localStorage.getItem('pomar-theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) {}
  document.documentElement.classList.add('js', 'is-loading');
})();
