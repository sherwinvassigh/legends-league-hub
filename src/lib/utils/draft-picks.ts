/**
 * Draft Pick Ownership Resolver
 *
 * Resolves current ownership of all future draft picks by applying
 * traded_picks data from the Sleeper API.
 */

import { getTradedPicks } from "@/lib/sleeper/league";
import type { SleeperTradedPick, SleeperRoster } from "@/lib/sleeper/types";

export interface DraftPickOwnership {
  season: string;
  round: number;
  /** The original team (whose pick this was) */
  originalTeamRosterId: number;
  /** Who currently owns this pick */
  currentOwnerRosterId: number;
  /** Status relative to the original team */
  status: "owns_own" | "acquired" | "traded_away";
}

export interface TeamPickCapital {
  rosterId: number;
  totalOwned: number;
  totalTradedAway: number;
  ownsOwnFirst: boolean;
  picks: DraftPickOwnership[];
}

/**
 * Resolve draft pick ownership for upcoming seasons.
 *
 * @param leagueId - Current league ID
 * @param rosters - All rosters in the league
 * @param seasons - List of future seasons to resolve (e.g., ["2026", "2027", "2028"])
 * @param maxRounds - Number of rounds per draft (default: 4 for dynasty rookie drafts)
 */
export async function resolveDraftPickOwnership(
  leagueId: string,
  rosters: SleeperRoster[],
  seasons: string[],
  maxRounds: number = 4
): Promise<DraftPickOwnership[]> {
  const tradedPicks = await getTradedPicks(leagueId);
  const rosterIds = rosters.map((r) => r.roster_id);

  const picks: DraftPickOwnership[] = [];

  for (const season of seasons) {
    for (const round of Array.from({ length: maxRounds }, (_, i) => i + 1)) {
      for (const originalRosterId of rosterIds) {
        // Find if this pick has been traded
        const trade = tradedPicks.find(
          (tp: SleeperTradedPick) =>
            tp.season === season &&
            tp.round === round &&
            tp.roster_id === originalRosterId
        );

        const currentOwner = trade ? trade.owner_id : originalRosterId;

        picks.push({
          season,
          round,
          originalTeamRosterId: originalRosterId,
          currentOwnerRosterId: currentOwner,
          status:
            currentOwner === originalRosterId
              ? "owns_own"
              : currentOwner === originalRosterId
                ? "owns_own"
                : "acquired", // We'll fix status per-context below
        });
      }
    }
  }

  // Correct the status from each team's perspective
  // A pick is "traded_away" from the original team's perspective
  // and "acquired" from the new owner's perspective
  for (const pick of picks) {
    if (pick.currentOwnerRosterId !== pick.originalTeamRosterId) {
      pick.status = "traded_away"; // From original team's perspective
    }
  }

  return picks;
}

/**
 * Get pick capital summary for each team.
 */
export function computePickCapital(
  picks: DraftPickOwnership[],
  rosterIds: number[]
): TeamPickCapital[] {
  return rosterIds.map((rosterId) => {
    const owned = picks.filter((p) => p.currentOwnerRosterId === rosterId);
    const tradedAway = picks.filter(
      (p) =>
        p.originalTeamRosterId === rosterId &&
        p.currentOwnerRosterId !== rosterId
    );
    const ownsOwnFirst = picks.some(
      (p) =>
        p.originalTeamRosterId === rosterId &&
        p.currentOwnerRosterId === rosterId &&
        p.round === 1
    );

    return {
      rosterId,
      totalOwned: owned.length,
      totalTradedAway: tradedAway.length,
      ownsOwnFirst,
      picks: owned,
    };
  });
}
