import { useEffect, useState } from "react";
import { AvatarIcon } from "./Avatars";
import type { AvatarKey } from "../types";

export function PartyIntro({
  players,
  winner,
  onDone,
}: {
  players: { name: string; avatar: AvatarKey | null }[];
  winner: string;
  onDone: () => void;
}) {
  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    const bubbleTimer = setTimeout(() => setShowBubble(true), 2000);
    const doneTimer = setTimeout(onDone, 6000);
    return () => {
      clearTimeout(bubbleTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-end"
      style={{
        background:
          "linear-gradient(to bottom, #7dd3fc 0%, #bae6fd 38%, #86efac 38%, #4ade80 100%)",
      }}
    >
      <div
        className="absolute top-8 right-10 w-16 h-16 rounded-full bg-yellow-300"
        style={{ boxShadow: "0 0 40px 14px rgba(253, 224, 71, 0.55)" }}
      />
      <div className="absolute top-3 left-6 w-20 h-8 rounded-full bg-white/80" />
      <div className="absolute top-9 left-24 w-14 h-6 rounded-full bg-white/70" />

      <div
        className="absolute left-6 sm:left-16 opacity-90"
        style={{ top: "38%", transform: "translateY(-100%)" }}
      >
        <svg width="150" height="102" viewBox="0 -16 150 102">
          <rect x="10" y="34" width="130" height="52" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
          <path d="M0 34 L75 6 L150 34 Z" fill="#166534" stroke="#14532d" strokeWidth="2" />
          <rect x="64" y="56" width="22" height="30" fill="#15803d" stroke="#14532d" strokeWidth="1.5" />
          <rect x="24" y="46" width="14" height="14" fill="#bfdbfe" stroke="#0f172a" strokeWidth="1" />
          <rect x="112" y="46" width="14" height="14" fill="#bfdbfe" stroke="#0f172a" strokeWidth="1" />
          <line x1="75" y1="6" x2="75" y2="-12" stroke="#64748b" strokeWidth="2" />
          <path d="M75 -12 L98 -6 L75 0 Z" fill="#ef4444" />
        </svg>
      </div>

      <div className="relative z-10 flex items-end justify-center gap-6 pb-20 flex-wrap px-6 max-w-2xl">
        {players.map((p) => (
          <div key={p.name} className="flex flex-col items-center relative">
            {showBubble && p.name === winner && (
              <div
                className="absolute -top-28 w-52 bg-white text-neutral-900 text-sm font-semibold rounded-2xl px-3.5 py-2.5 shadow-lg text-center leading-snug"
                style={{ animation: "bubble-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
              >
                “Give me 30 minutes and I can fix your swing”
                <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
              </div>
            )}
            <div className="relative">
              <AvatarIcon avatar={p.avatar} className="w-16 h-16" />
              <span
                className="absolute -right-2 -bottom-1 text-2xl inline-block"
                style={{ animation: "beer-cheers 1.1s ease-in-out infinite" }}
              >
                🍺
              </span>
            </div>
            <span className="mt-2 text-sm font-bold text-neutral-900/80">{p.name}</span>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-6 text-center text-neutral-900/70 text-xs font-semibold tracking-wide">
        Clubhouse celebration ☀️
      </div>
    </div>
  );
}
