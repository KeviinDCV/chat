/* ============================================================
   POST /api/leave
   Borra a alguien de la lista de conectados en el acto, sin
   esperar a que caduque su marca de presencia.

   Se llama al pulsar "Salir" y al cerrar la pestaña
   (con sendBeacon, que sobrevive a la descarga de la página).

   Cuerpo:    { uid, name }
   Respuesta: { ok: true }
   ============================================================ */

import {
  pipeline,
  KEY,
  isConfigured,
  clean,
  validUid,
  presenceMember,
  typingMember,
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

  try {
    await pipeline([
      ["ZREM", KEY.presence, presenceMember(uid, name)],
      ["ZREM", KEY.presence, typingMember(uid, name)],
    ]);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("leave:", err);
    return res.status(500).json({ error: "redis_error" });
  }
}
