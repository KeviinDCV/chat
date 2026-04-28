"use client";

import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="flex justify-start"
    >
      <div className="bg-flame-50 ring-1 ring-flame-100/80 rounded-3xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-1">
        <Dot delay={0} />
        <Dot delay={0.15} />
        <Dot delay={0.3} />
      </div>
    </motion.div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="block h-2 w-2 rounded-full bg-flame-500"
      animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}
