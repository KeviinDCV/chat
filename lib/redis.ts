import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

/**
 * Busca las credenciales de Upstash sin importar qué prefijo eligió Vercel.
 * Reconoce:
 *   - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (Upstash directo)
 *   - KV_REST_API_URL / KV_REST_API_TOKEN                (Vercel KV legacy)
 *   - <PREFIX>_KV_REST_API_URL / <PREFIX>_KV_REST_API_TOKEN  (Marketplace, ej. STORAGE_, REDIS_, etc.)
 *   - <PREFIX>_REST_URL / <PREFIX>_REST_TOKEN            (variantes nuevas)
 */
function resolveCredentials(): { url?: string; token?: string } {
  const env = process.env;

  // 1) Nombres estándar
  let url =
    env.UPSTASH_REDIS_REST_URL ||
    env.KV_REST_API_URL ||
    undefined;
  let token =
    env.UPSTASH_REDIS_REST_TOKEN ||
    env.KV_REST_API_TOKEN ||
    undefined;

  if (url && token) return { url, token };

  // 2) Busca cualquier variable con sufijo conocido
  const urlKey = Object.keys(env).find(
    (k) =>
      (k.endsWith("_KV_REST_API_URL") || k.endsWith("_REST_API_URL")) &&
      typeof env[k] === "string" &&
      env[k]!.startsWith("http")
  );
  const tokenKey = Object.keys(env).find(
    (k) =>
      (k.endsWith("_KV_REST_API_TOKEN") || k.endsWith("_REST_API_TOKEN")) &&
      typeof env[k] === "string" &&
      env[k]!.length > 0
  );

  url = url || (urlKey ? env[urlKey] : undefined);
  token = token || (tokenKey ? env[tokenKey] : undefined);

  return { url, token };
}

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  const { url, token } = resolveCredentials();
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export const KEYS = {
  messages: "kg:messages",
  presence: "kg:presence",
} as const;

// Tiempo de vida de los mensajes (24 h)
export const MESSAGE_TTL_SEC = 24 * 60 * 60;
// Cuánto tiempo después del último heartbeat consideramos a alguien "en línea"
export const PRESENCE_WINDOW_MS = 15_000;
// Máximo de mensajes que conservamos
export const MAX_MESSAGES = 300;
