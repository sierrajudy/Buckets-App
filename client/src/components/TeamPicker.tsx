import { useState } from "react";
import { AvatarIcon } from "./Avatars";
import type { RoomState, Teams } from "../types";

function defaultTeams(names: string[]): Teams {
  return [
    [names[0], names[1]],
    [names[2], names[3]],
  ];
}

function swapAcrossTeams(teams: Teams, a: string, b: string): Teams {
  const swap = (team: [string, string]): [string, string] =>
    team.map((n) => (n === a ? b : n === b ? a : n)) as [string, string];
  return [swap(teams[0]), swap(teams[1])];
}

/** Host-only pairing UI for High Low: always shows a valid 2v2 split (the
 * room seeds a join-order default the moment 4 players are in), and lets
 * the host rearrange it by tapping a player, then tapping someone on the
 * other team to swap the two of them. */
export function TeamPicker({
  state,
  isHost,
  onSetTeams,
  onSetHandicap,
}: {
  state: RoomState;
  isHost: boolean;
  onSetTeams: (teams: Teams) => void;
  onSetHandicap: (playerId: string, handicap: number) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  if (state.players.length !== 4) {
    return (
      <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 text-center text-sm text-white">
        Waiting for 4 players to set teams ({state.players.length}/4)
      </div>
    );
  }

  const names = state.players.map((p) => p.name);
  const teams = state.teams ?? defaultTeams(names);

  function playerFor(name: string) {
    return state.players.find((p) => p.name === name) ?? null;
  }

  function teamIndexOf(name: string): 0 | 1 {
    return teams[0].includes(name) ? 0 : 1;
  }

  function handleClick(name: string) {
    if (!isHost) return;
    if (!selected || selected === name) {
      setSelected(selected === name ? null : name);
      return;
    }
    if (teamIndexOf(selected) === teamIndexOf(name)) {
      setSelected(name); // same team — re-pick rather than a no-op swap
      return;
    }
    onSetTeams(swapAcrossTeams(teams, selected, name));
    setSelected(null);
  }

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="text-sm font-semibold text-white mb-1">Teams</div>
      {isHost && (
        <div className="text-xs text-white/70 mb-3">
          Tap a player, then tap someone on the other team to swap them. Set each player's handicap on the right.
        </div>
      )}
      <div className="space-y-3">
        {teams.map((team, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-white/70 mb-2">Team {i + 1}</div>
            <div className="space-y-2">
              {team.map((name) => {
                const player = playerFor(name);
                return (
                  <div
                    key={name}
                    className={`flex items-center gap-2 rounded-lg pl-2 pr-2 py-1.5 transition-colors ${
                      selected === name ? "bg-green-100 dark:bg-green-900 ring-2 ring-green-500" : ""
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => handleClick(name)}
                      className={`flex items-center gap-2 flex-1 min-w-0 text-left ${
                        isHost && selected !== name ? "hover:opacity-70" : ""
                      }`}
                    >
                      <AvatarIcon avatar={player?.avatar ?? null} className="w-7 h-7 shrink-0" />
                      <span className="text-sm font-medium text-white truncate">{name}</span>
                    </button>
                    <label className="flex items-center gap-1.5 shrink-0 text-xs text-white/70">
                      Hcp
                      <input
                        type="number"
                        min={0}
                        max={54}
                        disabled={!isHost}
                        value={player?.handicap ?? 0}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => player && onSetHandicap(player.id, Number(e.target.value) || 0)}
                        title="Handicap"
                        className="w-12 text-center rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm text-white py-1 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
