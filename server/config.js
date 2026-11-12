// Configuración central. Lee variables de entorno y, si existe, un archivo .env
// en la raíz del proyecto (sin dependencias externas).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const DATA_DIR = path.join(ROOT, 'data');

try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch { /* .env es opcional */ }

const env = process.env;
export const config = {
  port: Number(env.PORT) || 4173,
  host: env.HOST || '127.0.0.1',
  production: env.NODE_ENV === 'production',
  // URL pública (para sitemap y canonical). En local se deduce del puerto.
  siteUrl: env.SITE_URL || env.RENDER_EXTERNAL_URL || `http://localhost:${Number(env.PORT) || 4173}`,
  sessionDays: 30,
  newsTtlMs: (Number(env.NEWS_TTL_MINUTES) || 15) * 60_000,
  // IA opcional para ampliar la opinión del comparador. La clave nunca sale del servidor.
  ai: {
    key: env.ANTHROPIC_API_KEY || '',
    model: env.AI_MODEL || '',
    get enabled() { return Boolean(this.key && this.model); },
  },
};
