// Opinión ampliada mediante un modelo de lenguaje (opcional).
// Solo se activa si en el servidor existen ANTHROPIC_API_KEY y AI_MODEL (ver .env.example).
// La clave nunca se envía al navegador: el frontend llama a /api/compare/ai y el servidor hace la petición.
import { config } from './config.js';

const SYSTEM = `Eres el redactor de análisis de Pomar, una web independiente para aficionados a Apple. Escribes en español de España.
Reglas:
- Basa todo en las fichas JSON que recibes. No inventes especificaciones, precios ni fechas; si un dato es null, di que no está verificado.
- Sé honesto: no favorezcas al modelo más caro ni al más nuevo. Si la diferencia no se nota en el uso diario, dilo.
- Los precios son de lanzamiento en EE. UU. (USD); no afirmes precios actuales.
- Responde en un máximo de 220 palabras, en 3 o 4 párrafos cortos, sin listas ni encabezados.
- Termina con una recomendación clara según el perfil de comprador indicado.`;

export async function aiOpinion(products, verdict, profile) {
  if (!config.ai.enabled) { const e = new Error('La opinión con IA no está configurada en este servidor.'); e.status = 501; throw e; }
  const slim = products.map(({ model, sources, trivia, ...p }) => p);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': config.ai.key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: config.ai.model, max_tokens: 700, system: SYSTEM,
        messages: [{ role: 'user', content: `Perfil del comprador: ${profile || 'no indicado'}\n\nFichas:\n${JSON.stringify(slim)}\n\nVeredicto del motor de reglas (úsalo como referencia, puedes matizarlo):\n${JSON.stringify(verdict)}` }],
      }),
    });
    if (!res.ok) { const e = new Error(`El servicio de IA respondió con un error (${res.status}).`); e.status = 502; throw e; }
    const data = await res.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!text) { const e = new Error('El servicio de IA no devolvió texto.'); e.status = 502; throw e; }
    return { text, model: config.ai.model };
  } catch (err) {
    if (err.name === 'AbortError') { const e = new Error('El servicio de IA tardó demasiado en responder.'); e.status = 504; throw e; }
    if (!err.status) { err.status = 502; err.message = 'No se pudo contactar con el servicio de IA.'; }
    throw err;
  } finally { clearTimeout(timer); }
}
