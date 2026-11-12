// Backend en modo servidor: habla con la API de Node (server/index.js).
// En la versión estática (GitHub Pages) el script de construcción sustituye este archivo por scripts/static-backend.js.
export async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error('No se pudo conectar con el servidor. Comprueba que sigue en marcha.'); }
  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin cuerpo */ }
  if (!res.ok) { const e = new Error(data?.error || `Error ${res.status}`); e.status = res.status; throw e; }
  return data;
}
