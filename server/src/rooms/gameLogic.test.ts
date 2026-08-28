import { describe, expect, it } from "vitest";
import {
  buildHolesOrder,
  computeBaseballHoleResult,
  computeHighLowHoleResult,
  computeHoleResult,
  computeRunningTotals,
  computeWolfHoleResult,
  findTiedLeaders,
  finalizeHighLowRound,
  finalizeRound,
} from "./gameLogic.js";
import type { HoleEntry, HoleResult, Teams } from "./types.js";

/** A par-4, handicap-index-6 hole with no strokes yet — each test overrides
 * just the fields (usually `strokes`) it cares about, same shape roomStore
 * hands these functions in the real app. */
function makeEntry(overrides: Partial<HoleEntry> = {}): HoleEntry {
  return {
    holeNumber: 1,
    par: 4,
    yardage: 400,
    handicap: 6,
    strokes: {},
    bucketWinners: [],
    pgeEnabled: false,
    pgeWinners: [],
    wolfPartner: null,
    wolfAlone: false,
    ...overrides,
  };
}

describe("computeHoleResult (standard mode)", () => {
  const players = ["A", "B", "C", "D"];

  it("pays the full 2-point pool to a solo winner", () => {
    const entry = makeEntry({ strokes: { A: 4, B: 5, C: 5, D: 5 } });
    const result = computeHoleResult(entry, players);
    expect(result.holeWinners).toEqual(["A"]);
    expect(result.holePoints).toEqual({ A: 2, B: 0, C: 0, D: 0 });
  });

  it("splits the pool evenly across a tie for the win", () => {
    const entry = makeEntry({ strokes: { A: 4, B: 4, C: 5, D: 5 } });
    const result = computeHoleResult(entry, players);
    expect(result.holeWinners.sort()).toEqual(["A", "B"]);
    expect(result.holePoints).toEqual({ A: 1, B: 1, C: 0, D: 0 });
  });

  it("adds a +1 birdie bonus on top of any hole-win points", () => {
    const entry = makeEntry({ strokes: { A: 3, B: 5, C: 5, D: 5 } }); // par 4, A shoots 3
    const result = computeHoleResult(entry, players);
    expect(result.isBirdie).toBe(true);
    expect(result.totalPoints.A).toBe(3); // 2 for the win + 1 birdie bonus
  });

  it("adds a +2 eagle bonus, and eagle/birdie are mutually exclusive", () => {
    const entry = makeEntry({ strokes: { A: 2, B: 5, C: 5, D: 5 } }); // par 4, A shoots 2
    const result = computeHoleResult(entry, players);
    expect(result.isEagle).toBe(true);
    expect(result.isBirdie).toBe(false);
    expect(result.totalPoints.A).toBe(4); // 2 for the win + 2 eagle bonus
  });

  it("splits bucket points among however many bucket winners there are", () => {
    const entry = makeEntry({ strokes: { A: 4, B: 4, C: 4, D: 4 }, bucketWinners: ["B", "C"] });
    const result = computeHoleResult(entry, players);
    expect(result.bucketPoints).toEqual({ A: 0, B: 0.5, C: 0.5, D: 0 });
  });

  it("pays PG&E points only when it's enabled for the hole", () => {
    const disabled = computeHoleResult(makeEntry({ strokes: { A: 4, B: 4 }, pgeWinners: ["A"] }), players);
    expect(disabled.pgePoints.A).toBe(0);

    const enabled = computeHoleResult(
      makeEntry({ strokes: { A: 4, B: 4 }, pgeEnabled: true, pgeWinners: ["A"] }),
      players,
    );
    expect(enabled.pgePoints.A).toBe(1);
  });

  it("flags a hole-in-one", () => {
    const entry = makeEntry({ strokes: { A: 1, B: 5, C: 5, D: 5 } });
    const result = computeHoleResult(entry, players);
    expect(result.isHoleInOne).toBe(true);
    expect(result.holeInOnePlayers).toEqual(["A"]);
  });

  it("leaves a player with no strokes entered out of the hole entirely", () => {
    const entry = makeEntry({ strokes: { A: 4, B: 4, C: 4 } }); // D never entered
    const result = computeHoleResult(entry, players);
    expect(result.strokes.D).toBe(0);
    expect(result.holeWinners).not.toContain("D");
  });
});

