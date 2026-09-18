import { QRCodeSVG } from "qrcode.react";

/** Encodes the same ?code= link the email invite and friend-add-to-round
 * notifications already use (see Home.tsx's codeFromLink) — scanning it
 * opens Buckets with the room code pre-filled in the join form, same as
 * clicking that link would. Room codes exclude 0/O/1/I/L specifically so
 * they're easy to read aloud or type by hand, but a table full of people
 * standing around a cart is exactly the case where just scanning beats
 * that anyway. */
export function RoomQrModal({ code, onClose }: { code: string; onClose: () => void }) {
  const link = `${window.location.origin}/?code=${code}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 max-w-xs w-full text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-neutral-900 dark:text-white">Scan to join</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
        <div className="bg-white p-4 rounded-xl inline-block">
          <QRCodeSVG value={link} size={220} />
        </div>
        <div className="font-mono text-2xl font-black tracking-[0.25em] text-primary-700 dark:text-primary-400">
          {code}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Or share the room code above to join manually</p>
      </div>
    </div>
  );
}
