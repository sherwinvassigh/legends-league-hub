import type { SleeperRoster, SleeperUser } from "@/lib/sleeper/types";

export interface StandingsEntry {
  rosterId: number;
  ownerId: string;
  displayName: string;
  teamName: string;
  avatar: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
  rank: number;
}

export function buildStandings(
  rosters: SleeperRoster[],
  users: SleeperUser[]
): StandingsEntry[] {
  const userMap = new Map(users.map((u) => [u.user_id, u]));

  const entries = rosters.map((roster) => {
    const user = userMap.get(roster.owner_id);
    const fpts =
      (roster.settings.fpts || 0) +
      (roster.settings.fpts_decimal || 0) / 100;
    const fptsAgainst =
      (roster.settings.fpts_against || 0) +
      (roster.settings.fpts_against_decimal || 0) / 100;

    return {
      rosterId: roster.roster_id,
      ownerId: roster.owner_id,
      displayName: user?.display_name || user?.username || "Unknown",
      teamName: user?.metadata?.team_name || user?.display_name || "Unknown",
      avatar: user?.avatar || null,
      wins: roster.settings.wins || 0,
      losses: roster.settings.losses || 0,
      ties: roster.settings.ties || 0,
      pointsFor: fpts,
      pointsAgainst: fptsAgainst,
      streak: roster.metadata?.streak || "",
      rank: 0,
    };
  });

  // Sort by wins desc, then PF desc as tiebreaker
  entries.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsFor - a.pointsFor;
  });

  // Assign rank
  entries.forEach((e, i) => {
    e.rank = i + 1;
  });

  return entries;
}

export function getSleeperAvatarUrl(avatarId: string | null): string {
  if (!avatarId) return "";
  return `https://sleepercdn.com/avatars/thumbs/${avatarId}`;
}
