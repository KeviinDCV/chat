/* ============================================================
   POST /api/send
   Guarda un mensaje (texto y/o imagen) y recorta el historial.

   Cuerpo:    { uid, name, text?, image? }
   Respuesta: { ok: true, message }
   ============================================================ */

import {
  pipeline,
  KEY,
  MAX_MESSAGES,
  isConfigured,
  clean,
  validUid,
  presenceMember,
  typingMember,
} from "../lib/redis.js";

/** Imagen en base64, ya comprimida por el navegador. */
const IMAGE_RE = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_IMAGE_CHARS = 700000; // ~700 KB

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

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
  const text = clean(body.text, 1000);
  const image = typeof body.image === "string" ? body.image : "";

  if (!validUid(uid) || !name) {
    return res.status(400).json({ error: "bad_request" });
  }
  if (!text && !image) {
    return res.status(400).json({ error: "empty_message" });
  }
  if (image) {
    if (image.length > MAX_IMAGE_CHARS) {
      return res.status(413).json({ error: "image_too_large" });
    }
    if (!IMAGE_RE.test(image)) {
      return res.status(400).json({ error: "invalid_image" });
    }
  }

  try {
    // El id es también la posición en el historial, así el sondeo
    // puede pedir "lo que haya después de N" sin releer todo.
    const [id] = await pipeline([["INCR", KEY.seq]]);
    const seq = Number(id);

    const message = {
      id: seq,
      uid: uid,
      name: name,
      ts: Date.now(),
    };
    if (text) message.text = text;
    if (image) message.image = image;

    await pipeline([
      ["ZADD", KEY.messages, String(seq), JSON.stringify(message)],
      // Conserva solo los últimos MAX_MESSAGES
      ["ZREMRANGEBYRANK", KEY.messages, "0", String(-MAX_MESSAGES - 1)],
      // Al enviar dejo de escribir
      ["ZREM", KEY.presence, typingMember(uid, name)],
      // Y sigo presente
      ["ZADD", KEY.presence, String(Date.now()), presenceMember(uid, name)],
    ]);

    return res.status(200).json({ ok: true, message: message });
  } catch (err) {
    console.error("send:", err);
    return res.status(500).json({ error: "redis_error" });
  }
}
