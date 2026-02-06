import type {
  SleeperBracketMatchup,
  SleeperUser,
  SleeperRoster,
} from "@/lib/sleeper/types";

export interface BracketPlacement {
  rosterId: number;
  placement: number; // 1 = champion, 2 = runner-up, etc.
}

/**
 * Resolve final placements from winners + losers bracket data.
 * The `p` field on bracket matchups indicates the placement position being decided.
 * For winners bracket: p=1 is the championship (1st/2nd), p=3 is 3rd/4th place, p=5 is 5th/6th.
 * For losers bracket: p=1 maps to 7th/8th (first non-playoff placement), p=3 maps to 9th/10th.
 */
export function resolveBracketPlacements(
  winnersBracket: SleeperBracketMatchup[],
  losersBracket: SleeperBracketMatchup[],
  playoffTeams: number = 6
): BracketPlacement[] {
  const placements: BracketPlacement[] = [];

  // Winners bracket placements
  for (const matchup of winnersBracket) {
    if (matchup.w != null && matchup.l != null) {
      if (matchup.p === 1) {
        // Championship game
        placements.push({ rosterId: matchup.w, placement: 1 });
        placements.push({ rosterId: matchup.l, placement: 2 });
      } else if (matchup.p === 3) {
        // 3rd place game
        placements.push({ rosterId: matchup.w, placement: 3 });
        placements.push({ rosterId: matchup.l, placement: 4 });
      } else if (matchup.p === 5) {
        // 5th place game
        placements.push({ rosterId: matchup.w, placement: 5 });
        placements.push({ rosterId: matchup.l, placement: 6 });
      }
    }
  }

  // Losers bracket placements (offset by playoff teams count)
  for (const matchup of losersBracket) {
    if (matchup.w != null && matchup.l != null) {
      if (matchup.p === 1) {
        // "1st" in losers = 7th overall (playoffTeams + 1)
        placements.push({ rosterId: matchup.w, placement: playoffTeams + 1 });
        placements.push({ rosterId: matchup.l, placement: playoffTeams + 2 });
      } else if (matchup.p === 3) {
        // "3rd" in losers = 9th overall
        placements.push({ rosterId: matchup.w, placement: playoffTeams + 3 });
        placements.push({ rosterId: matchup.l, placement: playoffTeams + 4 });
      }
    }
  }

  return placements.sort((a, b) => a.placement - b.placement);
}

/**
 * Get the champion's roster ID from winners bracket data.
 * Finds the championship matchup (p=1) and returns the winner.
 */
export function getChampionRosterId(
  winnersBracket: SleeperBracketMatchup[]
): number | null {
  const championship = winnersBracket.find((m) => m.p === 1);
  return championship?.w ?? null;
}

/**
 * Get the runner-up roster ID from winners bracket data.
 */
export function getRunnerUpRosterId(
  winnersBracket: SleeperBracketMatchup[]
): number | null {
  const championship = winnersBracket.find((m) => m.p === 1);
  return championship?.l ?? null;
}

/**
 * Build a display-ready bracket structure for visualization.
 */
export interface BracketRound {
  round: number;
  label: string;
  matchups: BracketMatchupDisplay[];
}

export interface BracketMatchupDisplay {
  matchupId: number;
  team1: BracketTeamDisplay | null;
  team2: BracketTeamDisplay | null;
  winnerId: number | null;
  placement?: number; // What place this game decides (1 = championship)
}

export interface BracketTeamDisplay {
  rosterId: number;
  teamName: string;
  displayName: string;
  avatar: string | null;
  seed?: number;
}

export function buildBracketDisplay(
  bracket: SleeperBracketMatchup[],
  rosters: SleeperRoster[],
  users: SleeperUser[],
  type: "winners" | "losers" = "winners"
): BracketRound[] {
  const userMap = new Map(users.map((u) => [u.user_id, u]));
  const rosterMap = new Map(rosters.map((r) => [r.roster_id, r]));

  function getTeamDisplay(rosterId: number | null): BracketTeamDisplay | null {
    if (rosterId == null) return null;
    const roster = rosterMap.get(rosterId);
    if (!roster) return null;
    const user = userMap.get(roster.owner_id);
    return {
      rosterId,
      teamName:
        user?.metadata?.team_name || user?.display_name || "Unknown",
      displayName: user?.display_name || user?.username || "Unknown",
      avatar: user?.avatar || null,
    };
  }

  // Resolve roster IDs from bracket references
  function resolveRosterId(
    ref: number | { w?: number; l?: number } | undefined
  ): number | null {
    if (ref == null) return null;
    if (typeof ref === "number") return ref;
    // It's a reference to another matchup's winner or loser
    const matchup = bracket.find((m) => {
      if (ref.w != null) return m.m === ref.w;
      if (ref.l != null) return m.m === ref.l;
      return false;
    });
    if (!matchup) return null;
    if (ref.w != null) return matchup.w;
    if (ref.l != null) return matchup.l;
    return null;
  }

  // Group by round
  const roundsMap = new Map<number, SleeperBracketMatchup[]>();
  for (const m of bracket) {
    const round = m.r;
    if (!roundsMap.has(round)) roundsMap.set(round, []);
    roundsMap.get(round)!.push(m);
  }

  const maxRound = Math.max(...bracket.map((m) => m.r));

  const roundLabels: Record<string, Record<number, string>> = {
    winners: {
      1: "Quarterfinals",
      2: "Semifinals",
      3: "Finals",
    },
    losers: {
      1: "Round 1",
      2: "Finals",
    },
  };

  const rounds: BracketRound[] = [];
  for (const [round, matchups] of roundsMap) {
    rounds.push({
      round,
      label:
        roundLabels[type]?.[round] ||
        (round === maxRound ? "Finals" : `Round ${round}`),
      matchups: matchups.map((m) => ({
        matchupId: m.m,
        team1: getTeamDisplay(resolveRosterId(m.t1)),
        team2: getTeamDisplay(resolveRosterId(m.t2)),
        winnerId: m.w,
        placement: m.p,
      })),
    });
  }

  return rounds.sort((a, b) => a.round - b.round);
}
