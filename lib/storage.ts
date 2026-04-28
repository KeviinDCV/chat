"use client";

export type Sender = "K" | "G";

export type Message = {
  id: string;
  sender: Sender;
  text: string;
  ts: number;
};

export type ChatCache = {
  messages: Message[];
  updatedAt: number;
};

const KEY = "kg-chat:cache:v2";
// Plazo corto: los mensajes viven 24 h
export const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadCache(): ChatCache {
  if (!isBrowser()) return { messages: [], updatedAt: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { messages: [], updatedAt: 0 };
    const parsed = JSON.parse(raw) as ChatCache;
    const now = Date.now();
    const fresh = (parsed.messages || []).filter(
      (m) => now - m.ts < MESSAGE_TTL_MS
    );
    return { messages: fresh, updatedAt: parsed.updatedAt ?? 0 };
  } catch {
    return { messages: [], updatedAt: 0 };
  }
}

export function saveCache(cache: ChatCache) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
}

export function clearCache() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY);
}
