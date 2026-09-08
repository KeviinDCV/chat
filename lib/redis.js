/* ============================================================
   Acceso a Upstash Redis por su API REST.
   Sin dependencias: solo fetch, para que el arranque sea rápido.

   Vercel inyecta estas variables solas al instalar la
   integración de Redis desde el Marketplace.
   ============================================================ */

const URL_ =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const ROOM = process.env.ROOM_ID || "general";

export const KEY = {
  seq: `chat:${ROOM}:seq`,
  messages: `chat:${ROOM}:messages`,
  presence: `chat:${ROOM}:presence`,
};

/** Cuánto dura una persona "en línea" sin dar señales (ms). */
export const ONLINE_MS = 30000;
/** Cuánto dura el aviso de "escribiendo…" (ms). */
export const TYPING_MS = 6000;
/** Mensajes que se conservan en el historial. */
export const MAX_MESSAGES = 200;

export function isConfigured() {
  return Boolean(URL_ && TOKEN);
}

/**
 * Ejecuta varios comandos Redis en una sola petición HTTP.
 * @param {Array<Array<string>>} commands
 * @returns {Promise<Array<any>>} el resultado de cada comando, en orden
 */
export async function pipeline(commands) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) {
    throw new Error(`Redis respondió ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Respuesta inesperada de Redis");
  }

  return data.map(function (entry) {
    if (entry && entry.error) throw new Error(entry.error);
    return entry ? entry.result : null;
  });
}

/* ---------- Validación y limpieza ---------- */

/**
 * Quita caracteres de control y recorta a `max`.
 * Conserva los saltos de línea y los emojis.
 */
export function clean(value, max) {
  const text = String(value == null ? "" : value);
  let out = "";

  for (const ch of text) {
    const code = ch.codePointAt(0);
    const isControl = code < 32 || code === 127;
    if (!isControl || code === 10) out += ch; // 10 = salto de línea
  }

  return out.trim().slice(0, max);
}

/** El uid lo genera el cliente; debe ser simple para no romper el separador "|". */
export function validUid(uid) {
  return typeof uid === "string" && /^u_[a-z0-9]{6,40}$/i.test(uid);
}

/**
 * Miembros del conjunto de presencia:
 *   "<uid>|<nombre>"     -> última vez visto
 *   "t:<uid>|<nombre>"   -> última vez escribiendo
 * Como el uid siempre empieza por "u_", el prefijo "t:" nunca choca.
 */
export function presenceMember(uid, name) {
  return `${uid}|${name}`;
}
export function typingMember(uid, name) {
  return `t:${uid}|${name}`;
}

/**
 * Convierte el resultado plano de ZRANGE ... WITHSCORES
 * en las listas de conectados y de quienes escriben.
 */
export function parsePresence(flat, now) {
  const online = new Map();
  const typing = new Map();

  for (let i = 0; i < flat.length; i += 2) {
    const raw = String(flat[i]);
    const score = Number(flat[i + 1]);
    if (!Number.isFinite(score)) continue;

    const isTyping = raw.startsWith("t:");
    const body = isTyping ? raw.slice(2) : raw;

    const sep = body.indexOf("|");
    if (sep < 1) continue;

    const uid = body.slice(0, sep);
    const name = body.slice(sep + 1);
    if (!uid || !name) continue;

    if (isTyping) {
      // "Escribiendo" caduca mucho antes que la presencia
      if (now - score <= TYPING_MS) typing.set(uid, name);
    } else {
      // ZRANGE llega ordenado por score, así que el último gana
      online.set(uid, name);
    }
  }

  return {
    online: Array.from(online, function (e) { return { uid: e[0], name: e[1] }; }),
    typing: Array.from(typing, function (e) { return { uid: e[0], name: e[1] }; }),
  };
}
