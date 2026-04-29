"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Bubble from "./Bubble";
import Composer from "./Composer";
import Header from "./Header";
import TypingIndicator from "./TypingIndicator";
import NamePrompt from "./NamePrompt";
import {
  ChatCache,
  Message,
  loadCache,
  saveCache,
  clearCache,
} from "@/lib/storage";
import {
  Identity,
  loadIdentity,
  saveIdentity,
  clearIdentity,
} from "@/lib/identity";

type Presence = { name: "K" | "G"; typing: boolean };

const POLL_VISIBLE_MS = 2500;
const POLL_HIDDEN_MS = 30_000;
const TYPING_DEBOUNCE_MS = 1500;
const RELOAD_GRACE_MS = 4000;
const CLIENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "";

export default function Chat() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [cache, setCache] = useState<ChatCache>({ messages: [], updatedAt: 0 });
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [presence, setPresence] = useState<Presence[]>([]);
  const [iAmTyping, setIAmTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTsRef = useRef<number>(0);
  const typingResetTO = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountTsRef = useRef<number>(0);
  const presenceKeyRef = useRef<string>("");

  // Hydration: identity + cache
  useEffect(() => {
    const id = loadIdentity();
    setIdentity(id);
    const c = loadCache();
    setCache(c);
    lastTsRef.current = c.messages.reduce((m, x) => Math.max(m, x.ts), 0);
    mountTsRef.current = Date.now();
    setHydrated(true);
  }, []);

  // Persistir cache
  useEffect(() => {
    if (!hydrated) return;
    saveCache(cache);
  }, [cache, hydrated]);

  // Guardar al cambiar visibilidad / cierre
  useEffect(() => {
    const handler = () => saveCache(cache);
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("pagehide", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [cache]);

  // --vh para móvil
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    };
    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, []);

  // Auto-scroll al final
  const otherTyping = useMemo(
    () =>
      presence.some(
        (p) => identity && p.name !== identity.name && p.typing
      ),
    [presence, identity]
  );
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [cache.messages.length, otherTyping]);

  // Polling de sync
  useEffect(() => {
    if (!hydrated || !identity) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: identity.deviceId,
            name: identity.name,
            lastTs: lastTsRef.current,
            typing: iAmTypingRef.current,
          }),
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 503) {
            setError(
              "Backend sin configurar. Conecta Upstash Redis en Vercel (KV_REST_API_URL / KV_REST_API_TOKEN)."
            );
          } else {
            setError(null);
          }
        } else {
          setError(null);
          const data = (await res.json()) as {
            serverTs: number;
            messages: Message[];
            presence: Presence[];
            buildId?: string;
          };
          if (
            data.buildId &&
            CLIENT_BUILD_ID &&
            data.buildId !== CLIENT_BUILD_ID
          ) {
            setUpdateAvailable(true);
          }
          if (data.messages?.length) {
            setCache((prev) => mergeMessages(prev, data.messages));
            const maxTs = data.messages.reduce(
              (m, x) => Math.max(m, x.ts),
              lastTsRef.current
            );
            lastTsRef.current = maxTs;
            // Borra ids pendientes que ya volvieron del servidor
            setPendingIds((prev) => {
              if (prev.size === 0) return prev;
              const next = new Set(prev);
              for (const m of data.messages) next.delete(m.id);
              return next;
            });
          }
          const incomingPresence = data.presence ?? [];
          const key = incomingPresence
            .map((p) => `${p.name}:${p.typing ? 1 : 0}`)
            .sort()
            .join("|");
          if (key !== presenceKeyRef.current) {
            presenceKeyRef.current = key;
            setPresence(incomingPresence);
          }
        }
      } catch {
        // red caída — reintentamos en el próximo tick
      } finally {
        if (!stopped) {
          const delay = document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS;
          timer = setTimeout(tick, delay);
        }
      }
    };

    tick();
    const onVis = () => {
      // dispara un sync inmediato al volver
      if (timer) clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hydrated, identity]);

  // Reload automático cuando hay deploy nuevo
  useEffect(() => {
    if (!updateAvailable) return;
    const doReload = () => {
      saveCache(cache); // por si acaso
      window.location.reload();
    };
    // Si la pestaña está oculta, recarga ya (silencioso)
    if (document.hidden) {
      doReload();
      return;
    }
    // Si está visible, espera unos segundos para que vea el banner
    const t = setTimeout(doReload, RELOAD_GRACE_MS);
    const onHide = () => {
      if (document.hidden) {
        clearTimeout(t);
        doReload();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [updateAvailable, cache]);

  // Latch para typing accesible desde el polling
  const iAmTypingRef = useRef(false);
  useEffect(() => {
    iAmTypingRef.current = iAmTyping;
  }, [iAmTyping]);

  const handleTyping = useCallback((typing: boolean) => {
    setIAmTyping(typing);
    if (typingResetTO.current) clearTimeout(typingResetTO.current);
    if (typing) {
      typingResetTO.current = setTimeout(() => {
        setIAmTyping(false);
      }, TYPING_DEBOUNCE_MS);
    }
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!identity) return;
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const optimistic: Message = {
        id: tempId,
        sender: identity.name,
        text,
        ts: Date.now(),
      };
      setCache((prev) => ({
        messages: [...prev.messages, optimistic],
        updatedAt: Date.now(),
      }));
      setPendingIds((prev) => new Set(prev).add(tempId));

      try {
        const res = await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: identity.deviceId,
            name: identity.name,
            text,
          }),
        });
        if (!res.ok) throw new Error("send failed");
        const data = (await res.json()) as { ok: boolean; message: Message };
        // Reemplaza el optimistic por el real
        setCache((prev) => ({
          messages: prev.messages.map((m) =>
            m.id === tempId ? data.message : m
          ),
          updatedAt: Date.now(),
        }));
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
        lastTsRef.current = Math.max(lastTsRef.current, data.message.ts);
      } catch {
        // Marca como fallido (lo dejamos pendiente y el usuario puede reintentar reenviando)
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.add(tempId);
          return next;
        });
      } finally {
        setIAmTyping(false);
      }
    },
    [identity]
  );

  const handlePickName = useCallback((name: "K" | "G") => {
    const id = saveIdentity(name);
    setIdentity(id);
  }, []);

  const handleSwitchUser = useCallback(() => {
    if (
      !confirm(
        "¿Cambiar de usuario? Se borrará el caché local de mensajes (los del servidor se mantienen)."
      )
    )
      return;
    clearIdentity();
    clearCache();
    setIdentity(null);
    setCache({ messages: [], updatedAt: 0 });
    lastTsRef.current = 0;
  }, []);

  const messagesWithMeta = useMemo(() => {
    const mountTs = mountTsRef.current;
    return cache.messages.map((m, i, arr) => {
      const next = arr[i + 1];
      const isLastOfRun = !next || next.sender !== m.sender;
      return {
        msg: m,
        showTime: isLastOfRun,
        pending: pendingIds.has(m.id),
        animateIn: m.ts >= mountTs,
      };
    });
  }, [cache.messages, pendingIds]);

  if (!hydrated) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-flame-700/60 text-sm">
        Cargando…
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      {identity && (
        <Header
          presence={presence}
          myName={identity.name}
          otherTyping={otherTyping}
          onSwitchUser={handleSwitchUser}
        />
      )}

      <AnimatePresence>
        {updateAvailable && <UpdateBanner key="update" />}
      </AnimatePresence>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-clean px-3 py-3 space-y-1.5"
      >
        {error && (
          <div className="mx-auto max-w-[90%] text-center text-[12px] bg-flame-50 border border-flame-200 text-flame-800 rounded-2xl px-3 py-2">
            {error}
          </div>
        )}
        {identity && cache.messages.length === 0 && !error && (
          <div className="text-center text-[12px] text-flame-700/60 mt-8">
            Aún no hay mensajes. ¡Saluda! 👋
          </div>
        )}
        <AnimatePresence initial={false}>
          {identity &&
            messagesWithMeta.map(({ msg, showTime, pending, animateIn }) => (
              <Bubble
                key={msg.id}
                msg={msg}
                myName={identity.name}
                showTime={showTime}
                pending={pending}
                animateIn={animateIn}
              />
            ))}
          {otherTyping && <TypingIndicator key="typing" />}
        </AnimatePresence>
      </div>

      {identity && (
        <Composer onSend={handleSend} onTypingChange={handleTyping} />
      )}

      {!identity && <NamePrompt onPick={handlePickName} />}
    </div>
  );
}

function UpdateBanner() {
  return (
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -30, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="absolute top-0 left-0 right-0 z-30 flex justify-center pointer-events-none safe-top"
    >
      <div className="mt-14 px-3.5 py-2 rounded-full bg-flame-700/95 text-white text-[12px] font-medium shadow-bubble flex items-center gap-2">
        <motion.span
          className="block h-2 w-2 rounded-full bg-yellow-300"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
        Nueva versión — recargando…
      </div>
    </motion.div>
  );
}

function mergeMessages(prev: ChatCache, incoming: Message[]): ChatCache {
  if (incoming.length === 0) return prev;
  const map = new Map<string, Message>();
  for (const m of prev.messages) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  const merged = Array.from(map.values()).sort((a, b) => a.ts - b.ts);
  return { messages: merged, updatedAt: Date.now() };
}
