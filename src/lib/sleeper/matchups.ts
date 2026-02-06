import { sleeperFetch } from "./api";
import type { SleeperMatchup } from "./types";

export async function getMatchups(
  leagueId: string,
  week: number
): Promise<SleeperMatchup[]> {
  return sleeperFetch<SleeperMatchup[]>(
    `/league/${leagueId}/matchups/${week}`,
    300
  );
}