describe("computeHighLowHoleResult", () => {
  const players = ["A", "B", "C", "D"];
  const teams: Teams = [
    ["A", "B"],
    ["C", "D"],
  ];
  const noHandicaps = { A: 0, B: 0, C: 0, D: 0 };

  it("pays 1 point per matchup won, 2 total on a clean sweep", () => {
    // Team0 (A,B): A=4 low, B=6 high. Team1 (C,D): C=5, D=7.
    // Low matchup: A(4) beats C(5). High matchup: B(6) beats D(7). Team0 sweeps.
    const entry = makeEntry({ strokes: { A: 4, B: 6, C: 5, D: 7 } });
    const result = computeHighLowHoleResult(entry, teams, players, noHandicaps, 18);
    expect(result.highLow!.matchPoints).toEqual([2, 0]);
    expect(result.holePoints).toEqual({ A: 2, B: 2, C: 0, D: 0 });
  });

  it("pays nothing for a matchup that ties (\"no blood\")", () => {
    // Low matchup ties (4 vs 4); high matchup: B(6) beats D(7).
    const entry = makeEntry({ strokes: { A: 4, B: 6, C: 4, D: 7 } });
    const result = computeHighLowHoleResult(entry, teams, players, noHandicaps, 18);
    expect(result.highLow!.lowWinner).toBe("tie");
    expect(result.highLow!.matchPoints).toEqual([1, 0]);
  });

  it("uses NET score (after handicap strokes) to decide low/high, not gross", () => {
    // Gross: A=5, C=4 — C would be the lower gross score. But A gets a
    // stroke on this hole (handicap index 6, A plays to a 10 => stroke on
    // every hole with index <= 10), so A's net is 4, tying C's net of 4.
    const entry = makeEntry({ handicap: 6, strokes: { A: 5, B: 8, C: 4, D: 9 } });
    const handicaps = { A: 10, B: 0, C: 0, D: 0 };
    const result = computeHighLowHoleResult(entry, teams, players, handicaps, 18);
    expect(result.highLow!.netStrokes.A).toBe(4);
    expect(result.highLow!.lowWinner).toBe("tie");
  });

  it("pays a team a birdie/eagle bonus whenever EITHER member earns it, regardless of their matchup", () => {
    // A shoots a birdie (3 on a par 4) but still loses the low matchup to C's 2.
    const entry = makeEntry({ strokes: { A: 3, B: 6, C: 2, D: 7 } });
    const result = computeHighLowHoleResult(entry, teams, players, noHandicaps, 18);
    expect(result.highLow!.bonusPoints[0]).toBe(0.5); // team0's birdie bonus, despite losing that matchup
    expect(result.highLow!.bonusPoints[1]).toBe(1); // team1's eagle bonus
  });

  it("only counts the GROSS score for the birdie/eagle bonus, not a handicap-assisted net birdie", () => {
    // A shoots a gross par (4) but nets a birdie (3) via a handicap stroke —
    // that should NOT earn the bonus, only a real gross birdie/eagle does.
    const entry = makeEntry({ handicap: 6, strokes: { A: 4, B: 6, C: 5, D: 7 } });
    const handicaps = { A: 10, B: 0, C: 0, D: 0 };
    const result = computeHighLowHoleResult(entry, teams, players, handicaps, 18);
    expect(result.isBirdie).toBe(false);
    expect(result.highLow!.bonusPoints).toEqual([0, 0]);
  });
});

