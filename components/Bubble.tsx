"use client";

import { motion } from "framer-motion";
import type { Message } from "@/lib/storage";

type Props = {
  msg: Message;
  myName: "K" | "G";
  showTime?: boolean;
  pending?: boolean;
};

export default function Bubble({ msg, myName, showTime, pending }: Props) {
  const mine = msg.sender === myName;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.6 }}
      animate={{ opacity: pending ? 0.6 : 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 520,
        damping: 28,
        mass: 0.7,
      }}
      className={`flex w-full ${mine ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[78%] flex flex-col ${mine ? "items-end" : "items-start"}`}>
        <div
          className={`
            relative px-3.5 py-2 rounded-3xl text-[15px] leading-snug
            ${
              mine
                ? "bg-gradient-to-br from-flame-500 to-flame-700 text-white rounded-br-md shadow-bubble"
                : "bg-flame-50 text-flame-900 rounded-bl-md ring-1 ring-flame-100/80"
            }
          `}
        >
          <span className="whitespace-pre-wrap break-words">{msg.text}</span>
        </div>
        {showTime && (
          <div className={`text-[10px] mt-1 px-1 ${mine ? "text-flame-700/70" : "text-flame-700/60"}`}>
            {formatTime(msg.ts)}
            {mine && (
              <span className="ml-1">{pending ? "·" : "✓"}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
