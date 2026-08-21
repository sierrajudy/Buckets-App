import { useRoom } from "../store";

export function PredictionPicker({ dark = false, readOnly = false }: { dark?: boolean; readOnly?: boolean }) {
  const { state, playerId, predict } = useRoom();
  if (!state) return null;

  const myPick = playerId ? state.predictions[playerId] : undefined;
  const tally: Record<string, number> = {};
  for (const name of Object.values(state.predictions)) {
    tally[name] = (tally[name] ?? 0) + 1;
  }

  const wrapClass = dark
    ? "bg-neutral-900 border-neutral-800"
    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800";
  const labelClass = dark ? "text-neutral-400" : "text-neutral-500";
  const idleBtnClass = dark
    ? "border-neutral-700 text-neutral-200"
    : "border-neutral-200 dark:border-neutral-700";
  const idleBtnHover = readOnly
    ? ""
    : dark
      ? "hover:bg-neutral-800"
      : "hover:bg-neutral-50 dark:hover:bg-neutral-800";
  const tallyClass = dark ? "text-neutral-500" : "text-neutral-400";

  return (
    <div className={`rounded-xl border p-3 ${wrapClass}`}>
      <div className={`text-xs font-semibold mb-2 ${labelClass}`}>🔮 Who's going to win?</div>
      <div className="flex flex-wrap gap-2">
        {state.players.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={readOnly}
            onClick={() => predict(p.name)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              readOnly ? "cursor-default" : ""
            } ${
              myPick === p.name
                ? "border-green-600 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
                : `${idleBtnClass} ${idleBtnHover}`
            }`}
          >
            {p.name}
            {tally[p.name] ? <span className={`text-xs ${tallyClass}`}>({tally[p.name]})</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
