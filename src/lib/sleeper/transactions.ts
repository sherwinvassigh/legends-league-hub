import { sleeperFetch } from "./api";
import type { SleeperTransaction } from "./types";

export async function getTransactions(
  leagueId: string,
  week: number
): Promise<SleeperTransaction[]> {
  return sleeperFetch<SleeperTransaction[]>(
    `/league/${leagueId}/transactions/${week}`,
    300
  );
}

export async function getAllTransactions(
  leagueId: string,
  totalWeeks: number = 18
): Promise<SleeperTransaction[]> {
  const promises = Array.from({ length: totalWeeks }, (_, i) =>
    getTransactions(leagueId, i + 1).catch(() => [] as SleeperTransaction[])
  );
  const results = await Promise.all(promises);
  return results
    .flat()
    .sort((a, b) => b.status_updated - a.status_updated);
}
