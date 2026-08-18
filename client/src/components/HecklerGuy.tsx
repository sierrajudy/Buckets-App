export function HecklerGuy({ message }: { message: string }) {
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ top: "40%", right: "6%", animation: "pop-in 0.4s ease-out both" }}
    >
      <div className="relative bg-white text-neutral-900 text-xs sm:text-sm font-extrabold rounded-2xl px-3 py-2 shadow-lg mb-1 max-w-[150px] text-center leading-snug">
        {message}
        <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white rotate-45" />
      </div>
      <svg width="48" height="72" viewBox="0 0 64 96" role="img" aria-label="Heckler">
        <rect x="22" y="70" width="8" height="24" rx="3" fill="#334155" />
        <rect x="34" y="70" width="8" height="24" rx="3" fill="#334155" />
        <rect x="16" y="38" width="32" height="34" rx="8" fill="#0ea5e9" stroke="#0f172a" strokeWidth="2" />
        <line x1="45" y1="44" x2="58" y2="22" stroke="#0ea5e9" strokeWidth="8" strokeLinecap="round" />
        <circle cx="59" cy="19" r="4.5" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="19" y1="46" x2="9" y2="58" stroke="#0ea5e9" strokeWidth="8" strokeLinecap="round" />
        <circle cx="32" cy="20" r="17" fill="#fbbf24" stroke="#0f172a" strokeWidth="2" />
        <circle cx="25" cy="17" r="3" fill="#0f172a" />
        <circle cx="39" cy="17" r="3" fill="#0f172a" />
        <ellipse cx="32" cy="27" rx="6" ry="5.5" fill="#7f1d1d" stroke="#0f172a" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
