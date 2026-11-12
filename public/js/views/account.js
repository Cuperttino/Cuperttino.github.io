import { html, api, session, toast, icon } from '../lib.js';
import { refreshAccount } from '../app.js';

export default async function account({ el, query, navigate }) {
  const back = (query.get('volver') || '').startsWith('/') && !(query.get('volver') || '').startsWith('//') ? query.get('volver') : '/ecosistema';
  if (session.user) {
    el.innerHTML = html`<div class="wrap"><div class="auth"><span class="eyebrow">Cuenta</span><h1 class="h1" style="margin:14px 0 8px">${session.user.name}</h1><p class="muted">${session.user.email}</p>
      <p class="small muted" style="margin-top:6px">Cuenta creada el ${new Date(session.user.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <div style="display:flex;gap:10px;margin-top:28px;flex-wrap:wrap"><a class="btn" href="/ecosistema">Mi ecosistema ${icon('arrow')}</a><button class="btn btn--ghost" id="logout" type="button">${session.static ? 'Quitar perfil' : 'Cerrar sesión'}</button></div></div></div>`;
    el.querySelector('#logout').addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST', body: {} }); } catch { /* la sesión local se cierra igualmente */ }
      session.user = null; refreshAccount(); toast('Sesión cerrada.'); navigate('/');
    });
    return 'Cuenta';
  }
  if (session.static) {
    // Versión estática (sin servidor): perfil local, sin contraseña, guardado solo en este navegador.
    el.innerHTML = html`<div class="wrap"><div class="auth"><span class="eyebrow">Perfil</span><h1 class="h1" style="margin:14px 0 14px">Crea tu perfil</h1>
      <p class="muted">Esta versión de Pomar no tiene servidor, así que no hay cuentas ni contraseñas: tu perfil y tus dispositivos se guardan únicamente en este navegador. No se sincronizan con otros dispositivos y se pierden si borras los datos del sitio.</p>
      <form class="form card" id="local-form" style="margin-top:18px" novalidate><label>¿Cómo te llamas?<input class="input" name="name" autocomplete="given-name" maxlength="60" required></label><p class="form__error" role="alert"></p><button class="btn" type="submit">Empezar</button></form></div></div>`;
    const f = el.querySelector('#local-form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const d = await api('/api/auth/register', { method: 'POST', body: { name: f.name.value } }); session.user = d.user; refreshAccount(); toast(`Hola, ${d.user.name}.`); navigate(back, { replace: true }); }
      catch (ex) { f.querySelector('.form__error').textContent = ex.message; }
    });
    return 'Perfil';
  }
  let mode = query.get('modo') === 'entrar' ? 'login' : 'register';
  el.innerHTML = html`<div class="wrap"><div class="auth">
    <span class="eyebrow">Cuenta</span><h1 class="h1" style="margin:14px 0 24px" id="auth-title"></h1>
    <div class="tabs" role="tablist"><button type="button" role="tab" data-mode="register">Crear cuenta</button><button type="button" role="tab" data-mode="login">Iniciar sesión</button></div>
    <form class="form card" id="auth-form" style="margin-top:14px" novalidate>
      <label id="f-name">Nombre<input class="input" name="name" autocomplete="name" maxlength="60"></label>
      <label>Correo electrónico<input class="input" type="email" name="email" autocomplete="email" required></label>
      <label>Contraseña<input class="input" type="password" name="password" minlength="8" required></label>
      <p class="small muted" id="f-hint">Mínimo 8 caracteres. Se guarda cifrada con scrypt; nadie puede leerla.</p>
      <p class="form__error" role="alert"></p>
      <button class="btn" type="submit"></button>
    </form></div></div>`;
  const form = el.querySelector('#auth-form'), err = form.querySelector('.form__error');
  function paint() {
    const reg = mode === 'register';
    el.querySelector('#auth-title').textContent = reg ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
    el.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
    form.querySelector('#f-name').hidden = !reg; form.querySelector('#f-hint').hidden = !reg;
    form.password.autocomplete = reg ? 'new-password' : 'current-password';
    form.querySelector('[type=submit]').textContent = reg ? 'Crear cuenta' : 'Entrar'; err.textContent = '';
  }
  el.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) { mode = b.dataset.mode; paint(); } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    const body = { email: form.email.value, password: form.password.value, name: form.name.value };
    if (mode === 'register' && !body.name.trim()) { err.textContent = 'Indica tu nombre.'; return; }
    if (!/^\S+@\S+\.\S+$/.test(body.email)) { err.textContent = 'Introduce un correo electrónico válido.'; return; }
    if (body.password.length < 8 && mode === 'register') { err.textContent = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try {
      const d = await api(mode === 'register' ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body });
      session.user = d.user; refreshAccount(); toast(mode === 'register' ? `Cuenta creada. Hola, ${d.user.name}.` : `Hola de nuevo, ${d.user.name}.`); navigate(back, { replace: true });
    } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
  });
  paint();
  return 'Cuenta';
}
