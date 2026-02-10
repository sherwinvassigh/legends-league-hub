/**
 * Historical Records Calculator
 *
 * Computes all-time standings, league records, H2H records,
 * season awards, and champion history across all seasons.
 */

import type {
  LeagueSeasonData,
  SleeperMatchup,
  SleeperBracketMatchup,
} from "@/lib/sleeper/types";
import { getChampionRosterId, getRunnerUpRosterId } from "./brackets";

// ── Types ─────────────────────────────────────────────────────────────

export interface AllTimeStanding {
  /** User ID (deduplicated across seasons) */
  managerId: string;
  displayName: string;
  avatar: string | null;
  seasonsPlayed: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  totalPointsFor: number;
  totalPointsAgainst: number;
  championships: number;
  playoffAppearances: number;
  bestFinish: number;
  seasonResults: {
    season: string;
    wins: number;
    losses: number;
    pf: number;
    pa: number;
    finish: number;
  }[];
}

export interface LeagueRecord {
  label: string;
  value: string;
  team: string;
  week?: number;
  season: string;
  numericValue: number;
}

export interface H2HRecord {
  manager1: {
    name: string;
    userId: string;
    wins: number;
    totalPoints: number;
    avgScore: number;
  };
  manager2: {
    name: string;
    userId: string;
    wins: number;
    totalPoints: number;
    avgScore: number;
  };
  ties: number;
  totalGames: number;
  matchups: {
    season: string;
    week: number;
    score1: number;
    score2: number;
    winner: string;
  }[];
}

export interface SeasonAward {
  category: string;
  team: string;
  value: string;
  week?: number;
  icon: string;
}

export interface ChampionEntry {
  season: string;
  leagueId: string;
  champion: { name: string; avatar: string | null; record: string; rosterId: number };
  runnerUp: { name: string; avatar: string | null; rosterId: number } | null;
}

