import { useMemo } from "react";
import { useRoom } from "../store";

export function ReactionOverlay() {
  const { reactions, dismissReaction } = useRoom();

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
      {reactions.map((r) => (
        <FloatingReaction key={r.id} emoji={r.emoji} name={r.name} onDone={() => dismissReaction(r.id)} />
      ))}
    </div>
  );
}

function FloatingReaction({ emoji, name, onDone }: { emoji: string; name: string; onDone: () => void }) {
  const left = useMemo(() => 8 + Math.random() * 78, []);
  const drift = useMemo(() => (Math.random() - 0.5) * 60, []);
  const duration = useMemo(() => 2.4 + Math.random() * 0.8, []);

  return (
    <div
      className="absolute bottom-16 flex flex-col items-center"
      style={{
        left: `${left}%`,
        animation: `reaction-float ${duration}s ease-out both`,
        // @ts-expect-error custom property for the keyframe
        "--drift": `${drift}px`,
      }}
      onAnimationEnd={onDone}
    >
      <span className="text-4xl drop-shadow">{emoji}</span>
      <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 bg-white/80 dark:bg-neutral-900/80 rounded-full px-1.5 py-0.5 mt-0.5 whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}
