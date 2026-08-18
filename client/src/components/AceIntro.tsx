import { useEffect } from "react";

export function AceIntro({ player, onDone }: { player: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-neutral-950 flex flex-col items-center justify-center overflow-hidden relative">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="absolute bottom-0 w-28 h-10 rounded-full bg-neutral-950 border-4 border-white/70" />
        <div
          className="absolute w-10 h-10 rounded-full bg-white shadow-lg"
          style={{ animation: "ace-ball-drop-zoom 1.6s cubic-bezier(0.5, 0, 0.6, 1) both" }}
        />
      </div>
      <div className="mt-6 text-5xl font-black text-amber-300 tracking-tight" style={{ animation: "pop-in 0.5s ease-out 0.9s both" }}>
        ACE!
      </div>
      <div
        className="mt-2 text-lg text-white font-semibold"
        style={{ animation: "pop-in 0.5s ease-out 1.1s both" }}
      >
        {player} just won it on a hole in one
      </div>
    </div>
  );
}
