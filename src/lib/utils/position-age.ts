/**
 * Position Age Calculator
 *
 * Compares a team's average age per position group against the league average.
 */

import type { SleeperPlayer, SleeperRoster } from "@/lib/sleeper/types";

export interface PositionAgeComparison {
  position: string;
  teamAvgAge: number;
  leagueAvgAge: number;
  /** Positive = team is older than league average */
  delta: number;
  teamPlayerCount: number;
  leaguePlayerCount: number;
}

/**
 * Compute position age averages for a team vs the entire league.
 *
 * @param rosterPlayerIds - Player IDs on the target roster
 * @param allRosters - All rosters in the league
 * @param players - Player database
 * @param positions - Positions to analyze (default: QB, RB, WR, TE)
 */
export function computePositionAgeAverages(
  rosterPlayerIds: string[],
  allRosters: SleeperRoster[],
  players: Record<string, SleeperPlayer>,
  positions: string[] = ["QB", "RB", "WR", "TE"]
): PositionAgeComparison[] {
  const results: PositionAgeComparison[] = [];

  for (const pos of positions) {
    // Team players for this position
    const teamPlayers = rosterPlayerIds
      .map((id) => players[id])
      .filter((p) => p && p.position === pos && p.age != null);

    // League-wide players for this position (all rosters)
    const leaguePlayers: SleeperPlayer[] = [];
    for (const roster of allRosters) {
      for (const id of roster.players || []) {
        const p = players[id];
        if (p && p.position === pos && p.age != null) {
          leaguePlayers.push(p);
        }
      }
    }

    const teamAvg =
      teamPlayers.length > 0
        ? teamPlayers.reduce((sum, p) => sum + (p.age || 0), 0) /
          teamPlayers.length
        : 0;

    const leagueAvg =
      leaguePlayers.length > 0
        ? leaguePlayers.reduce((sum, p) => sum + (p.age || 0), 0) /
          leaguePlayers.length
        : 0;

    results.push({
      position: pos,
      teamAvgAge: teamAvg,
      leagueAvgAge: leagueAvg,
      delta: teamAvg - leagueAvg,
      teamPlayerCount: teamPlayers.length,
      leaguePlayerCount: leaguePlayers.length,
    });
  }

  return results;
}
