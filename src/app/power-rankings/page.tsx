import Image from "next/image";
import { LEAGUE_CONFIG } from "@/lib/config";
import {
  getLeague,
  getRosters,
  getUsers,
  getMatchups,
} from "@/lib/sleeper";
import { getSleeperAvatarUrl } from "@/lib/utils/standings";
import { computeLeaguePowerRankings } from "@/lib/utils/power-rankings";
import { Card, PageHeader, Badge } from "@/components/ui";

export const revalidate = 300;

async function getDataLeagueId(): Promise<string> {
  const league = await getLeague(LEAGUE_CONFIG.leagueId);
  if (league.status === "pre_draft" && league.previous_league_id) {
    return league.previous_league_id;
  }
  return league.league_id;
}

export default async function PowerRankingsPage() {
  const dataLeagueId = await getDataLeagueId();
  const [league, users, rosters] = await Promise.all([
    getLeague(dataLeagueId),
    getUsers(dataLeagueId),
    getRosters(dataLeagueId),
  ]);

  // Fetch all matchups for the regular season
  const regularSeasonLength = league.settings.playoff_week_start - 1;
  const weeklyMatchups = await Promise.all(
    Array.from({ length: regularSeasonLength }, (_, i) =>
      getMatchups(dataLeagueId, i + 1)
    )
  );

  const totalTeams = rosters.length;
  const rankings = computeLeaguePowerRankings(
    rosters,
    users,
    weeklyMatchups,
    totalTeams
  );

  // Find league insights
  const luckiest = [...rankings].sort((a, b) => b.metrics.luckIndex - a.metrics.luckIndex)[0];
  const unluckiest = [...rankings].sort((a, b) => a.metrics.luckIndex - b.metrics.luckIndex)[0];
  const mostConsistent = [...rankings].sort((a, b) => b.metrics.consistency.rating - a.metrics.consistency.rating)[0];
  const mostVolatile = [...rankings].sort((a, b) => a.metrics.consistency.rating - b.metrics.consistency.rating)[0];
  const hardestSchedule = [...rankings].sort((a, b) => b.metrics.sos.rank - a.metrics.sos.rank)[0];
  const easiestSchedule = [...rankings].sort((a, b) => a.metrics.sos.rank - b.metrics.sos.rank)[0];

  function getTierColor(tier: string): string {
    if (tier === "contender") return "bg-amber-50 border-amber-200";
    if (tier === "bubble") return "bg-blue-50 border-blue-200";
    return "bg-gray-50 border-gray-200";
  }

  function getTierBadgeColor(tier: string): string {
    if (tier === "contender") return "bg-amber-100 text-amber-800";
    if (tier === "bubble") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-700";
  }

  function getRankBadgeColor(rank: number): string {
    if (rank === 1) return "bg-yellow-400 text-yellow-900";
    if (rank === 2) return "bg-gray-300 text-gray-900";
    if (rank === 3) return "bg-amber-600 text-white";
    return "bg-surface text-text-secondary";
  }

  return (
    <div>
      <PageHeader
        title="Power Rankings"
        subtitle={`${league.season} Season • Composite Analytics`}
      />

      {/* ─── League Insights ─── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="animate-in fade-in" style={{ animationDelay: "0ms" }}>
          <Card>
            <div className="flex items-start gap-3">
              <div className="text-2xl">🍀</div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Luckiest Team
                </div>
                <div className="truncate text-sm font-bold text-navy">
                  {luckiest.teamName || luckiest.displayName}
                </div>
                <div className="text-xs text-text-muted">
                  +{luckiest.metrics.luckIndex.toFixed(1)} luck index
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="animate-in fade-in" style={{ animationDelay: "50ms" }}>
          <Card>
            <div className="flex items-start gap-3">
              <div className="text-2xl">😢</div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Unluckiest Team
                </div>
                <div className="truncate text-sm font-bold text-navy">
                  {unluckiest.teamName || unluckiest.displayName}
                </div>
                <div className="text-xs text-text-muted">
                  {unluckiest.metrics.luckIndex.toFixed(1)} luck index
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="animate-in fade-in" style={{ animationDelay: "100ms" }}>
          <Card>
            <div className="flex items-start gap-3">
              <div className="text-2xl">📊</div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Most Consistent
                </div>
                <div className="truncate text-sm font-bold text-navy">
                  {mostConsistent.teamName || mostConsistent.displayName}
                </div>
                <div className="text-xs text-text-muted">
                  {mostConsistent.metrics.consistency.rating.toFixed(0)}/100 rating
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="animate-in fade-in" style={{ animationDelay: "150ms" }}>
          <Card>
            <div className="flex items-start gap-3">
              <div className="text-2xl">🎲</div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Most Volatile
                </div>
                <div className="truncate text-sm font-bold text-navy">
                  {mostVolatile.teamName || mostVolatile.displayName}
                </div>
                <div className="text-xs text-text-muted">
                  {mostVolatile.metrics.consistency.stdDev.toFixed(1)} std dev
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="animate-in fade-in" style={{ animationDelay: "200ms" }}>
          <Card>
            <div className="flex items-start gap-3">
              <div className="text-2xl">💪</div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Hardest Schedule
                </div>
                <div className="truncate text-sm font-bold text-navy">
                  {hardestSchedule.teamName || hardestSchedule.displayName}
                </div>
                <div className="text-xs text-text-muted">
                  {hardestSchedule.metrics.sos.avgOpponentPPG.toFixed(1)} avg opp PPG
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="animate-in fade-in" style={{ animationDelay: "250ms" }}>
          <Card>
            <div className="flex items-start gap-3">
              <div className="text-2xl">🎯</div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Easiest Schedule
                </div>
                <div className="truncate text-sm font-bold text-navy">
                  {easiestSchedule.teamName || easiestSchedule.displayName}
                </div>
                <div className="text-xs text-text-muted">
                  {easiestSchedule.metrics.sos.avgOpponentPPG.toFixed(1)} avg opp PPG
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Power Rankings List ─── */}
      <div className="stagger-children space-y-3">
        {rankings.map((team, idx) => (
          <div
            key={team.rosterId}
            className="animate-in fade-in"
            style={{ animationDelay: `${idx * 50 + 300}ms` }}
          >
            <Card className={`border-2 ${getTierColor(team.tier)}`}>
            <div className="flex items-center gap-4">
              {/* Rank Badge */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-extrabold ${getRankBadgeColor(team.rank)}`}
              >
                {team.rank}
              </div>

              {/* Avatar */}
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface">
                {team.avatar ? (
                  <Image
                    src={getSleeperAvatarUrl(team.avatar)}
                    alt={team.teamName || team.displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-text-muted">
                    {(team.teamName || team.displayName).charAt(0)}
                  </div>
                )}
              </div>

              {/* Team Info */}
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 truncate text-base font-extrabold text-navy">
                  {team.teamName || team.displayName}
                </div>
                <div className="truncate text-xs text-text-muted">
                  {team.displayName} • {team.record.wins}-{team.record.losses}
                  {team.record.ties > 0 && `-${team.record.ties}`}
                </div>
              </div>

              {/* Power Score & Tier */}
              <div className="shrink-0 text-right">
                <div className="mb-1 text-2xl font-extrabold text-navy">
                  {team.powerScore.toFixed(1)}
                </div>
                <Badge className={`${getTierBadgeColor(team.tier)} text-[10px]`}>
                  {team.tier.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* PowerScore Breakdown Bar */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <div>PowerScore Breakdown</div>
                <div className="text-text-secondary">6 Components</div>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-surface">
                {/* Component widths based on weightings */}
                <div
                  className="bg-blue-500"
                  style={{ width: "30%" }}
                  title={`Avg PF: ${team.metrics.avgPF.toFixed(1)} (30%)`}
                />
                <div
                  className="bg-green-500"
                  style={{ width: "20%" }}
                  title={`xWin%: ${(team.metrics.xWinPct * 100).toFixed(1)}% (20%)`}
                />
                <div
                  className="bg-purple-500"
                  style={{ width: "15%" }}
                  title={`Recent Form: ${team.metrics.recentForm.avg.toFixed(1)} (15%)`}
                />
                <div
                  className="bg-amber-500"
                  style={{ width: "15%" }}
                  title={`Efficiency: ${(team.metrics.efficiency * 100).toFixed(1)}% (15%)`}
                />
                <div
                  className="bg-pink-500"
                  style={{ width: "10%" }}
                  title={`Consistency: ${team.metrics.consistency.rating.toFixed(0)}/100 (10%)`}
                />
                <div
                  className="bg-red-500"
                  style={{ width: "10%" }}
                  title={`SOS: Rank ${team.metrics.sos.rank} (10%)`}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-text-muted">
                <div>
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />{" "}
                  Avg PF (30%)
                </div>
                <div>
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />{" "}
                  xWin% (20%)
                </div>
                <div>
                  <span className="inline-block h-2 w-2 rounded-full bg-purple-500" />{" "}
                  Form (15%)
                </div>
                <div>
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />{" "}
                  Efficiency (15%)
                </div>
                <div>
                  <span className="inline-block h-2 w-2 rounded-full bg-pink-500" />{" "}
                  Consistency (10%)
                </div>
                <div>
                  <span className="inline-block h-2 w-2 rounded-full bg-red-500" />{" "}
                  SOS (10%)
                </div>
              </div>
            </div>

            {/* Detailed Metrics Grid */}
            <div className="mt-4 grid gap-3 border-t border-border-light pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Avg PPG
                </div>
                <div className="text-lg font-extrabold text-navy">
                  {team.metrics.avgPF.toFixed(1)}
                </div>
              </div>

              <div>
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  xWin%
                </div>
                <div className="text-lg font-extrabold text-navy">
                  {(team.metrics.xWinPct * 100).toFixed(1)}%
                </div>
              </div>

              <div>
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Luck Index
                </div>
                <div
                  className={`text-lg font-extrabold ${
                    team.metrics.luckIndex > 0
                      ? "text-green-600"
                      : team.metrics.luckIndex < 0
                      ? "text-red-600"
                      : "text-navy"
                  }`}
                >
                  {team.metrics.luckIndex > 0 ? "+" : ""}
                  {team.metrics.luckIndex.toFixed(1)}
                </div>
              </div>

              <div>
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Efficiency
                </div>
                <div className="text-lg font-extrabold text-navy">
                  {(team.metrics.efficiency * 100).toFixed(1)}%
                </div>
              </div>

              <div>
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  All-Play
                </div>
                <div className="text-lg font-extrabold text-navy">
                  {team.allPlayRecord.wins}-{team.allPlayRecord.losses}
                  {team.allPlayRecord.ties > 0 && `-${team.allPlayRecord.ties}`}
                </div>
              </div>

              <div>
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  SOS Rank
                </div>
                <div className="text-lg font-extrabold text-navy">
                  #{team.metrics.sos.rank}
                </div>
              </div>

              <div>
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Consistency
                </div>
                <div className="text-lg font-extrabold text-navy">
                  {team.metrics.consistency.rating.toFixed(0)}/100
                </div>
              </div>

              <div>
                <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Recent Form
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-extrabold text-navy">
                    {team.metrics.recentForm.avg.toFixed(1)}
                  </div>
                  {team.metrics.recentForm.trend === "up" && (
                    <span className="text-green-600">↗</span>
                  )}
                  {team.metrics.recentForm.trend === "down" && (
                    <span className="text-red-600">↘</span>
                  )}
                  {team.metrics.recentForm.trend === "flat" && (
                    <span className="text-gray-400">→</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
