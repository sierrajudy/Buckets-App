import { useEffect, useRef, useState } from "react";
import { toBlob, toPng } from "html-to-image";
import { RecapCard } from "./RecapCard";
import type { Player, RoundSummary } from "../types";

/** Renders RecapCard off-screen at its real fixed size (html-to-image needs
 * the actual laid-out node to capture, not something CSS-scaled down for
 * display) and generates a PNG preview from it once on mount — the preview
 * shown to the user is just that PNG in a normal, responsive <img>, which
 * sidesteps having to make the 540px-wide card itself responsive. Save
 * downloads that same image; Share re-captures a fresh Blob for
 * navigator.share (needs a File, not a data URL), falling back to a
 * download on desktop browsers/older mobile browsers without file-sharing
 * support. */
export function ShareRecapModal({
  round,
  players,
  onClose,
}: {
  round: RoundSummary;
  players: Player[];
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    toPng(cardRef.current, { pixelRatio: 2 })
      .then(setPreviewUrl)
      .catch(() => setError("Couldn't generate the recap image."));
  }, []);

  const fileName = `buckets-${round.course.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;

  function handleSave() {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.download = fileName;
    link.href = previewUrl;
    link.click();
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2 });
      if (!blob) throw new Error("Couldn't generate image.");
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Buckets round recap" });
      } else {
        handleSave();
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return; // user just closed the share sheet
      setError("Couldn't share the image — try Save instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg w-full max-w-sm max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex items-center justify-between border-b border-neutral-800 shrink-0">
          <h2 className="font-bold text-white">Share this round</h2>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-white text-sm">
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {previewUrl ? (
            <img src={previewUrl} alt="Round recap" className="w-full h-auto rounded-xl" />
          ) : (
            <div className="aspect-[9/16] rounded-xl bg-neutral-800 flex items-center justify-center text-sm text-neutral-500">
              {error ?? "Generating…"}
            </div>
          )}
          {/* Off-screen, full-size — the actual capture target. */}
          <div className="fixed -left-[9999px] top-0" aria-hidden="true">
            <RecapCard ref={cardRef} round={round} players={players} />
          </div>
        </div>

        {error && previewUrl && <p className="px-4 pb-2 text-sm text-red-400 shrink-0">{error}</p>}

        <div className="p-4 flex gap-3 border-t border-neutral-800 shrink-0">
          <button
            type="button"
            disabled={!previewUrl || busy}
            onClick={handleSave}
            className="flex-1 rounded-lg border border-neutral-700 text-white py-2.5 font-semibold text-sm hover:bg-neutral-800 disabled:opacity-50"
          >
            Save image
          </button>
          <button
            type="button"
            disabled={!previewUrl || busy}
            onClick={handleShare}
            className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-white py-2.5 font-semibold text-sm disabled:opacity-50"
          >
            {busy ? "…" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
