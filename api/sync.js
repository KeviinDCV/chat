/* ============================================================
   POST /api/sync
   Una sola llamada hace tres cosas, para gastar lo mínimo:
     1. avisa que sigo conectado (y si estoy escribiendo)
     2. devuelve los mensajes nuevos desde `since`
     3. devuelve quién está en línea y quién escribe

   Cuerpo:    { uid, name, since, typing }
   Respuesta: { messages, online, typing, now }
   ============================================================ */

import {
  pipeline,
  KEY,
  ONLINE_MS,
  isConfigured,
  clean,
  validUid,
  presenceMember,
  typingMember,
  parsePresence,
} from "../lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!isConfigured()) {
    return res.status(503).json({ error: "database_not_connected" });
  }

  const body = req.body || {};
  const uid = body.uid;
  const name = clean(body.name, 24);

  if (!validUid(uid) || !name) {
    return res.status(400).json({ error: "bad_request" });
  }

  const now = Date.now();
  const cutoff = now - ONLINE_MS;
  const since = Number(body.since);
  const sinceId = Number.isFinite(since) && since > 0 ? Math.floor(since) : 0;

  const commands = [
    // 1. Latido de presencia
    ["ZADD", KEY.presence, String(now), presenceMember(uid, name)],
  ];

  // 2. Marca de "escribiendo" — solo se escribe mientras teclea
  if (body.typing === true) {
    commands.push([
      "ZADD",
      KEY.presence,
      String(now),
      typingMember(uid, name),
    ]);
  }

  // 3. Conectados + quién escribe, en una sola lectura
  commands.push([
    "ZRANGE",
    KEY.presence,
    String(cutoff),
    "+inf",
    "BYSCORE",
    "WITHSCORES",
  ]);

  // 4. Mensajes nuevos (rango abierto: estrictamente mayores que sinceId)
  commands.push([
    "ZRANGE",
    KEY.messages,
    `(${sinceId}`,
    "+inf",
    "BYSCORE",
  ]);

  // 5. Limpieza esporádica de entradas viejas, para no engordar el conjunto
  const sweep = Math.random() < 0.1;
  if (sweep) {
    commands.push([
      "ZREMRANGEBYSCORE",
      KEY.presence,
      "-inf",
      `(${cutoff}`,
    ]);
  }

  try {
    const results = await pipeline(commands);

    // El índice depende de si se incluyó el comando de "escribiendo"
    const presenceIdx = body.typing === true ? 2 : 1;
    const messagesIdx = presenceIdx + 1;

    const presence = parsePresence(results[presenceIdx] || [], now);
    const messages = (results[messagesIdx] || [])
      .map(parseMessage)
      .filter(Boolean);

    return res.status(200).json({
      messages: messages,
      online: presence.online,
      // No me anuncio a mí mismo como "escribiendo"
      typing: presence.typing.filter(function (t) { return t.uid !== uid; }),
      now: now,
    });
  } catch (err) {
    console.error("sync:", err);
    return res.status(500).json({ error: "redis_error" });
  }
}

function parseMessage(raw) {
  if (raw && typeof raw === "object") return raw;
  try {
    return JSON.parse(String(raw));
  } catch (err) {
    return null;
  }
}
