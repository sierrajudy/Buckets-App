import { AvatarIcon } from "./Avatars";
import type { AvatarKey } from "../types";

export function GolfCart({ avatars, size = 64 }: { avatars?: (AvatarKey | null)[]; size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size * 0.75 }}>
      <svg viewBox="0 0 120 90" width="100%" height="100%" role="img" aria-label="Golf cart">
        <rect x="14" y="8" width="70" height="6" rx="3" fill="#1e293b" />
        <line x1="18" y1="8" x2="18" y2="34" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
        <line x1="80" y1="8" x2="80" y2="34" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" />
        <rect x="10" y="34" width="82" height="30" rx="8" fill="#3b82f6" stroke="#0f172a" strokeWidth="3" />
        <rect x="70" y="20" width="22" height="24" rx="4" fill="#bfdbfe" stroke="#0f172a" strokeWidth="2" />
        <circle cx="30" cy="76" r="12" fill="#1e293b" stroke="#0f172a" strokeWidth="2" className="cart-wheel" />
        <circle cx="76" cy="76" r="12" fill="#1e293b" stroke="#0f172a" strokeWidth="2" className="cart-wheel" />
        <circle cx="30" cy="76" r="4" fill="#94a3b8" className="cart-wheel" />
        <circle cx="76" cy="76" r="4" fill="#94a3b8" className="cart-wheel" />
      </svg>
      {avatars && avatars.length > 0 && (
        <div className="absolute inset-x-0 flex items-end justify-center gap-1" style={{ top: "26%", height: "42%" }}>
          {avatars.slice(0, 3).map((a, i) => (
            <span key={i} className="block" style={{ width: size * 0.26, height: size * 0.26 }}>
              <AvatarIcon avatar={a} className="w-full h-full" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
