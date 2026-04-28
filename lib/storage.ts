"use client";

export type Role = "me" | "bot";

export type Message = {
  id: string;
  role: Role;
  text: string;
  ts: number;
  status?: "sending" | "sent" | "read";
};

export type ChatState = {
  messages: Message[];
  updatedAt: number;
};

const KEY = "llama-chat:v1";
// Plazo corto: los mensajes viven 24h desde su creación.
export const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadState(): ChatState {
  if (!isBrowser()) return { messages: [], updatedAt: Date.now() };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { messages: [], updatedAt: Date.now() };
    const parsed = JSON.parse(raw) as ChatState;
    const now = Date.now();
    const fresh = (parsed.messages || []).filter(
      (m) => now - m.ts < MESSAGE_TTL_MS
    );
    return { messages: fresh, updatedAt: parsed.updatedAt ?? now };
  } catch {
    return { messages: [], updatedAt: Date.now() };
  }
}

export function saveState(state: ChatState) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function clearState() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY);
}
