import { NextResponse } from "next/server";
import { getRedis, KEYS, MAX_MESSAGES, MESSAGE_TTL_SEC } from "@/lib/redis";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type SendBody = {
  deviceId: string;
  name: "K" | "G";
  text: string;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SendBody | null;
  if (
    !body ||
    typeof body.deviceId !== "string" ||
    (body.name !== "K" && body.name !== "G") ||
    typeof body.text !== "string"
  ) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const text = body.text.trim();
  if (!text) {
    return NextResponse.json({ error: "Empty text" }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Too long" }, { status: 400 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "redis-not-configured" },
      { status: 503 }
    );
  }

  const now = Date.now();
  const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const message = {
    id,
    sender: body.name,
    text,
    ts: now,
  };

  // Inserta + recorta antiguos por puntuación + recorta por cantidad + extiende TTL
  const pipeline = redis.pipeline();
  pipeline.zadd(KEYS.messages, { score: now, member: JSON.stringify(message) });
  pipeline.zremrangebyscore(KEYS.messages, 0, now - MESSAGE_TTL_SEC * 1000);
  pipeline.zremrangebyrank(KEYS.messages, 0, -MAX_MESSAGES - 1);
  pipeline.expire(KEYS.messages, MESSAGE_TTL_SEC);
  await pipeline.exec();

  return NextResponse.json({ ok: true, message });
}
