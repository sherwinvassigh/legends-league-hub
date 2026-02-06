import { sleeperFetch } from "./api";
import type { SleeperDraft, SleeperDraftPick } from "./types";

export async function getLeagueDrafts(
  leagueId: string
): Promise<SleeperDraft[]> {
  return sleeperFetch<SleeperDraft[]>(`/league/${leagueId}/drafts`, 3600);
}

export async function getDraftPicks(
  draftId: string
): Promise<SleeperDraftPick[]> {
  return sleeperFetch<SleeperDraftPick[]>(`/draft/${draftId}/picks`, 3600);
}
