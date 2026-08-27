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
}: {
  state: RoomState;
  isHost: boolean;
  onSetTeams: (teams: Teams) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  if (state.players.length !== 4) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 text-center text-sm text-neutral-500">
        Waiting for 4 players to set teams ({state.players.length}/4)
      </div>
    );
  }

  const names = state.players.map((p) => p.name);
  const teams = state.teams ?? defaultTeams(names);

  function avatarFor(name: string) {
    return state.players.find((p) => p.name === name)?.avatar ?? null;
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
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
      <div className="text-sm font-semibold text-neutral-500 mb-1">Teams</div>
      {isHost && (
        <div className="text-xs text-neutral-400 mb-3">
          Tap a player, then tap someone on the other team to swap them.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {teams.map((team, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-neutral-400 mb-2">Team {i + 1}</div>
            <div className="space-y-2">
              {team.map((name) => (
                <button
                  key={name}
                  type="button"
                  disabled={!isHost}
                  onClick={() => handleClick(name)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    selected === name
                      ? "bg-green-100 dark:bg-green-900 ring-2 ring-green-500"
                      : isHost
                        ? "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        : ""
                  }`}
                >
                  <AvatarIcon avatar={avatarFor(name)} className="w-7 h-7 shrink-0" />
                  <span className="text-sm font-medium truncate">{name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
