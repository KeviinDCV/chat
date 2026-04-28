"use client";

import { motion } from "framer-motion";

type Props = {
  onPick: (name: "K" | "G") => void;
};

export default function NamePrompt({ onPick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-40 grid place-items-center px-6"
      style={{
        background:
          "linear-gradient(160deg, rgba(255,209,102,0.95) 0%, rgba(251,86,7,0.95) 55%, rgba(208,0,0,0.95) 100%)",
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="w-full max-w-sm bg-white/95 rounded-3xl p-6 shadow-2xl ring-1 ring-flame-200"
      >
        <div className="text-center mb-5">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-flame-400 to-flame-700 grid place-items-center text-white text-2xl font-extrabold shadow-bubble">
            K&amp;G
          </div>
          <h1 className="mt-3 text-xl font-bold text-flame-900">
            Bienvenida/o
          </h1>
          <p className="text-sm text-flame-700/80 mt-1">
            ¿Quién eres?
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PickButton letter="K" onClick={() => onPick("K")} />
          <PickButton letter="G" onClick={() => onPick("G")} />
        </div>
        <p className="text-[11px] text-center text-flame-700/60 mt-4">
          Esto se guarda en este dispositivo. Puedes cambiarlo después.
        </p>
      </motion.div>
    </motion.div>
  );
}

function PickButton({
  letter,
  onClick,
}: {
  letter: "K" | "G";
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative h-24 rounded-2xl bg-gradient-to-br from-flame-300 via-flame-500 to-flame-700 text-white text-4xl font-extrabold shadow-bubble overflow-hidden"
    >
      <span className="relative z-10 drop-shadow">{letter}</span>
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.45), transparent 50%)",
        }}
      />
    </motion.button>
  );
}
