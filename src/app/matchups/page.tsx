"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, PageHeader } from "@/components/ui";

interface MatchupTeam {
  rosterId: number;
  teamName: string;
  displayName: string;
  avatar: string | null;
  points: number;
  matchupId: number;
}

interface WeekMatchup {
  team1: MatchupTeam;
  team2: MatchupTeam;
}

interface LeagueInfo {
  season: string;
  playoffWeekStart: number;
  totalWeeks: number;
  leagueId: string;
}

export default function MatchupsPage() {
  const [week, setWeek] = useState(1);
  const [matchups, setMatchups] = useState<WeekMatchup[]>([]);
  const [loading, setLoading] = useState(true);
  const [leagueInfo, setLeagueInfo] = useState<LeagueInfo | null>(null);

  // Fetch league info once
  useEffect(() => {
    async function fetchLeagueInfo() {
      try {
        const configRes = await fetch(
          "https://api.sleeper.app/v1/league/1313306806897881088"
        );
        const configLeague = await configRes.json();
        let leagueId = configLeague.league_id;
        if (
          configLeague.status === "pre_draft" &&
          configLeague.previous_league_id
        ) {
          leagueId = configLeague.previous_league_id;
        }

        const leagueRes = await fetch(
          `https://api.sleeper.app/v1/league/${leagueId}`
        );
        const league = await leagueRes.json();
        const playoffStart = league.settings?.playoff_week_start || 15;

        setLeagueInfo({
          season: league.season,
          playoffWeekStart: playoffStart,
          totalWeeks: playoffStart + 2,
          leagueId,
        });
      } catch (err) {
        console.error("Error fetching league info:", err);
      }
    }
    fetchLeagueInfo();
  }, []);

  // Fetch matchups for selected week
  useEffect(() => {
    if (!leagueInfo) return;

    async function fetchMatchups() {
      setLoading(true);
      try {
        const [usersRes, rostersRes, matchupsRes] = await Promise.all([
          fetch(
            `https://api.sleeper.app/v1/league/${leagueInfo!.leagueId}/users`
          ),
          fetch(
            `https://api.sleeper.app/v1/league/${leagueInfo!.leagueId}/rosters`
          ),
          fetch(
            `https://api.sleeper.app/v1/league/${leagueInfo!.leagueId}/matchups/${week}`
          ),
        ]);

        const [users, rosters, matchupsData] = await Promise.all([
          usersRes.json(),
          rostersRes.json(),
          matchupsRes.json(),
        ]);

        const userMap = new Map(
          users.map((u: { user_id: string }) => [u.user_id, u])
        );
        const rosterUserMap = new Map(
          rosters.map((r: { roster_id: number; owner_id: string }) => {
            const user = userMap.get(r.owner_id) as
              | {
                  display_name?: string;
                  username?: string;
                  avatar?: string;
                  metadata?: { team_name?: string };
                }
              | undefined;
            return [
              r.roster_id,
              {
                teamName:
                  user?.metadata?.team_name ||
                  user?.display_name ||
                  "Unknown",
                displayName:
                  user?.display_name || user?.username || "Unknown",
                avatar: user?.avatar || null,
              },
            ];
          })
        );

        const matchupGroups = new Map<number, MatchupTeam[]>();
        for (const m of matchupsData as {
          matchup_id: number;
          roster_id: number;
          points: number;
        }[]) {
          if (!m.matchup_id) continue;
          const user = rosterUserMap.get(m.roster_id) as
            | {
                teamName: string;
                displayName: string;
                avatar: string | null;
              }
            | undefined;
          const team: MatchupTeam = {
            rosterId: m.roster_id,
            teamName: user?.teamName || "Unknown",
            displayName: user?.displayName || "Unknown",
            avatar: user?.avatar || null,
            points: m.points || 0,
            matchupId: m.matchup_id,
          };
          const group = matchupGroups.get(m.matchup_id) || [];
          group.push(team);
          matchupGroups.set(m.matchup_id, group);
        }

        const pairedMatchups: WeekMatchup[] = [];
        for (const [, teams] of matchupGroups) {
          if (teams.length === 2) {
            pairedMatchups.push({ team1: teams[0], team2: teams[1] });
          }
        }

        setMatchups(pairedMatchups);
      } catch (err) {
        console.error("Error fetching matchups:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMatchups();
  }, [week, leagueInfo]);

  // Calculate median score for the week
  const medianScore = useMemo(() => {
    if (matchups.length === 0) return 0;
    const allScores = matchups
      .flatMap((m) => [m.team1.points, m.team2.points])
      .filter((p) => p > 0)
      .sort((a, b) => a - b);
    if (allScores.length === 0) return 0;
    const mid = Math.floor(allScores.length / 2);
    return allScores.length % 2 === 0
      ? (allScores[mid - 1] + allScores[mid]) / 2
      : allScores[mid];
  }, [matchups]);

  const isPlayoffWeek = leagueInfo && week >= leagueInfo.playoffWeekStart;
  const isRegularSeason = leagueInfo && week < leagueInfo.playoffWeekStart;

  return (
    <div>
      <PageHeader
        title="Matchups"
        subtitle={leagueInfo ? `${leagueInfo.season} Season` : "Loading..."}
      />

      {/* Week selector */}
      <div className="mb-6 flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
        {leagueInfo &&
          Array.from(
            { length: leagueInfo.totalWeeks },
            (_, i) => i + 1
          ).map((w) => {
            const isPlayoff = w >= leagueInfo.playoffWeekStart;
            const isFinal = w === leagueInfo.playoffWeekStart + 2;
            return (
              <button
                key={w}
                onClick={() => setWeek(w)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  w === week
                    ? "bg-navy text-white shadow-lg shadow-navy/20"
                    : isPlayoff
                      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
                      : "bg-white text-text-muted ring-1 ring-border hover:ring-steel hover:text-text-primary"
                }`}
              >
                {isFinal
                  ? "Final"
                  : isPlayoff
                    ? `PO ${w - leagueInfo.playoffWeekStart + 1}`
                    : `Wk ${w}`}
              </button>
            );
          })}
      </div>

      {/* Median score indicator (regular season only) */}
      {isRegularSeason && medianScore > 0 && (
        <div className="mb-6">
          <Card padding="sm" className="inline-flex items-center gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                League Median
              </p>
              <p className="tabular text-lg font-extrabold text-navy">
                {medianScore.toFixed(2)}
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <p className="max-w-[200px] text-[10px] leading-relaxed text-text-muted">
              Teams scoring above the median earn a bonus W; below earn a bonus L
            </p>
          </Card>
        </div>
      )}

      {isPlayoffWeek && (
        <div className="mb-6">
          <Card padding="sm" className="inline-flex items-center gap-2">
            <span className="text-sm">🏆</span>
            <p className="text-xs font-bold text-amber-700">
              Playoff Week{" "}
              {week - (leagueInfo?.playoffWeekStart || 15) + 1}
            </p>
            <span className="text-[10px] text-text-muted">
              — Single elimination
            </span>
          </Card>
        </div>
      )}

      {/* Matchup cards */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <div className="h-20 animate-pulse rounded-xl bg-surface" />
            </Card>
          ))}
        </div>
      ) : matchups.length === 0 ? (
        <Card>
          <p className="py-12 text-center text-sm text-text-muted">
            No matchup data available for Week {week}
          </p>
        </Card>
      ) : (
        <div className="stagger-children space-y-4">
          {matchups.map((m, i) => {
            const t1Won = m.team1.points > m.team2.points;
            const t2Won = m.team2.points > m.team1.points;
            const isTie = m.team1.points === m.team2.points;
            const margin = Math.abs(m.team1.points - m.team2.points);

            // Median matchup results (regular season only)
            const t1BeatMedian =
              isRegularSeason && m.team1.points > medianScore;
            const t2BeatMedian =
              isRegularSeason && m.team2.points > medianScore;

            return (
              <Card key={i} padding="none" className="overflow-hidden">
                <div className="flex items-center px-5 py-4">
                  {/* Team 1 */}
                  <div
                    className={`flex min-w-0 flex-1 flex-col items-start ${
                      t1Won ? "" : t2Won ? "opacity-40" : ""
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-text-primary">
                      {m.team1.teamName}
                    </p>
                    <p className="text-[10px] font-medium text-text-muted">
                      {m.team1.displayName}
                    </p>
                    {isRegularSeason && m.team1.points > 0 && (
                      <span
                        className={`mt-1 text-[9px] font-bold ${
                          t1BeatMedian ? "text-emerald-500" : "text-red-400"
                        }`}
                      >
                        {t1BeatMedian
                          ? "▲ Above Median"
                          : "▼ Below Median"}
                      </span>
                    )}
                  </div>

                  {/* Score block */}
                  <div className="flex items-center gap-3 px-4">
                    <span
                      className={`tabular min-w-[3.5rem] text-right text-xl font-extrabold ${
                        t1Won
                          ? "text-navy"
                          : isTie
                            ? "text-text-primary"
                            : "text-text-muted"
                      }`}
                    >
                      {m.team1.points.toFixed(2)}
                    </span>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase text-text-muted/50">
                        vs
                      </span>
                    </div>
                    <span
                      className={`tabular min-w-[3.5rem] text-left text-xl font-extrabold ${
                        t2Won
                          ? "text-navy"
                          : isTie
                            ? "text-text-primary"
                            : "text-text-muted"
                      }`}
                    >
                      {m.team2.points.toFixed(2)}
                    </span>
                  </div>

                  {/* Team 2 */}
                  <div
                    className={`flex min-w-0 flex-1 flex-col items-end ${
                      t2Won ? "" : t1Won ? "opacity-40" : ""
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-text-primary">
                      {m.team2.teamName}
                    </p>
                    <p className="text-[10px] font-medium text-text-muted">
                      {m.team2.displayName}
                    </p>
                    {isRegularSeason && m.team2.points > 0 && (
                      <span
                        className={`mt-1 text-[9px] font-bold ${
                          t2BeatMedian ? "text-emerald-500" : "text-red-400"
                        }`}
                      >
                        {t2BeatMedian
                          ? "▲ Above Median"
                          : "▼ Below Median"}
                      </span>
                    )}
                  </div>
                </div>
                {/* Margin bar */}
                {!isTie &&
                  (m.team1.points > 0 || m.team2.points > 0) && (
                    <div className="flex h-1 w-full">
                      <div
                        className={`transition-all ${
                          t1Won
                            ? "bg-gradient-to-r from-navy to-steel"
                            : "bg-transparent"
                        }`}
                        style={{
                          width: `${50 + (t1Won ? margin / 4 : -margin / 4)}%`,
                        }}
                      />
                      <div
                        className={`flex-1 transition-all ${
                          t2Won
                            ? "bg-gradient-to-l from-navy to-steel"
                            : "bg-transparent"
                        }`}
                      />
                    </div>
                  )}
                {/* Margin label */}
                {!isTie && margin > 0 && (
                  <div className="border-t border-border-light px-5 py-1.5 text-center text-[10px] font-medium text-text-muted">
                    {t1Won ? m.team1.teamName : m.team2.teamName} wins by{" "}
                    <span className="font-bold text-text-secondary">
                      {margin.toFixed(2)}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
