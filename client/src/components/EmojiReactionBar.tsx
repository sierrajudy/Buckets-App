import { useRoom } from "../store";

const EMOJIS = ["🎉", "😂", "🔥", "😱", "👏", "🍺", "⛳", "💩"];

export function EmojiReactionBar({ dark = false }: { dark?: boolean }) {
  const { sendReaction } = useRoom();

  const wrapClass = dark ? "bg-neutral-900 border-neutral-800" : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800";
  const labelClass = dark ? "text-neutral-400" : "text-neutral-500";
  const btnClass = dark
    ? "border-neutral-700 hover:bg-neutral-800"
    : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <div className={`rounded-xl border p-3 ${wrapClass}`}>
      <div className={`text-xs font-semibold mb-2 ${labelClass}`}>React</div>
      <div className="flex flex-wrap gap-2">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => sendReaction(e)}
            className={`text-xl w-10 h-10 rounded-lg border active:scale-90 transition-transform ${btnClass}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
