"use client";

type Props = {
  online: boolean;
  onClear: () => void;
};

export default function Header({ online, onClear }: Props) {
  return (
    <div className="glass safe-top sticky top-0 z-20 border-b border-flame-200/60">
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-flame-800 leading-tight truncate">
            Llama
          </div>
          <div className="text-[11px] leading-tight flex items-center gap-1.5 text-flame-700/80">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                online ? "bg-emerald-500" : "bg-zinc-400"
              }`}
            />
            {online ? "en línea" : "desconectado"}
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-[11px] font-medium text-flame-700 hover:text-flame-800 px-2.5 py-1.5 rounded-full hover:bg-flame-100 active:scale-95 transition"
          aria-label="Limpiar chat"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-white/70 shadow-sm">
      <div
        className="absolute inset-0"
        style={{
          background:
            "conic-gradient(from 210deg at 50% 50%, #ffd166, #ef4a18, #c8231a, #ffba3d, #ffd166)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm drop-shadow">
        L
      </div>
    </div>
  );
}
