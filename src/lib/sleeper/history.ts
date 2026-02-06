import { getLeague, getUsers, getRosters } from "./league";
import type { LeagueSeasonData, SleeperLeague, SleeperUser, SleeperRoster } from "./types";

export async function getLeagueHistory(
  currentLeagueId: string
): Promise<LeagueSeasonData[]> {
  const seasons: LeagueSeasonData[] = [];
  let leagueId: string | null = currentLeagueId;

  while (leagueId) {
    const results: [SleeperLeague, SleeperUser[], SleeperRoster[]] =
      await Promise.all([
        getLeague(leagueId),
        getUsers(leagueId),
        getRosters(leagueId),
      ]);
    const [league, users, rosters] = results;

    seasons.push({ league, users, rosters });
    leagueId = league.previous_league_id;
  }

  return seasons;
}

export function getLeagueIdForSeason(
  history: LeagueSeasonData[],
  season: string
): string | null {
  const match = history.find((s) => s.league.season === season);
  return match?.league.league_id ?? null;
}
