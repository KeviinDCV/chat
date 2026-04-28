"use client";

type Props = {
  presence: { name: "K" | "G" }[];
  myName: "K" | "G";
  otherTyping: boolean;
  onSwitchUser: () => void;
};

export default function Header({
  presence,
  myName,
  otherTyping,
  onSwitchUser,
}: Props) {
  const activeNames = new Set(presence.map((p) => p.name));
  const otherName: "K" | "G" = myName === "K" ? "G" : "K";
  const otherOnline = activeNames.has(otherName);
  const connectedCount = activeNames.size;

  return (
    <div className="glass safe-top sticky top-0 z-20 border-b border-flame-200/60">
      <div className="flex items-center gap-3 px-4 py-3">
        <Logo />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-flame-800 leading-tight truncate">
            K&amp;G
          </div>
          <div className="text-[11px] leading-tight flex items-center gap-1.5 text-flame-700/80">
            {otherTyping ? (
              <span className="text-flame-700 font-medium">
                {otherName} está escribiendo…
              </span>
            ) : (
              <>
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    otherOnline ? "bg-emerald-500" : "bg-zinc-400"
                  }`}
                />
                {otherOnline ? `${otherName} en línea` : `${otherName} desconectado`}
              </>
            )}
          </div>
        </div>

        <PresencePill count={connectedCount} />

        <button
          onClick={onSwitchUser}
          className="ml-1 text-[11px] font-semibold text-flame-700 hover:text-flame-900 px-2.5 py-1.5 rounded-full hover:bg-flame-100 active:scale-95 transition"
          aria-label="Cambiar usuario"
          title={`Soy: ${myName}`}
        >
          {myName}
        </button>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="relative h-9 w-9 rounded-xl overflow-hidden ring-2 ring-white/70 shadow-sm">
      <div
        className="absolute inset-0"
        style={{
          background:
            "conic-gradient(from 210deg at 50% 50%, #ffd166, #ef4a18, #c8231a, #ffba3d, #ffd166)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-white font-black text-[11px] tracking-tight drop-shadow">
        K&amp;G
      </div>
    </div>
  );
}

function PresencePill({ count }: { count: number }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 ring-1 ring-flame-200 text-flame-800"
      title={`${count} conectados`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span className="text-[11px] font-semibold leading-none">
        {count}/2
      </span>
    </div>
  );
}
