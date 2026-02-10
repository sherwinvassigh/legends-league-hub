/**
 * Power Rankings & Analytics Engine
 *
 * Central calculation engine for advanced stats used across:
 * - Power Rankings page
 * - Roster detail page (enhanced advanced stats)
 * - Records page (historical comparisons)
 */

import type { SleeperMatchup, SleeperRoster, SleeperUser } from "@/lib/sleeper/types";
import { getSleeperAvatarUrl } from "./standings";

// ── Types ─────────────────────────────────────────────────────────────

export interface AllPlayRecord {
  wins: number;
  losses: number;
  ties: number;
  pct: number;
}

export interface StrengthOfSchedule {
  /** Average opponent PPG */
  avgOpponentPPG: number;
  /** Rank among all teams (1 = hardest schedule) */
  rank: number;
}

export interface ConsistencyMetrics {
  stdDev: number;
  /** Coefficient of variation (lower = more consistent) */
  cv: number;
  /** 0-100 rating (higher = more consistent) */
  rating: number;
}

export interface RecentForm {
  /** Weighted average of last N weeks */
  avg: number;
  trend: "up" | "down" | "flat";
}

export interface PowerMetrics {
  avgPF: number;
  xWinPct: number;
  luckIndex: number;
  actualWinPct: number;
  sos: StrengthOfSchedule;
  efficiency: number;
  consistency: ConsistencyMetrics;
  recentForm: RecentForm;
}

export interface PowerRanking {
  rosterId: number;
  teamName: string;
  displayName: string;
  avatar: string | null;
  rank: number;
  previousRank?: number;
  powerScore: number;
  tier: "contender" | "bubble" | "rebuilding";
  metrics: PowerMetrics;
  record: { wins: number; losses: number; ties: number };
  allPlayRecord: AllPlayRecord;
  weeklyScores: number[];
  medianRecord: { above: number; below: number };
}

export interface WeeklyMatchupData {
  week: number;
  matchups: SleeperMatchup[];
}

// ── Core Calculation Functions ────────────────────────────────────────

/**
 * Extract weekly scores for a specific roster from matchup data.
 * Skips weeks where the team scored 0 (bye/no data).
 */
export function extractWeeklyScores(
  rosterId: number,
  weeklyMatchups: SleeperMatchup[][]
): number[] {
  const scores: number[] = [];
  for (const weekMatchups of weeklyMatchups) {
    const team = weekMatchups.find((m) => m.roster_id === rosterId);
    if (team && team.points > 0) scores.push(team.points);
  }
  return scores;
}

/**
 * Compute all-play record: compare each week's score against every other team.
 */
export function computeAllPlayRecord(
  rosterId: number,
  weeklyMatchups: SleeperMatchup[][],
  totalTeams: number
): AllPlayRecord {
  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (const weekMatchups of weeklyMatchups) {
    const team = weekMatchups.find((m) => m.roster_id === rosterId);
    if (!team || team.points === 0) continue;

    const others = weekMatchups.filter(
      (m) => m.roster_id !== rosterId && m.points > 0
    );
    for (const opp of others) {
      if (team.points > opp.points) wins++;
      else if (team.points < opp.points) losses++;
      else ties++;
    }
  }

  const total = wins + losses + ties;
  return {
    wins,
    losses,
    ties,
    pct: total > 0 ? wins / total : 0,
  };
}

/**
 * Expected win percentage based on all-play record.
 */
export function computeXWinPct(allPlay: AllPlayRecord): number {
  return allPlay.pct;
}

/**
 * Luck index: actual win% minus expected win%.
 * Positive = lucky (winning more than expected), negative = unlucky.
 */
export function computeLuckIndex(
  actualWinPct: number,
  xWinPct: number
): number {
  return actualWinPct - xWinPct;
}

/**
 * Strength of schedule: average PPG of opponents faced.
 * Higher value = harder schedule.
 */