describe("computeWolfHoleResult", () => {
  const players = ["Wolf", "Partner", "Opp1", "Opp2"];

  it("pays 1 point each to a winning 2v2 partnered side", () => {
    const entry = makeEntry({ wolfPartner: "Partner", strokes: { Wolf: 4, Partner: 4, Opp1: 5, Opp2: 5 } });
    const result = computeWolfHoleResult(entry, "Wolf", players);
    expect(result.wolf!.outcome).toBe("teamA");
    expect(result.holePoints).toEqual({ Wolf: 1, Partner: 1, Opp1: 0, Opp2: 0 });
  });

  it("pays the lone wolf 3 points for beating all three alone", () => {
    const entry = makeEntry({ wolfAlone: true, strokes: { Wolf: 4, Partner: 5, Opp1: 5, Opp2: 5 } });
    const result = computeWolfHoleResult(entry, "Wolf", players);
    expect(result.wolf!.outcome).toBe("teamA");
    expect(result.holePoints.Wolf).toBe(3);
  });

  it("pays each of the three 1 point for beating a lone wolf", () => {
    const entry = makeEntry({ wolfAlone: true, strokes: { Wolf: 6, Partner: 4, Opp1: 5, Opp2: 5 } });
    const result = computeWolfHoleResult(entry, "Wolf", players);
    expect(result.wolf!.outcome).toBe("teamB");
    expect(result.holePoints).toEqual({ Wolf: 0, Partner: 1, Opp1: 1, Opp2: 1 });
  });

  it("pays nobody on a tie between the two sides' best scores", () => {
    const entry = makeEntry({ wolfPartner: "Partner", strokes: { Wolf: 5, Partner: 4, Opp1: 4, Opp2: 6 } });
    const result = computeWolfHoleResult(entry, "Wolf", players);
    expect(result.wolf!.outcome).toBe("tie");
    expect(Object.values(result.holePoints).every((v) => v === 0)).toBe(true);
  });

  it("shares a partner's birdie bonus with the whole winning 2v2 team", () => {
    // Partner birdies (3 on a par 4) and wins the hole for the team; Wolf
    // himself just pars. Both should get the doubled points, not just Partner.
    const entry = makeEntry({ wolfPartner: "Partner", strokes: { Wolf: 4, Partner: 3, Opp1: 4, Opp2: 5 } });
    const result = computeWolfHoleResult(entry, "Wolf", players);
    expect(result.holePoints).toEqual({ Wolf: 2, Partner: 2, Opp1: 0, Opp2: 0 });
  });

  it("shares an eagle bonus (×3) the same way, and it beats a simultaneous birdie", () => {
    const entry = makeEntry({ wolfPartner: "Partner", strokes: { Wolf: 4, Partner: 2, Opp1: 4, Opp2: 5 } });
    const result = computeWolfHoleResult(entry, "Wolf", players);
    expect(result.holePoints).toEqual({ Wolf: 3, Partner: 3, Opp1: 0, Opp2: 0 });
  });

  it("shares a birdie bonus across all three players on the anti-wolf side too", () => {
    const entry = makeEntry({ wolfAlone: true, strokes: { Wolf: 5, Partner: 3, Opp1: 4, Opp2: 4 } });
    const result = computeWolfHoleResult(entry, "Wolf", players);
    expect(result.wolf!.outcome).toBe("teamB");
    expect(result.holePoints).toEqual({ Wolf: 0, Partner: 2, Opp1: 2, Opp2: 2 });
  });

  it("never pays a bonus to the losing side, even if one of them birdied", () => {
    // Opp1 birdies (3 on this par 4) but Wolf's eagle (2) still wins the
    // hole for team A outright — Opp1's birdie doesn't help their side,
    // since 0 base points × any multiplier is still 0.
    const entry = makeEntry({ wolfPartner: "Partner", strokes: { Wolf: 2, Partner: 5, Opp1: 3, Opp2: 6 } });
    const result = computeWolfHoleResult(entry, "Wolf", players);
    expect(result.wolf!.outcome).toBe("teamA");
    expect(result.holePoints).toEqual({ Wolf: 3, Partner: 3, Opp1: 0, Opp2: 0 }); // ×3 from Wolf's own eagle
  });

  it("has no outcome yet if the wolf hasn't chosen a partner or to go alone", () => {
    const entry = makeEntry({ strokes: { Wolf: 4, Partner: 4, Opp1: 5, Opp2: 5 } });
    const result = computeWolfHoleResult(entry, "Wolf", players);
    expect(result.wolf!.outcome).toBeNull();
  });
});

