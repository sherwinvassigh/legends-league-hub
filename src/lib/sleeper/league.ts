import { sleeperFetch } from "./api";
import type {
  SleeperLeague,
  SleeperUser,
  SleeperRoster,
  SleeperState,
  SleeperTradedPick,
  SleeperBracketMatchup,
} from "./types";

export async function getNflState(): Promise<SleeperState> {
  return sleeperFetch<SleeperState>("/state/nfl", 3600);
}

export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  return sleeperFetch<SleeperLeague>(`/league/${leagueId}`, 3600);
}

export async function getUsers(leagueId: string): Promise<SleeperUser[]> {
  return sleeperFetch<SleeperUser[]>(`/league/${leagueId}/users`, 300);
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  return sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`, 300);
}

export async function getTradedPicks(
  leagueId: string
): Promise<SleeperTradedPick[]> {
  return sleeperFetch<SleeperTradedPick[]>(
    `/league/${leagueId}/traded_picks`,
    300
  );
}

export async function getWinnersBracket(
  leagueId: string
): Promise<SleeperBracketMatchup[]> {
  return sleeperFetch<SleeperBracketMatchup[]>(
    `/league/${leagueId}/winners_bracket`,
    3600
  );
}

export async function getLosersBracket(
  leagueId: string
): Promise<SleeperBracketMatchup[]> {
  return sleeperFetch<SleeperBracketMatchup[]>(
    `/league/${leagueId}/losers_bracket`,
    3600
  );
}