export function computeStrengthOfSchedule(
  rosterId: number,
  weeklyMatchups: SleeperMatchup[][],
  allRosterIds: number[]
): number {
  const opponentScores: number[] = [];

  for (const weekMatchups of weeklyMatchups) {
    const team = weekMatchups.find((m) => m.roster_id === rosterId);
    if (!team || team.points === 0) continue;

    // Find opponent (same matchup_id, different roster_id)
    const opponent = weekMatchups.find(
      (m) => m.matchup_id === team.matchup_id && m.roster_id !== rosterId
    );
    if (opponent && opponent.points > 0) {
      opponentScores.push(opponent.points);
    }
  }

  return opponentScores.length > 0
    ? opponentScores.reduce((a, b) => a + b, 0) / opponentScores.length
    : 0;
}

/**
 * Compute SOS with league-relative ranking for all teams.
 */
export function computeAllSOS(
  weeklyMatchups: SleeperMatchup[][],
  rosterIds: number[]
): Map<number, StrengthOfSchedule> {
  const sosValues: { rosterId: number; avgOppPPG: number }[] = [];

  for (const rid of rosterIds) {
    const avg = computeStrengthOfSchedule(rid, weeklyMatchups, rosterIds);
    sosValues.push({ rosterId: rid, avgOppPPG: avg });
  }

  // Rank: highest avg opponent PPG = hardest schedule = rank 1
  sosValues.sort((a, b) => b.avgOppPPG - a.avgOppPPG);

  const result = new Map<number, StrengthOfSchedule>();
  sosValues.forEach((v, i) => {
    result.set(v.rosterId, { avgOpponentPPG: v.avgOppPPG, rank: i + 1 });
  });

  return result;
}

/**
 * Efficiency: actual points scored / potential points.
 * Potential points (ppts) come from roster settings.
 */
export function computeEfficiency(fpts: number, ppts: number): number {
  if (ppts === 0) return 0;
  return fpts / ppts;
}

/**
 * Consistency metrics: std dev, coefficient of variation, and a 0-100 rating.
 */
export function computeConsistency(weeklyScores: number[]): ConsistencyMetrics {
  if (weeklyScores.length === 0) return { stdDev: 0, cv: 0, rating: 100 };

  const avg =
    weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length;
  const variance =
    weeklyScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) /
    weeklyScores.length;
  const stdDev = Math.sqrt(variance);
  const cv = avg > 0 ? (stdDev / avg) * 100 : 0;
  // Rating: 100 = perfectly consistent, lower = more variable
  const rating = Math.max(0, Math.min(100, 100 - cv * 5));

  return { stdDev, cv, rating };
}

/**
 * Recent form: weighted average of last N weeks (most recent weighted highest).
 * Weights: [0.5, 0.3, 0.2] for last 3 weeks.
 */
export function computeRecentForm(
  weeklyScores: number[],
  seasonAvg: number,
  windowSize: number = 3
): RecentForm {
  if (weeklyScores.length === 0) return { avg: 0, trend: "flat" };

  const recent = weeklyScores.slice(-windowSize);
  const weights = [0.5, 0.3, 0.2].slice(0, recent.length);
  // Normalize weights to sum to 1
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let weightedAvg = 0;
  for (let i = 0; i < recent.length; i++) {
    // recent[recent.length - 1] is most recent, gets highest weight
    weightedAvg += recent[recent.length - 1 - i] * (weights[i] / totalWeight);
  }

  const diff = weightedAvg - seasonAvg;
  const threshold = seasonAvg * 0.03; // 3% threshold
  const trend: "up" | "down" | "flat" =
    diff > threshold ? "up" : diff < -threshold ? "down" : "flat";

  return { avg: weightedAvg, trend };
}

/**
 * Median record: how many weeks the team scored above/below the league median.
 */