describe("computeBaseballHoleResult", () => {
  const players = ["A", "B", "C"];

  it("splits the 9-point pot 5/3/1 with a clean finish", () => {
    const entry = makeEntry({ strokes: { A: 3, B: 4, C: 5 } });
    const result = computeBaseballHoleResult(entry, players);
    expect(result.holePoints).toEqual({ A: 5, B: 3, C: 1 });
    expect(result.baseball!.rankGroups).toEqual([["A"], ["B"], ["C"]]);
  });

  it("pools and splits 1st+2nd's points evenly on a 2-way tie for the win", () => {
    const entry = makeEntry({ strokes: { A: 3, B: 3, C: 5 } });
    const result = computeBaseballHoleResult(entry, players);
    expect(result.holePoints).toEqual({ A: 4, B: 4, C: 1 }); // (5+3)/2 each, C keeps the solo 3rd-place point
  });

  it("splits all 9 points evenly on a 3-way tie", () => {
    const entry = makeEntry({ strokes: { A: 4, B: 4, C: 4 } });
    const result = computeBaseballHoleResult(entry, players);
    expect(result.holePoints).toEqual({ A: 3, B: 3, C: 3 });
  });

  it("has no points or rank groups until all three have scored", () => {
    const entry = makeEntry({ strokes: { A: 4, B: 4 } }); // C hasn't entered a score
    const result = computeBaseballHoleResult(entry, players);
    expect(result.baseball!.rankGroups).toBeNull();
    expect(Object.values(result.holePoints).every((v) => v === 0)).toBe(true);
  });
});

describe("finalizeRound (standard mode)", () => {
  const players = ["A", "B", "C"];

  function holeWith(totalPoints: Record<string, number>): HoleResult {
    return {
      holeNumber: 1,
      par: 4,
      yardage: 400,
      handicap: 1,
      strokes: { A: 4, B: 4, C: 4 },
      isBirdie: false,
      isEagle: false,
      isHoleInOne: false,
      holeInOnePlayers: [],
      holeWinners: [],
      holePoints: totalPoints,
      bucketWinners: [],
      bucketPoints: { A: 0, B: 0, C: 0 },
      pgeEnabled: false,
      pgeWinners: [],
      pgePoints: { A: 0, B: 0, C: 0 },
      totalPoints,
    };
  }

  it("picks the highest total as the winner", () => {
    const round = finalizeRound({
      course: "Test Links",
      hostName: "A",
      players,
      startingHole: 1,
      holes: [holeWith({ A: 5, B: 2, C: 1 })],
      holeInOnePlayer: null,
      puttOffWinner: null,
    });
    expect(round.winner).toBe("A");
    expect(round.winners).toEqual(["A"]);
  });

  it("a hole-in-one wins outright regardless of the running totals", () => {
    const round = finalizeRound({
      course: "Test Links",
      hostName: "A",
      players,
      startingHole: 1,
      holes: [holeWith({ A: 1, B: 9, C: 1 })],
      holeInOnePlayer: "A",
      puttOffWinner: null,
    });
    expect(round.winner).toBe("A");
  });

  it("falls back to the putt-off winner when the leaders are tied", () => {
    const round = finalizeRound({
      course: "Test Links",
      hostName: "A",
      players,
      startingHole: 1,
      holes: [holeWith({ A: 5, B: 5, C: 1 })],
      holeInOnePlayer: null,
      puttOffWinner: "B",
    });
    expect(round.winner).toBe("B");
    expect(round.puttOff).toEqual({ used: true, winner: "B" });
  });
});

