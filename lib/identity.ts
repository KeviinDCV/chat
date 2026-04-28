"use client";

export type Identity = {
  deviceId: string;
  name: "K" | "G";
};

const KEY = "kg-chat:identity:v1";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadIdentity(): Identity | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Identity;
    if (parsed && (parsed.name === "K" || parsed.name === "G") && parsed.deviceId) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveIdentity(name: "K" | "G"): Identity {
  const existing = loadIdentity();
  const identity: Identity = {
    deviceId: existing?.deviceId ?? uuid(),
    name,
  };
  localStorage.setItem(KEY, JSON.stringify(identity));
  return identity;
}

export function clearIdentity() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(KEY);
}
