import { NextResponse } from "next/server";
import {
  getRedis,
  KEYS,
  MESSAGE_TTL_SEC,
  PRESENCE_WINDOW_MS,
} from "@/lib/redis";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type SyncBody = {
  deviceId: string;
  name: "K" | "G";
  lastTs: number;
  typing?: boolean;
};

type StoredMessage = {
  id: string;
  sender: "K" | "G";
  text: string;
  ts: number;
};

type PresenceEntry = {
  name: "K" | "G";
  typing: boolean;
  lastSeen: number;
};

type PresenceUser = {
  name: "K" | "G";
  typing: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SyncBody | null;
  if (
    !body ||
    typeof body.deviceId !== "string" ||
    (body.name !== "K" && body.name !== "G") ||
    typeof body.lastTs !== "number"
  ) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      {
        error: "redis-not-configured",
        message:
          "Falta configurar Upstash Redis. Define KV_REST_API_URL / KV_REST_API_TOKEN.",
      },
      { status: 503 }
    );
  }

  const now = Date.now();
  const presenceEntry: PresenceEntry = {
    name: body.name,
    typing: !!body.typing,
    lastSeen: now,
  };

  // Pipeline: actualiza presencia + extiende TTL + lee mensajes nuevos + lee presencia
  const pipeline = redis.pipeline();
  pipeline.hset(KEYS.presence, { [body.deviceId]: JSON.stringify(presenceEntry) });
  pipeline.expire(KEYS.presence, 600);
  pipeline.zrange(KEYS.messages, `(${body.lastTs}`, "+inf", {
    byScore: true,
    withScores: false,
  });
  pipeline.hgetall(KEYS.presence);

  const [, , rawMessages, rawPresence] = (await pipeline.exec()) as [
    unknown,
    unknown,
    unknown,
    Record<string, unknown> | null
  ];

  // Parse mensajes
  const messages: StoredMessage[] = [];
  if (Array.isArray(rawMessages)) {
    for (const item of rawMessages) {
      const parsed = parseJSON<StoredMessage>(item);
      if (parsed) messages.push(parsed);
    }
  }

  // Parse presencia y filtrar por ventana
  const presenceUsersByName = new Map<string, PresenceUser>();
  if (rawPresence && typeof rawPresence === "object") {
    for (const [deviceId, value] of Object.entries(rawPresence)) {
      const entry = parseJSON<PresenceEntry>(value);
      if (!entry) continue;
      if (now - entry.lastSeen > PRESENCE_WINDOW_MS) continue;
      // Si la misma persona está en varios dispositivos, conserva el más reciente
      const existing = presenceUsersByName.get(entry.name);
      if (
        !existing ||
        // typing gana sobre no-typing
        (entry.typing && !existing.typing)
      ) {
        presenceUsersByName.set(entry.name, {
          name: entry.name,
          typing: entry.typing,
        });
      }
      // Si nadie nos ha marcado typing, deja al menos al usuario presente
      if (!presenceUsersByName.has(entry.name)) {
        presenceUsersByName.set(entry.name, {
          name: entry.name,
          typing: entry.typing,
        });
      }
    }
  }

  return NextResponse.json({
    serverTs: now,
    messages,
    presence: Array.from(presenceUsersByName.values()),
    ttlSec: MESSAGE_TTL_SEC,
  });
}

function parseJSON<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "object") return value as T;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
