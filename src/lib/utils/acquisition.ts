/**
 * Player Acquisition Tracker
 *
 * Determines how each player was acquired by their current team:
 * drafted, traded, waiver claim, free agent pickup, or commissioner action.
 */

import { getLeagueDrafts, getDraftPicks } from "@/lib/sleeper/drafts";
import { getAllTransactions } from "@/lib/sleeper/transactions";
import type { SleeperTransaction, SleeperDraftPick } from "@/lib/sleeper/types";

export interface AcquisitionInfo {
  source: "drafted" | "traded" | "waiver" | "free_agent" | "commissioner" | "unknown";
  /** Human-readable details: "Rd 1.03 (2023 Startup)", "from sherstar", "$15 FAAB" */
  details?: string;
  /** Timestamp of the acquisition */
  date?: number;
}

/**
 * Build a map of player_id → AcquisitionInfo for every player on a given roster.
 *
 * Algorithm:
 * 1. Fetch all drafts + picks → build drafted-by map
 * 2. Fetch all transactions → for each player on the roster, find the most recent
 *    transaction that added them to this roster
 * 3. If no transaction found, check if they were drafted by this roster
 */
export async function buildAcquisitionMap(
  leagueId: string,
  rosterId: number,
  playerIds: string[],
  rosterIdToName?: Map<number, string>
): Promise<Map<string, AcquisitionInfo>> {
  const result = new Map<string, AcquisitionInfo>();

  // 1. Fetch draft data
  const draftedMap = new Map<
    string,
    { rosterId: number; round: number; pick: number; draftType: string; season: string }
  >();

  try {
    const drafts = await getLeagueDrafts(leagueId);
    for (const draft of drafts) {
      const picks = await getDraftPicks(draft.draft_id);
      const draftType = draft.settings.rounds > 10 ? "Startup" : "Rookie";
      for (const pick of picks) {
        draftedMap.set(pick.player_id, {
          rosterId: pick.roster_id,
          round: pick.round,
          pick: pick.pick_no,
          draftType,
          season: draft.season,
        });
      }
    }
  } catch {
    // Draft data unavailable — continue with transactions only
  }

  // 2. Fetch all transactions
  let transactions: SleeperTransaction[] = [];
  try {
    transactions = await getAllTransactions(leagueId);
    // Sort oldest → newest so we can track the most recent add
    transactions.sort((a, b) => a.status_updated - b.status_updated);
  } catch {
    // Transactions unavailable
  }

  // 3. For each player, find their acquisition source
  for (const playerId of playerIds) {
    // Check transactions (newest last, so last match = most recent)
    let found = false;
    for (let i = transactions.length - 1; i >= 0; i--) {
      const tx = transactions[i];
      if (!tx.adds || tx.adds[playerId] !== rosterId) continue;

      switch (tx.type) {
        case "trade": {
          // Find who they came from
          const fromRosterId = tx.drops
            ? Object.entries(tx.drops).find(([pid]) => pid === playerId)?.[1]
            : null;
          const fromName =
            fromRosterId != null && rosterIdToName
              ? rosterIdToName.get(fromRosterId)
              : null;
          result.set(playerId, {
            source: "traded",
            details: fromName ? `from ${fromName}` : "via trade",
            date: tx.status_updated,
          });
          found = true;
          break;
        }
        case "waiver": {
          const bid = tx.settings?.waiver_bid;
          result.set(playerId, {
            source: "waiver",
            details: bid != null ? `$${bid} FAAB` : "Waiver claim",
            date: tx.status_updated,
          });
          found = true;
          break;
        }
        case "free_agent": {
          result.set(playerId, {
            source: "free_agent",
            details: "Free agent",
            date: tx.status_updated,
          });
          found = true;
          break;
        }
        case "commissioner": {
          result.set(playerId, {
            source: "commissioner",
            details: "Commissioner",
            date: tx.status_updated,
          });
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (found) continue;

    // Check if player was drafted by this roster
    const draftInfo = draftedMap.get(playerId);
    if (draftInfo && draftInfo.rosterId === rosterId) {
      const pickStr = `${draftInfo.round}.${String(draftInfo.pick % 10 || 10).padStart(2, "0")}`;
      result.set(playerId, {
        source: "drafted",
        details: `Rd ${pickStr} (${draftInfo.season} ${draftInfo.draftType})`,
      });
      continue;
    }

    // Unknown acquisition (could be from a previous season's carry-over)
    result.set(playerId, { source: "unknown" });
  }

  return result;
}