export function computeMedianRecord(
  rosterId: number,
  weeklyMatchups: SleeperMatchup[][]
): { above: number; below: number } {
  let above = 0;
  let below = 0;

  for (const weekMatchups of weeklyMatchups) {
    const activeScores = weekMatchups
      .filter((m) => m.points > 0)
      .map((m) => m.points)
      .sort((a, b) => a - b);

    if (activeScores.length === 0) continue;

    const mid = Math.floor(activeScores.length / 2);
    const median =
      activeScores.length % 2 === 0
        ? (activeScores[mid - 1] + activeScores[mid]) / 2
        : activeScores[mid];

    const team = weekMatchups.find((m) => m.roster_id === rosterId);
    if (team && team.points > 0) {
      if (team.points > median) above++;
      else below++;
    }
  }

  return { above, below };
}

// ── Composite Power Score ─────────────────────────────────────────────

/**
 * Normalize a value to 0-100 scale relative to league min/max.
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

/**
 * Compute composite PowerScore for a team.
 * Weights: 30% avg PF + 20% xWin% + 15% recent form + 15% efficiency + 10% consistency + 10% SOS
 */
export function computePowerScore(
  metrics: PowerMetrics,
  leagueMetrics: {
    avgPFRange: [number, number];
    xWinPctRange: [number, number];
    recentFormRange: [number, number];
    efficiencyRange: [number, number];
    consistencyRange: [number, number];
    sosRange: [number, number]; // lower avgOppPPG = easier, so inverse for scoring
  }
): number {
  const normPF = normalize(
    metrics.avgPF,
    leagueMetrics.avgPFRange[0],
    leagueMetrics.avgPFRange[1]
  );
  const normXWin = normalize(
    metrics.xWinPct,
    leagueMetrics.xWinPctRange[0],
    leagueMetrics.xWinPctRange[1]
  );
  const normRecent = normalize(
    metrics.recentForm.avg,
    leagueMetrics.recentFormRange[0],
    leagueMetrics.recentFormRange[1]
  );
  const normEff = normalize(
    metrics.efficiency,
    leagueMetrics.efficiencyRange[0],
    leagueMetrics.efficiencyRange[1]
  );
  const normConsistency = normalize(
    metrics.consistency.rating,
    leagueMetrics.consistencyRange[0],
    leagueMetrics.consistencyRange[1]
  );
  // For SOS, harder schedule (higher avgOppPPG) = slight bonus
  const normSOS = normalize(
    metrics.sos.avgOpponentPPG,
    leagueMetrics.sosRange[0],
    leagueMetrics.sosRange[1]
  );

  return (
    normPF * 0.3 +
    normXWin * 0.2 +
    normRecent * 0.15 +
    normEff * 0.15 +
    normConsistency * 0.1 +
    normSOS * 0.1
  );
}

// ── Main Orchestrator ─────────────────────────────────────────────────

/**
 * Compute full power rankings for an entire league.
 */
