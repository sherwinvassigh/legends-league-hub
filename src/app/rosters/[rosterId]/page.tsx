import Image from "next/image";
import Link from "next/link";
import { LEAGUE_CONFIG } from "@/lib/config";
import { getLeague, getRosters, getUsers } from "@/lib/sleeper";
import { getMatchups } from "@/lib/sleeper/matchups";
import { getPlayers, getPlayerName } from "@/lib/sleeper/players";
import { getSleeperAvatarUrl } from "@/lib/utils/standings";
import { Card, PageHeader, PositionBadge } from "@/components/ui";
import type { SleeperPlayer, SleeperMatchup } from "@/lib/sleeper/types";
import { notFound } from "next/navigation";

export const revalidate = 300;

async function getDataLeagueId(): Promise<string> {
  const league = await getLeague(LEAGUE_CONFIG.leagueId);
  if (league.status === "pre_draft" && league.previous_league_id) {
    return league.previous_league_id;
  }
  return league.league_id;
}

interface PageProps {
  params: Promise<{ rosterId: string }>;
}

function groupPlayersByPosition(
  playerIds: string[],
  players: Record<string, SleeperPlayer>
): Record<string, SleeperPlayer[]> {
  const groups: Record<string, SleeperPlayer[]> = { QB: [], RB: [], WR: [], TE: [], Other: [] };
  for (const id of playerIds) {
    const player = players[id];
    if (!player) continue;
    const pos = player.position;
    if (groups[pos]) groups[pos].push(player);
    else groups.Other.push(player);
  }
  return groups;
}

function PlayerRow({ player }: { player: SleeperPlayer }) {
  return (
    <div className="flex items-center gap-2 py-2 text-sm">
      <PositionBadge position={player.position} />
      <span className="min-w-0 flex-1 truncate font-medium text-text-primary">
        {player.first_name} {player.last_name}
      </span>
      <span className="text-xs text-text-muted">{player.team || "FA"}</span>
      {player.age && (
        <span className="w-8 text-right text-xs text-text-muted">{player.age}</span>
      )}
      {player.years_exp != null && (
        <span className="w-8 text-right text-[10px] text-text-muted">Yr {player.years_exp}</span>
      )}
    </div>
  );
}

// Compute advanced stats from weekly matchup data
interface AdvancedStats {
  weeklyScores: number[];
  avgPPG: number;
  maxScore: number;
  maxScoreWeek: number;
  minScore: number;
  minScoreWeek: number;
  stdDev: number;
  medianScore: number;
  allPlayWins: number;
  allPlayLosses: number;
  allPlayTies: number;
  allPlayPct: number;
  gamesAboveMedian: number;
  gamesBelowMedian: number;
  consistency: number; // lower std dev = more consistent, expressed as rating
}