describe("finalizeHighLowRound", () => {
  const players = ["A", "B", "C", "D"];
  const teams: Teams = [
    ["A", "B"],
    ["C", "D"],
  ];

  function highLowHole(teamPoints: [number, number]): HoleResult {
    return {
      holeNumber: 1,
      par: 4,
      yardage: 400,
      handicap: 1,
      strokes: { A: 4, B: 4, C: 4, D: 4 },
      isBirdie: false,
      isEagle: false,
      isHoleInOne: false,
      holeInOnePlayers: [],
      holeWinners: [],
      holePoints: {},
      bucketWinners: [],
      bucketPoints: { A: 0, B: 0, C: 0, D: 0 },
      pgeEnabled: false,
      pgeWinners: [],
      pgePoints: { A: 0, B: 0, C: 0, D: 0 },
      totalPoints: {},
      highLow: {
        lowPlayers: ["A", "C"],
        lowWinner: "tie",
        highPlayers: ["B", "D"],
        highWinner: "tie",
        matchPoints: [0, 0],
        bonusPoints: [0, 0],
        teamPoints: teamPoints,
        netStrokes: { A: 4, B: 4, C: 4, D: 4 },
      },
    };
  }

  it("declares an overall winner from the summed team points across every hole", () => {
    const round = finalizeHighLowRound({
      course: "Test Links",
      hostName: "A",
      players,
      startingHole: 1,
      holes: [highLowHole([2, 0]), highLowHole([1, 1]), highLowHole([0, 2])],
      teams,
    });
    // 3-3 overall — a push, no winner
    expect(round.highLow!.overall.winner).toBeNull();
    expect(round.winners).toEqual([]);
  });

  it("splits front 9 / back 9 separately from the overall total", () => {
    const holes = [...Array(9).fill(null).map(() => highLowHole([2, 0])), ...Array(9).fill(null).map(() => highLowHole([0, 2]))];
    const round = finalizeHighLowRound({ course: "Test Links", hostName: "A", players, startingHole: 1, holes, teams });
    expect(round.highLow!.front.winner).toBe(0);
    expect(round.highLow!.back.winner).toBe(1);
    expect(round.highLow!.overall.winner).toBeNull(); // 18-18 overall
  });

  it("sets winners/losers to both members of the winning team", () => {
    const round = finalizeHighLowRound({
      course: "Test Links",
      hostName: "A",
      players,
      startingHole: 1,
      holes: [highLowHole([2, 0])],
      teams,
    });
    expect(round.winners.sort()).toEqual(["A", "B"]);
    expect(round.losers.sort()).toEqual(["C", "D"]);
  });
});

describe("small helpers", () => {
  it("buildHolesOrder wraps around from the starting hole", () => {
    expect(buildHolesOrder(16, 18)).toEqual([16, 17, 18, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(buildHolesOrder(1, 9)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("findTiedLeaders is empty with a clear leader, non-empty on a tie for first", () => {
    expect(findTiedLeaders({ A: 5, B: 3 }, ["A", "B"])).toEqual([]);
    expect(findTiedLeaders({ A: 5, B: 5, C: 1 }, ["A", "B", "C"]).sort()).toEqual(["A", "B"]);
  });

  it("computeRunningTotals sums totalPoints across every hole passed in", () => {
    const holes = [
      { totalPoints: { A: 2, B: 0 } } as unknown as HoleResult,
      { totalPoints: { A: 1, B: 3 } } as unknown as HoleResult,
    ];
    expect(computeRunningTotals(holes, ["A", "B"])).toEqual({ A: 3, B: 3 });
  });
});
