import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;

  // Vercel Marketplace (Upstash) injects KV_REST_API_URL / KV_REST_API_TOKEN.
  // Native Upstash dashboard exports UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

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
