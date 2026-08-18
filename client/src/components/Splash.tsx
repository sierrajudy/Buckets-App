import { useEffect } from "react";

const BALL_DELAYS = [0, 0.18, 0.36, 0.52];

export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2100);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-700 to-green-900 flex flex-col items-center justify-center overflow-hidden">
      <div className="relative w-48 h-56">
        {BALL_DELAYS.map((delay, i) => (
          <div
            key={i}
            className="absolute top-0 w-8 h-8 rounded-full bg-white shadow-md"
            style={{
              left: `${14 + i * 24}%`,
              animation: `ball-drop 2.1s cubic-bezier(0.5, 0, 0.7, 1) ${delay}s both`,
            }}
          >
            <div className="absolute inset-1 rounded-full bg-white" />
            <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-neutral-200" />
            <div className="absolute top-3 left-4 w-1.5 h-1.5 rounded-full bg-neutral-200" />
          </div>
        ))}

        <svg
          viewBox="0 0 120 100"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-32"
          style={{ animation: "bucket-wobble 2.1s ease-in-out 0.6s both", transformOrigin: "60px 90px" }}
        >
          <rect x="14" y="34" width="92" height="58" rx="8" fill="#78350f" stroke="#451a03" strokeWidth="3" />
          <rect x="14" y="34" width="92" height="14" fill="#92400e" />
          <path d="M22 34 Q60 6 98 34" fill="none" stroke="#451a03" strokeWidth="5" strokeLinecap="round" />
        </svg>
      </div>

      <div
        className="mt-6 text-4xl font-black text-white tracking-tight"
        style={{ animation: "pop-in 0.6s ease-out 1.1s both" }}
      >
        Buckets
      </div>
      <div
        className="mt-1 text-sm text-green-200 font-medium tracking-wide"
        style={{ animation: "pop-in 0.6s ease-out 1.3s both" }}
      >
        Monarch Bay Golf Club
      </div>
    </div>
  );
}
