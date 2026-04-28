"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Bubble from "./Bubble";
import Composer from "./Composer";
import Header from "./Header";
import TypingIndicator from "./TypingIndicator";
import { botReply, typingMs } from "@/lib/bot";
import {
  ChatState,
  Message,
  loadState,
  saveState,
  uid,
  clearState,
} from "@/lib/storage";

const WELCOME: Message = {
  id: "welcome",
  role: "bot",
  text: "¡Hola! Soy Llama 🌶️💛 Escríbeme cualquier cosa.",
  ts: Date.now(),
  status: "read",
};

export default function Chat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    updatedAt: Date.now(),
  });
  const [hydrated, setHydrated] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage (state survives screen-off / reload)
  useEffect(() => {
    const loaded = loadState();
    if (loaded.messages.length === 0) {
      loaded.messages = [WELCOME];
    }
    setState(loaded);
    setHydrated(true);
  }, []);

  // Persist on every change
  useEffect(() => {
    if (!hydrated) return;
    saveState(state);
  }, [state, hydrated]);

  // Persist also on visibility / pagehide (mobile screen-off, tab switch)
  useEffect(() => {
    const handler = () => saveState(state);
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("pagehide", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("pagehide", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [state]);

  // Keep --vh in sync so the layout survives mobile URL bars / orientation
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

  // Auto-scroll to bottom on new messages or typing
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [state.messages.length, botTyping]);

  const handleSend = useCallback((text: string) => {
    const mine: Message = {
      id: uid(),
      role: "me",
      text,
      ts: Date.now(),
      status: "sending",
    };
    setState((s) => ({
      messages: [...s.messages, mine],
      updatedAt: Date.now(),
    }));

    // Tiny delay to flip "sending" -> "sent" (feels native)
    setTimeout(() => {
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.id === mine.id ? { ...m, status: "sent" } : m
        ),
      }));
    }, 220);

    // Show bot typing, then reply
    const reply = botReply(text);
    const wait = typingMs(reply);
    setBotTyping(true);
    setTimeout(() => {
      setBotTyping(false);
      setState((s) => ({
        messages: [
          ...s.messages.map((m) =>
            m.id === mine.id ? { ...m, status: "read" as const } : m
          ),
          {
            id: uid(),
            role: "bot",
            text: reply,
            ts: Date.now(),
            status: "read",
          },
        ],
        updatedAt: Date.now(),
      }));
    }, wait);
  }, []);

  const handleClear = useCallback(() => {
    clearState();
    setState({ messages: [WELCOME], updatedAt: Date.now() });
  }, []);

  const messagesWithMeta = useMemo(() => {
    return state.messages.map((m, i, arr) => {
      const next = arr[i + 1];
      const isLastOfRun = !next || next.role !== m.role;
      return { msg: m, showTime: isLastOfRun };
    });
  }, [state.messages]);

  return (
    <div className="flex flex-col h-full">
      <Header online onClear={handleClear} />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-clean px-3 py-3 space-y-1.5"
      >
        <AnimatePresence initial={false}>
          {messagesWithMeta.map(({ msg, showTime }) => (
            <Bubble key={msg.id} msg={msg} showTime={showTime} />
          ))}
          {botTyping && <TypingIndicator key="typing" />}
        </AnimatePresence>
      </div>

      <Composer onSend={handleSend} />
    </div>
  );
}