export function computeLeaguePowerRankings(
  rosters: SleeperRoster[],
  users: SleeperUser[],
  weeklyMatchups: SleeperMatchup[][],
  totalTeams: number
): PowerRanking[] {
  const rosterIds = rosters.map((r) => r.roster_id);

  // Pre-compute SOS for all teams
  const sosMap = computeAllSOS(weeklyMatchups, rosterIds);

  // Compute per-team metrics
  const teamData: {
    roster: SleeperRoster;
    user: SleeperUser | undefined;
    scores: number[];
    allPlay: AllPlayRecord;
    medianRec: { above: number; below: number };
    sos: StrengthOfSchedule;
    efficiency: number;
    consistency: ConsistencyMetrics;
    avgPF: number;
    actualWinPct: number;
  }[] = [];

  for (const roster of rosters) {
    const user = users.find((u) => u.user_id === roster.owner_id);
    const scores = extractWeeklyScores(roster.roster_id, weeklyMatchups);
    const allPlay = computeAllPlayRecord(
      roster.roster_id,
      weeklyMatchups,
      totalTeams
    );
    const medianRec = computeMedianRecord(roster.roster_id, weeklyMatchups);

    const fpts =
      (roster.settings.fpts || 0) +
      (roster.settings.fpts_decimal || 0) / 100;
    const ppts =
      (roster.settings.ppts || 0) +
      ((roster.settings.ppts_decimal as number) || 0) / 100;
    const efficiency = computeEfficiency(fpts, ppts);
    const consistency = computeConsistency(scores);
    const avgPF = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const totalGames = roster.settings.wins + roster.settings.losses + roster.settings.ties;
    const actualWinPct = totalGames > 0 ? roster.settings.wins / totalGames : 0;

    teamData.push({
      roster,
      user,
      scores,
      allPlay,
      medianRec,
      sos: sosMap.get(roster.roster_id) || { avgOpponentPPG: 0, rank: 10 },
      efficiency,
      consistency,
      avgPF,
      actualWinPct,
    });
  }

  // Compute league-wide ranges for normalization
  const avgPFs = teamData.map((t) => t.avgPF);
  const xWinPcts = teamData.map((t) => t.allPlay.pct);
  const efficiencies = teamData.map((t) => t.efficiency);
  const consistencies = teamData.map((t) => t.consistency.rating);
  const sosValues = teamData.map((t) => t.sos.avgOpponentPPG);

  // Compute recent form for all teams
  const recentForms = teamData.map((t) =>
    computeRecentForm(t.scores, t.avgPF)
  );
  const recentFormValues = recentForms.map((r) => r.avg);

  const leagueMetrics = {
    avgPFRange: [Math.min(...avgPFs), Math.max(...avgPFs)] as [number, number],
    xWinPctRange: [Math.min(...xWinPcts), Math.max(...xWinPcts)] as [
      number,
      number,
    ],
    recentFormRange: [
      Math.min(...recentFormValues),
      Math.max(...recentFormValues),
    ] as [number, number],
    efficiencyRange: [Math.min(...efficiencies), Math.max(...efficiencies)] as [
      number,
      number,
    ],
    consistencyRange: [
      Math.min(...consistencies),
      Math.max(...consistencies),
    ] as [number, number],
    sosRange: [Math.min(...sosValues), Math.max(...sosValues)] as [
      number,
      number,
    ],
  };

  // Build rankings
  const rankings: PowerRanking[] = teamData.map((t, i) => {
    const xWinPct = computeXWinPct(t.allPlay);
    const luckIndex = computeLuckIndex(t.actualWinPct, xWinPct);
    const recentForm = recentForms[i];

    const metrics: PowerMetrics = {
      avgPF: t.avgPF,
      xWinPct,
      luckIndex,
      actualWinPct: t.actualWinPct,
      sos: t.sos,
      efficiency: t.efficiency,
      consistency: t.consistency,
      recentForm,
    };

    const powerScore = computePowerScore(metrics, leagueMetrics);

    return {
      rosterId: t.roster.roster_id,
      teamName:
        t.user?.metadata?.team_name ||
        t.user?.display_name ||
        `Team ${t.roster.roster_id}`,
      displayName: t.user?.display_name || t.user?.username || "Unknown",
      avatar: t.user?.avatar || null,
      rank: 0, // assigned after sorting
      powerScore,
      tier: "bubble" as const, // assigned after sorting
      metrics,
      record: {
        wins: t.roster.settings.wins,
        losses: t.roster.settings.losses,
        ties: t.roster.settings.ties,
      },
      allPlayRecord: t.allPlay,
      weeklyScores: t.scores,
      medianRecord: t.medianRec,
    };
  });

  // Sort by power score descending, assign ranks and tiers
  rankings.sort((a, b) => b.powerScore - a.powerScore);
  rankings.forEach((r, i) => {
    r.rank = i + 1;
    if (i < 3) r.tier = "contender";
    else if (i < 7) r.tier = "bubble";
    else r.tier = "rebuilding";
  });

  return rankings;
}
