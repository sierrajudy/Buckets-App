import { useState } from "react";
import { Eye, QrCode } from "lucide-react";
import { useRoom } from "../store";
import { RoomQrModal } from "./RoomQrModal";

export function RoomCodeBadge({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { state } = useRoom();
  const [showQr, setShowQr] = useState(false);
  if (!state) return null;

  const spectatorCount = state.spectators.length;

  const wrapClass =
    variant === "dark"
      ? "bg-neutral-800 border-neutral-700 text-neutral-200"
      : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300";

  return (
    <>
      <button
        type="button"
        onClick={() => setShowQr(true)}
        title="Show QR code to join or spectate"
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shrink-0 ${wrapClass}`}
      >
        <span className="tracking-widest font-mono">{state.code}</span>
        <span className="opacity-40">·</span>
        <span className="flex items-center gap-0.5" title={`${spectatorCount} watching`}>
          <Eye size={13} aria-hidden /> {spectatorCount}
        </span>
        <QrCode size={13} aria-hidden />
      </button>
      {showQr && <RoomQrModal code={state.code} onClose={() => setShowQr(false)} />}
    </>
  );
}
