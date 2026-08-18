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
          <defs>
            <linearGradient id="bucketMetal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="35%" stopColor="#cbd5e1" />
              <stop offset="60%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#b8c3d1" />
            </linearGradient>
          </defs>

          <path
            d="M18 30 Q60 20 102 30 L95 92 Q60 100 25 92 Z"
            fill="url(#bucketMetal)"
            stroke="#64748b"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M17 52 L103 52 L101 58 L19 58 Z" fill="#94a3b8" opacity="0.7" />
          <path d="M21 74 L99 74 L97.5 79 L22.5 79 Z" fill="#94a3b8" opacity="0.7" />
          <ellipse cx="60" cy="30" rx="42" ry="8" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
          <ellipse cx="60" cy="30" rx="42" ry="8" fill="none" stroke="#f8fafc" strokeWidth="1.5" opacity="0.6" />
          <path d="M30 88 Q34 46 32 27" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <path
            d="M25 27 Q60 2 95 27"
            fill="none"
            stroke="#64748b"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M25 27 Q60 2 95 27"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
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