function computeAdvancedStats(
  rosterId: number,
  allWeekMatchups: SleeperMatchup[][],
  totalTeams: number
): AdvancedStats {
  const weeklyScores: number[] = [];
  const allPlayWins: number[] = []; // per-week all-play wins

  for (const weekMatchups of allWeekMatchups) {
    const teamMatchup = weekMatchups.find((m) => m.roster_id === rosterId);
    if (!teamMatchup || teamMatchup.points === 0) continue;

    weeklyScores.push(teamMatchup.points);

    // All-play: compare against every other team's score this week
    const otherScores = weekMatchups
      .filter((m) => m.roster_id !== rosterId && m.points > 0)
      .map((m) => m.points);

    let wins = 0;
    let ties = 0;
    for (const score of otherScores) {
      if (teamMatchup.points > score) wins++;
      else if (teamMatchup.points === score) ties++;
    }
    allPlayWins.push(wins);
  }

  if (weeklyScores.length === 0) {
    return {
      weeklyScores: [],
      avgPPG: 0, maxScore: 0, maxScoreWeek: 0, minScore: 0, minScoreWeek: 0,
      stdDev: 0, medianScore: 0, allPlayWins: 0, allPlayLosses: 0, allPlayTies: 0,
      allPlayPct: 0, gamesAboveMedian: 0, gamesBelowMedian: 0, consistency: 0,
    };
  }

  const total = weeklyScores.reduce((a, b) => a + b, 0);
  const avg = total / weeklyScores.length;
  const maxScore = Math.max(...weeklyScores);
  const maxScoreWeek = weeklyScores.indexOf(maxScore) + 1;
  const minScore = Math.min(...weeklyScores);
  const minScoreWeek = weeklyScores.indexOf(minScore) + 1;

  // Standard deviation
  const variance = weeklyScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / weeklyScores.length;
  const stdDev = Math.sqrt(variance);

  // Median
  const sorted = [...weeklyScores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianScore = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  // All-play totals
  const totalOpponents = (totalTeams - 1);
  const totalAllPlayGames = weeklyScores.length * totalOpponents;
  const totalAllPlayWins = allPlayWins.reduce((a, b) => a + b, 0);
  const totalAllPlayLosses = totalAllPlayGames - totalAllPlayWins;

  // League median per week — count games above/below
  let aboveMedian = 0;
  let belowMedian = 0;
  for (let i = 0; i < allWeekMatchups.length; i++) {
    const weekScores = allWeekMatchups[i]
      .filter((m) => m.points > 0)
      .map((m) => m.points)
      .sort((a, b) => a - b);
    if (weekScores.length === 0) continue;
    const wMid = Math.floor(weekScores.length / 2);
    const wMedian = weekScores.length % 2 === 0
      ? (weekScores[wMid - 1] + weekScores[wMid]) / 2
      : weekScores[wMid];
    const teamScore = allWeekMatchups[i].find((m) => m.roster_id === rosterId)?.points;
    if (teamScore != null && teamScore > 0) {
      if (teamScore > wMedian) aboveMedian++;
      else belowMedian++;
    }
  }

  // Consistency rating: 100 = perfectly consistent, lower = more variable
  // Based on coefficient of variation (lower CV = more consistent)
  const cv = avg > 0 ? (stdDev / avg) * 100 : 0;
  const consistency = Math.max(0, Math.min(100, 100 - cv * 5));

  return {
    weeklyScores,
    avgPPG: avg,
    maxScore,
    maxScoreWeek,
    minScore,
    minScoreWeek,
    stdDev,
    medianScore,
    allPlayWins: totalAllPlayWins,
    allPlayLosses: totalAllPlayLosses,
    allPlayTies: 0,
    allPlayPct: totalAllPlayGames > 0 ? totalAllPlayWins / totalAllPlayGames : 0,
    gamesAboveMedian: aboveMedian,
    gamesBelowMedian: belowMedian,
    consistency,
  };
}

export default async function RosterDetailPage({ params }: PageProps) {
  const { rosterId: rosterIdStr } = await params;
  const rosterId = parseInt(rosterIdStr, 10);
  if (isNaN(rosterId)) notFound();

  const dataLeagueId = await getDataLeagueId();
  const [league, users, rosters, players] = await Promise.all([
    getLeague(dataLeagueId),
    getUsers(dataLeagueId),
    getRosters(dataLeagueId),
    getPlayers(),
  ]);

  const roster = rosters.find((r) => r.roster_id === rosterId);
  if (!roster) notFound();

  const user = users.find((u) => u.user_id === roster.owner_id);
  const teamName = user?.metadata?.team_name || user?.display_name || "Unknown";
  const displayName = user?.display_name || user?.username || "Unknown";

  // Fetch all weekly matchups for advanced stats
  const playoffStart = league.settings.playoff_week_start || 15;
  const regularSeasonWeeks = playoffStart - 1;
  const allWeekMatchups: SleeperMatchup[][] = [];
  try {
    const weekPromises = Array.from({ length: regularSeasonWeeks }, (_, i) =>
      getMatchups(dataLeagueId, i + 1)
    );
    const results = await Promise.all(weekPromises);
    allWeekMatchups.push(...results);
  } catch {
    // silent — advanced stats will just be empty
  }

  const advStats = computeAdvancedStats(rosterId, allWeekMatchups, league.total_rosters);

  const starterIds = roster.starters || [];
  const benchIds = (roster.players || []).filter(
    (id) =>
      !starterIds.includes(id) &&
      !(roster.taxi || []).includes(id) &&
      !(roster.reserve || []).includes(id)
  );
  const taxiIds = roster.taxi || [];
  const reserveIds = roster.reserve || [];

  const rosterPositions = league.roster_positions.filter((p) => p !== "BN");

  const fpts = (roster.settings.fpts || 0) + (roster.settings.fpts_decimal || 0) / 100;
  const fptsAgainst = (roster.settings.fpts_against || 0) + (roster.settings.fpts_against_decimal || 0) / 100;

  // Max PF (potential points)
  const ppts = (roster.settings.ppts || 0) + (roster.settings.ppts_decimal || 0) / 100;

  // FAAB
  const faabBudget = league.settings.waiver_budget || 0;
  const faabUsed = (roster.settings as Record<string, unknown>)?.waiver_budget_used;
  const faabRemaining = typeof faabUsed === "number" ? faabBudget - faabUsed : faabBudget;

  const benchGroups = groupPlayersByPosition(benchIds, players);

  return (
    <div>
      <PageHeader title={teamName} subtitle={displayName}>
        <Link href="/rosters" className="text-sm font-medium text-steel hover:text-steel-light">
          All Rosters
        </Link>
      </PageHeader>

      {/* Manager info + record */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {user?.avatar ? (
              <Image
                src={getSleeperAvatarUrl(user.avatar)}
                alt={displayName}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-surface" />
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-text-primary">{teamName}</p>
              <p className="text-sm text-text-secondary">{displayName}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-text-primary">
                {roster.settings.wins}-{roster.settings.losses}
              </p>
              <p className="text-[10px] text-text-muted">Record</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{fpts.toFixed(1)}</p>
              <p className="text-[10px] text-text-muted">PF</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{fptsAgainst.toFixed(1)}</p>
              <p className="text-[10px] text-text-muted">PA</p>
            </div>
            <div>
              <p className="tabular text-lg font-bold text-text-primary">${faabRemaining}</p>
              <p className="text-[10px] text-text-muted">FAAB</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Advanced Stats */}
      {advStats.weeklyScores.length > 0 && (
        <Card className="mb-6" padding="none">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-text-primary">Advanced Stats</h2>
            <p className="text-[10px] text-text-muted">Regular season ({advStats.weeklyScores.length} weeks)</p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border-light sm:grid-cols-4">
            {/* Avg PPG */}
            <div className="bg-white p-4 text-center">
              <p className="tabular text-xl font-extrabold text-navy">{advStats.avgPPG.toFixed(1)}</p>
              <p className="text-[10px] font-medium text-text-muted">Avg PPG</p>
            </div>
            {/* Max Score */}
            <div className="bg-white p-4 text-center">
              <p className="tabular text-xl font-extrabold text-emerald-600">{advStats.maxScore.toFixed(1)}</p>
              <p className="text-[10px] font-medium text-text-muted">Best Week (Wk {advStats.maxScoreWeek})</p>
            </div>
            {/* Min Score */}
            <div className="bg-white p-4 text-center">
              <p className="tabular text-xl font-extrabold text-red-400">{advStats.minScore.toFixed(1)}</p>
              <p className="text-[10px] font-medium text-text-muted">Worst Week (Wk {advStats.minScoreWeek})</p>
            </div>
            {/* Std Dev */}
            <div className="bg-white p-4 text-center">
              <p className="tabular text-xl font-extrabold text-text-primary">{advStats.stdDev.toFixed(1)}</p>
              <p className="text-[10px] font-medium text-text-muted">Std Dev</p>
            </div>
            {/* All-Play Record */}
            <div className="bg-white p-4 text-center">
              <p className="tabular text-xl font-extrabold text-navy">
                {advStats.allPlayWins}-{advStats.allPlayLosses}
              </p>
              <p className="text-[10px] font-medium text-text-muted">All-Play Record</p>
            </div>
            {/* All-Play Win % */}
            <div className="bg-white p-4 text-center">
              <p className="tabular text-xl font-extrabold text-text-primary">
                {(advStats.allPlayPct * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] font-medium text-text-muted">All-Play Win %</p>
            </div>
            {/* Median Record */}
            <div className="bg-white p-4 text-center">
              <p className="tabular text-xl font-extrabold text-text-primary">
                {advStats.gamesAboveMedian}-{advStats.gamesBelowMedian}
              </p>
              <p className="text-[10px] font-medium text-text-muted">vs Median</p>
            </div>
            {/* Max PF (Potential) */}
            <div className="bg-white p-4 text-center">
              <p className="tabular text-xl font-extrabold text-text-primary">
                {ppts > 0 ? ppts.toFixed(1) : "—"}
              </p>
              <p className="text-[10px] font-medium text-text-muted">Max PF (Potential)</p>
            </div>
          </div>

          {/* Sparkline-style weekly scores */}
          <div className="border-t border-border-light px-4 py-3 sm:px-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Weekly Scoring
            </p>
            <div className="flex items-end gap-1" style={{ height: "48px" }}>
              {advStats.weeklyScores.map((score, i) => {
                const maxH = advStats.maxScore || 1;
                const pct = (score / maxH) * 100;
                const isMax = score === advStats.maxScore;
                const isMin = score === advStats.minScore;
                return (
                  <div
                    key={i}
                    className="group relative flex-1"
                    title={`Wk ${i + 1}: ${score.toFixed(1)}`}
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all ${
                        isMax
                          ? "bg-emerald-400"
                          : isMin
                            ? "bg-red-300"
                            : "bg-navy/20 group-hover:bg-navy/40"
                      }`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-text-muted">
              <span>Wk 1</span>
              <span>Wk {advStats.weeklyScores.length}</span>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Starters */}
        <Card padding="none">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-text-primary">Starters ({starterIds.length})</h2>
          </div>
          <div className="divide-y divide-border-light px-4 sm:px-5">
            {starterIds.map((id, i) => {
              const player = players[id];
              const slotLabel = rosterPositions[i] || "BN";
              return (
                <div key={`${id}-${i}`} className="flex items-center gap-2 py-2.5 text-sm">
                  <span className="w-12 text-[10px] font-medium uppercase text-text-muted">
                    {slotLabel === "SUPER_FLEX" ? "SFLEX" : slotLabel}
                  </span>
                  {player ? (
                    <>
                      <PositionBadge position={player.position} />
                      <span className="min-w-0 flex-1 truncate font-medium text-text-primary">
                        {player.first_name} {player.last_name}
                      </span>
                      <span className="text-xs text-text-muted">{player.team || "FA"}</span>
                      {player.age && (
                        <span className="w-8 text-right text-xs text-text-muted">{player.age}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-text-muted">
                      {id === "0" ? "Empty" : getPlayerName(players, id)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Bench */}
        <Card padding="none">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-text-primary">Bench ({benchIds.length})</h2>
          </div>
          <div className="px-4 sm:px-5">
            {Object.entries(benchGroups)
              .filter(([, group]) => group.length > 0)
              .map(([pos, group]) => (
                <div key={pos} className="py-1">
                  {group.map((player) => (
                    <PlayerRow key={player.player_id} player={player} />
                  ))}
                </div>
              ))}
          </div>
        </Card>

        {/* Taxi Squad */}
        {taxiIds.length > 0 && (
          <Card padding="none">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-text-primary">Taxi Squad ({taxiIds.length})</h2>
            </div>
            <div className="divide-y divide-border-light px-4 sm:px-5">
              {taxiIds.map((id) => {
                const player = players[id];
                return player ? (
                  <PlayerRow key={id} player={player} />
                ) : (
                  <div key={id} className="py-2 text-xs text-text-muted">{getPlayerName(players, id)}</div>
                );
              })}
            </div>
          </Card>
        )}

        {/* IR */}
        {reserveIds.length > 0 && (
          <Card padding="none">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-text-primary">Injured Reserve ({reserveIds.length})</h2>
            </div>
            <div className="divide-y divide-border-light px-4 sm:px-5">
              {reserveIds.map((id) => {
                const player = players[id];
                return player ? (
                  <PlayerRow key={id} player={player} />
                ) : (
                  <div key={id} className="py-2 text-xs text-text-muted">{getPlayerName(players, id)}</div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