interface MatchupPair {
  season: string;
  week: number;
  team1RosterId: number;
  team1Score: number;
  team1OwnerId: string;
  team1Name: string;
  team2RosterId: number;
  team2Score: number;
  team2OwnerId: string;
  team2Name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

function getTeamName(seasonData: LeagueSeasonData, rosterId: number): string {
  const roster = seasonData.rosters.find((r) => r.roster_id === rosterId);
  if (!roster) return `Team ${rosterId}`;
  const user = seasonData.users.find((u) => u.user_id === roster.owner_id);
  return user?.metadata?.team_name || user?.display_name || `Team ${rosterId}`;
}

function getOwnerId(seasonData: LeagueSeasonData, rosterId: number): string {
  const roster = seasonData.rosters.find((r) => r.roster_id === rosterId);
  return roster?.owner_id || "";
}

/**
 * Convert weekly matchup arrays into paired matchup records.
 */
function pairMatchups(
  weekMatchups: SleeperMatchup[],
  seasonData: LeagueSeasonData,
  season: string,
  week: number
): MatchupPair[] {
  const pairs: MatchupPair[] = [];
  const seen = new Set<number>();

  for (const m of weekMatchups) {
    if (seen.has(m.matchup_id)) continue;

    const opponent = weekMatchups.find(
      (o) => o.matchup_id === m.matchup_id && o.roster_id !== m.roster_id
    );
    if (!opponent) continue;

    seen.add(m.matchup_id);

    pairs.push({
      season,
      week,
      team1RosterId: m.roster_id,
      team1Score: m.points,
      team1OwnerId: getOwnerId(seasonData, m.roster_id),
      team1Name: getTeamName(seasonData, m.roster_id),
      team2RosterId: opponent.roster_id,
      team2Score: opponent.points,
      team2OwnerId: getOwnerId(seasonData, opponent.roster_id),
      team2Name: getTeamName(seasonData, opponent.roster_id),
    });
  }

  return pairs;
}

// ── All-Time Standings ────────────────────────────────────────────────

export function computeAllTimeStandings(
  history: LeagueSeasonData[],
  championMap: Map<string, number> // season → champion roster_id
): AllTimeStanding[] {
  const managerMap = new Map<string, AllTimeStanding>();

  for (const seasonData of history) {
    const season = seasonData.league.season;
    const playoffTeams = seasonData.league.settings.playoff_teams || 6;

    // Sort rosters by wins desc, then PF desc to determine finish
    const sorted = [...seasonData.rosters].sort((a, b) => {
      const wDiff = b.settings.wins - a.settings.wins;
      if (wDiff !== 0) return wDiff;
      return (b.settings.fpts || 0) - (a.settings.fpts || 0);
    });

    for (let i = 0; i < sorted.length; i++) {
      const roster = sorted[i];
      const user = seasonData.users.find(
        (u) => u.user_id === roster.owner_id
      );
      if (!user) continue;

      const managerId = user.user_id;
      const finish = i + 1;
      const madePlayoffs = finish <= playoffTeams;
      const isChampion = championMap.get(season) === roster.roster_id;

      const fpts =
        (roster.settings.fpts || 0) +
        (roster.settings.fpts_decimal || 0) / 100;
      const pa =
        (roster.settings.fpts_against || 0) +
        (roster.settings.fpts_against_decimal || 0) / 100;

      if (!managerMap.has(managerId)) {
        managerMap.set(managerId, {
          managerId,
          displayName: user.display_name || user.username,
          avatar: user.avatar,
          seasonsPlayed: 0,
          totalWins: 0,
          totalLosses: 0,
          totalTies: 0,
          totalPointsFor: 0,
          totalPointsAgainst: 0,
          championships: 0,
          playoffAppearances: 0,
          bestFinish: 999,
          seasonResults: [],
        });
      }

      const entry = managerMap.get(managerId)!;
      entry.seasonsPlayed++;
      entry.totalWins += roster.settings.wins;
      entry.totalLosses += roster.settings.losses;
      entry.totalTies += roster.settings.ties;
      entry.totalPointsFor += fpts;
      entry.totalPointsAgainst += pa;
      if (isChampion) entry.championships++;
      if (madePlayoffs) entry.playoffAppearances++;
      if (finish < entry.bestFinish) entry.bestFinish = finish;
      // Update display name and avatar to the most recent
      entry.displayName = user.display_name || user.username;
      entry.avatar = user.avatar;

      entry.seasonResults.push({
        season,
        wins: roster.settings.wins,
        losses: roster.settings.losses,
        pf: fpts,
        pa,
        finish,
      });
    }
  }

  return Array.from(managerMap.values()).sort(
    (a, b) => b.totalWins - a.totalWins || b.totalPointsFor - a.totalPointsFor
  );
}

// ── League Records ────────────────────────────────────────────────────

export function computeLeagueRecords(
  allMatchupPairs: MatchupPair[],
  allWeeklyScores: { season: string; week: number; rosterId: number; score: number; teamName: string }[]
): LeagueRecord[] {
  const records: LeagueRecord[] = [];

  // Highest single-week score
  if (allWeeklyScores.length > 0) {
    const highest = allWeeklyScores.reduce((best, s) =>
      s.score > best.score ? s : best
    );
    records.push({
      label: "Highest Weekly Score",
      value: highest.score.toFixed(2),
      team: highest.teamName,
      week: highest.week,
      season: highest.season,
      numericValue: highest.score,
    });

    // Lowest single-week score (excluding 0)
    const nonZero = allWeeklyScores.filter((s) => s.score > 0);
    if (nonZero.length > 0) {
      const lowest = nonZero.reduce((worst, s) =>
        s.score < worst.score ? s : worst
      );
      records.push({
        label: "Lowest Weekly Score",
        value: lowest.score.toFixed(2),
        team: lowest.teamName,
        week: lowest.week,
        season: lowest.season,
        numericValue: lowest.score,
      });
    }
  }

  // Biggest blowout and closest game
  if (allMatchupPairs.length > 0) {
    const withMargins = allMatchupPairs
      .filter((p) => p.team1Score > 0 && p.team2Score > 0)
      .map((p) => ({
        ...p,
        margin: Math.abs(p.team1Score - p.team2Score),
        winner:
          p.team1Score > p.team2Score ? p.team1Name : p.team2Name,
        loser:
          p.team1Score > p.team2Score ? p.team2Name : p.team1Name,
      }));

    if (withMargins.length > 0) {
      const biggest = withMargins.reduce((best, m) =>
        m.margin > best.margin ? m : best
      );
      records.push({
        label: "Biggest Blowout",
        value: `${biggest.margin.toFixed(2)} pts`,
        team: `${biggest.winner} over ${biggest.loser}`,
        week: biggest.week,
        season: biggest.season,
        numericValue: biggest.margin,
      });

      const closest = withMargins
        .filter((m) => m.margin > 0)
        .reduce((best, m) => (m.margin < best.margin ? m : best));
      records.push({
        label: "Closest Game",
        value: `${closest.margin.toFixed(2)} pts`,
        team: `${closest.winner} over ${closest.loser}`,
        week: closest.week,
        season: closest.season,
        numericValue: closest.margin,
      });
    }
  }

  // Longest win/lose streaks
  // Group scores by team across seasons
  const teamWeekly = new Map<
    string,
    { season: string; week: number; won: boolean }[]
  >();

  for (const pair of allMatchupPairs) {
    if (pair.team1Score === 0 && pair.team2Score === 0) continue;

    for (const side of [
      {
        id: pair.team1OwnerId,
        name: pair.team1Name,
        won: pair.team1Score > pair.team2Score,
      },
      {
        id: pair.team2OwnerId,
        name: pair.team2Name,
        won: pair.team2Score > pair.team1Score,
      },
    ]) {
      const key = side.id || side.name;
      if (!teamWeekly.has(key)) teamWeekly.set(key, []);
      teamWeekly
        .get(key)!
        .push({ season: pair.season, week: pair.week, won: side.won });
    }
  }

  let longestWin = { count: 0, team: "", season: "" };
  let longestLose = { count: 0, team: "", season: "" };

  for (const [, results] of teamWeekly) {
    // Sort by season then week
    results.sort(
      (a, b) => a.season.localeCompare(b.season) || a.week - b.week
    );

    let winStreak = 0;
    let loseStreak = 0;
    let bestWin = 0;
    let bestLose = 0;

    for (const r of results) {
      if (r.won) {
        winStreak++;
        loseStreak = 0;
      } else {
        loseStreak++;
        winStreak = 0;
      }
      if (winStreak > bestWin) bestWin = winStreak;
      if (loseStreak > bestLose) bestLose = loseStreak;
    }

    // We need the team name — grab from the first result
    const teamName = (() => {
      for (const pair of allMatchupPairs) {
        if (pair.team1OwnerId === results[0]?.season) return pair.team1Name;
        if (pair.team2OwnerId === results[0]?.season) return pair.team2Name;
      }
      return "Unknown";
    })();

    // Actually get from allMatchupPairs more carefully
    const findName = () => {
      const key = [...teamWeekly.entries()].find(
        ([, v]) => v === results
      )?.[0];
      for (const pair of allMatchupPairs) {
        if (pair.team1OwnerId === key) return pair.team1Name;
        if (pair.team2OwnerId === key) return pair.team2Name;
      }
      return key || "Unknown";
    };

    if (bestWin > longestWin.count) {
      longestWin = { count: bestWin, team: findName(), season: "All-Time" };
    }
    if (bestLose > longestLose.count) {
      longestLose = { count: bestLose, team: findName(), season: "All-Time" };
    }
  }

  if (longestWin.count > 0) {
    records.push({
      label: "Longest Win Streak",
      value: `${longestWin.count} games`,
      team: longestWin.team,
      season: longestWin.season,
      numericValue: longestWin.count,
    });
  }

  if (longestLose.count > 0) {
    records.push({
      label: "Longest Losing Streak",
      value: `${longestLose.count} games`,
      team: longestLose.team,
      season: longestLose.season,
      numericValue: longestLose.count,
    });
  }

  return records;
}

// ── Head-to-Head ──────────────────────────────────────────────────────

export function computeHeadToHead(
  manager1Id: string,
  manager1Name: string,
  manager2Id: string,
  manager2Name: string,
  allMatchupPairs: MatchupPair[]
): H2HRecord {
  const matchups: H2HRecord["matchups"] = [];
  let m1Wins = 0;
  let m2Wins = 0;
  let ties = 0;
  let m1Points = 0;
  let m2Points = 0;

  for (const pair of allMatchupPairs) {
    const is1v2 =
      pair.team1OwnerId === manager1Id && pair.team2OwnerId === manager2Id;
    const is2v1 =
      pair.team1OwnerId === manager2Id && pair.team2OwnerId === manager1Id;

    if (!is1v2 && !is2v1) continue;

    const m1Score = is1v2 ? pair.team1Score : pair.team2Score;
    const m2Score = is1v2 ? pair.team2Score : pair.team1Score;

    m1Points += m1Score;
    m2Points += m2Score;

    if (m1Score > m2Score) m1Wins++;
    else if (m2Score > m1Score) m2Wins++;
    else ties++;

    matchups.push({
      season: pair.season,
      week: pair.week,
      score1: m1Score,
      score2: m2Score,
      winner:
        m1Score > m2Score
          ? manager1Name
          : m2Score > m1Score
            ? manager2Name
            : "Tie",
    });
  }

  const totalGames = m1Wins + m2Wins + ties;

  return {
    manager1: {
      name: manager1Name,
      userId: manager1Id,
      wins: m1Wins,
      totalPoints: m1Points,
      avgScore: totalGames > 0 ? m1Points / totalGames : 0,
    },
    manager2: {
      name: manager2Name,
      userId: manager2Id,
      wins: m2Wins,
      totalPoints: m2Points,
      avgScore: totalGames > 0 ? m2Points / totalGames : 0,
    },
    ties,
    totalGames,
    matchups,
  };
}

// ── Season Awards ─────────────────────────────────────────────────────

export function computeSeasonAwards(
  seasonData: LeagueSeasonData,
  weeklyScores: { week: number; rosterId: number; score: number }[],
  matchupPairs: MatchupPair[]
): SeasonAward[] {
  const awards: SeasonAward[] = [];

  // Best/Worst Offense (season PPG)
  const rosterPPG = seasonData.rosters.map((r) => {
    const fpts =
      (r.settings.fpts || 0) + (r.settings.fpts_decimal || 0) / 100;
    const games = r.settings.wins + r.settings.losses + r.settings.ties;
    return {
      rosterId: r.roster_id,
      name: getTeamName(seasonData, r.roster_id),
      ppg: games > 0 ? fpts / games : 0,
    };
  });

  rosterPPG.sort((a, b) => b.ppg - a.ppg);

  if (rosterPPG.length > 0) {
    awards.push({
      category: "Best Offense",
      team: rosterPPG[0].name,
      value: `${rosterPPG[0].ppg.toFixed(1)} PPG`,
      icon: "trophy",
    });
    awards.push({
      category: "Worst Offense",
      team: rosterPPG[rosterPPG.length - 1].name,
      value: `${rosterPPG[rosterPPG.length - 1].ppg.toFixed(1)} PPG`,
      icon: "down",
    });
  }

  // Highest single-week score
  if (weeklyScores.length > 0) {
    const highest = weeklyScores.reduce((best, s) =>
      s.score > best.score ? s : best
    );
    awards.push({
      category: "Point Collector",
      team: getTeamName(seasonData, highest.rosterId),
      value: `${highest.score.toFixed(2)} pts`,
      week: highest.week,
      icon: "fire",
    });
  }

  // Closest game and biggest blowout
  const validPairs = matchupPairs.filter(
    (p) => p.team1Score > 0 && p.team2Score > 0
  );
  if (validPairs.length > 0) {
    const withMargins = validPairs.map((p) => ({
      ...p,
      margin: Math.abs(p.team1Score - p.team2Score),
      winner:
        p.team1Score > p.team2Score ? p.team1Name : p.team2Name,
    }));

    const closest = withMargins
      .filter((m) => m.margin > 0)
      .reduce((best, m) => (m.margin < best.margin ? m : best));
    awards.push({
      category: "Close Call",
      team: closest.winner,
      value: `Won by ${closest.margin.toFixed(2)}`,
      week: closest.week,
      icon: "target",
    });

    const biggest = withMargins.reduce((best, m) =>
      m.margin > best.margin ? m : best
    );
    awards.push({
      category: "Biggest Blowout",
      team: biggest.winner,
      value: `Won by ${biggest.margin.toFixed(2)}`,
      week: biggest.week,
      icon: "explosion",
    });
  }

  return awards;
}

// ── Champion History ──────────────────────────────────────────────────

export function computeChampionHistory(
  history: LeagueSeasonData[],
  brackets: Map<string, SleeperBracketMatchup[]> // season → winners_bracket
): ChampionEntry[] {
  const entries: ChampionEntry[] = [];

  for (const seasonData of history) {
    if (seasonData.league.status !== "complete") continue;

    const season = seasonData.league.season;
    const bracket = brackets.get(season);
    if (!bracket) continue;

    const champRosterId = getChampionRosterId(bracket);
    const runnerUpRosterId = getRunnerUpRosterId(bracket);

    if (champRosterId == null) continue;

    const champRoster = seasonData.rosters.find(
      (r) => r.roster_id === champRosterId
    );
    const champUser = champRoster
      ? seasonData.users.find((u) => u.user_id === champRoster.owner_id)
      : null;

    let runnerUp: ChampionEntry["runnerUp"] = null;
    if (runnerUpRosterId != null) {
      const ruRoster = seasonData.rosters.find(
        (r) => r.roster_id === runnerUpRosterId
      );
      const ruUser = ruRoster
        ? seasonData.users.find((u) => u.user_id === ruRoster.owner_id)
        : null;
      runnerUp = {
        name:
          ruUser?.metadata?.team_name ||
          ruUser?.display_name ||
          `Team ${runnerUpRosterId}`,
        avatar: ruUser?.avatar || null,
        rosterId: runnerUpRosterId,
      };
    }

    entries.push({
      season,
      leagueId: seasonData.league.league_id,
      champion: {
        name:
          champUser?.metadata?.team_name ||
          champUser?.display_name ||
          `Team ${champRosterId}`,
        avatar: champUser?.avatar || null,
        record: champRoster
          ? `${champRoster.settings.wins}-${champRoster.settings.losses}`
          : "",
        rosterId: champRosterId,
      },
      runnerUp,
    });
  }

  // Sort by season ascending
  entries.sort((a, b) => a.season.localeCompare(b.season));
  return entries;
}

// ── Export utility to build matchup pairs from raw data ──

export { pairMatchups };
