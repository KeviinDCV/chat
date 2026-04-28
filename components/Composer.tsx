"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Props = {
  onSend: (text: string) => void;
  onTypingChange?: (typing: boolean) => void;
};

export default function Composer({ onSend, onTypingChange }: Props) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const typingTO = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-resize textarea (max ~5 lines)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    const next = Math.min(ta.scrollHeight, 120);
    ta.style.height = next + "px";
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (onTypingChange) {
      onTypingChange(e.target.value.length > 0);
      if (typingTO.current) clearTimeout(typingTO.current);
      typingTO.current = setTimeout(() => onTypingChange(false), 1200);
    }
  };

  const send = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
    if (onTypingChange) onTypingChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const hasText = value.trim().length > 0;

  return (
    <div className="glass safe-bottom sticky bottom-0 z-20 border-t border-flame-200/60">
      <div className="px-3 py-2.5 flex items-end gap-2">
        <div className="flex-1 flex items-end bg-white/85 ring-1 ring-flame-200 rounded-3xl px-3.5 py-1.5 focus-within:ring-flame-400 transition">
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            placeholder="Escribe un mensaje…"
            className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-snug py-1.5 text-flame-900 placeholder:text-flame-700/40"
          />
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {hasText ? (
            <motion.button
              key="send"
              type="button"
              onClick={send}
              initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.4, opacity: 0, rotate: 20 }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 600, damping: 22 }}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-flame-500 to-flame-700 text-white grid place-items-center shadow-bubble active:shadow-none"
              aria-label="Enviar"
            >
              <ArrowUp />
            </motion.button>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="h-10 w-10 rounded-full grid place-items-center text-flame-400"
              aria-hidden
            >
              <Spark />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ArrowUp() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 19V6" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

function Spark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
      <path d="M12 2l1.6 4.7L18 8.3l-4.4 1.6L12 14.6 10.4 9.9 6 8.3l4.4-1.6L12 2zm6.5 11l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1 1-2.8z" />
    </svg>
  );
}
