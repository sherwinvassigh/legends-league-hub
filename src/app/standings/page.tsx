import Image from "next/image";
import Link from "next/link";
import { LEAGUE_CONFIG } from "@/lib/config";
import {
  getLeague,
  getRosters,
  getUsers,
} from "@/lib/sleeper";
import { buildStandings, getSleeperAvatarUrl } from "@/lib/utils/standings";
import { Card, PageHeader } from "@/components/ui";
import { HiArrowRight } from "react-icons/hi2";

export const revalidate = 300;

async function getDataLeagueId(): Promise<string> {
  const league = await getLeague(LEAGUE_CONFIG.leagueId);
  if (league.status === "pre_draft" && league.previous_league_id) {
    return league.previous_league_id;
  }
  return league.league_id;
}

export default async function StandingsPage() {
  const dataLeagueId = await getDataLeagueId();
  const [league, users, rosters] =
    await Promise.all([
      getLeague(dataLeagueId),
      getUsers(dataLeagueId),
      getRosters(dataLeagueId),
    ]);

  const standings = buildStandings(rosters, users);
  const playoffTeams = league.settings.playoff_teams || 6;
  const maxPF = Math.max(...standings.map((s) => s.pointsFor));
  const isComplete = league.status === "complete";

  function getPlacementSuffix(n: number): string {
    if (n === 1) return "st";
    if (n === 2) return "nd";
    if (n === 3) return "rd";
    return "th";
  }

  return (
    <div>
      <PageHeader title="Standings" subtitle={`${league.season} Season`} />

      {/* ─── Link to Playoffs ─── */}
      {isComplete && (
        <Link href="/playoffs">
          <Card className="mb-6 cursor-pointer border-2 border-transparent hover:border-steel" hover>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy">
                  View Playoff Bracket
                </h3>
                <p className="mt-0.5 text-xs text-text-muted">
                  See the full {league.season} postseason tournament
                </p>
              </div>
              <HiArrowRight className="h-5 w-5 text-steel" />
            </div>
          </Card>
        </Link>
      )}

      {/* ─── Regular Season Standings ─── */}
      <div className="mb-6">
        <h2 className="text-xl font-extrabold tracking-tight text-text-primary">
          Regular Season Standings
        </h2>
        <div className="mt-3 h-px bg-gradient-to-r from-border via-border to-transparent" />
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-xs font-medium text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-navy" />
          Bye (1-2)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-steel/40" />
          Playoffs (3-{playoffTeams})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-border" />
          Eliminated
        </span>
        {isComplete && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
            Champion
          </span>
        )}
      </div>

      <div className="stagger-children space-y-3">
        {standings.map((entry) => {
          const pfPercent = maxPF > 0 ? (entry.pointsFor / maxPF) * 100 : 0;
          const isPlayoff = entry.rank <= playoffTeams;
          const isBye = entry.rank <= 2;

          // Determine the left accent border color
          let accentClass = "";
          if (isBye) {
            accentClass = "border-l-4 border-l-navy";
          } else if (isPlayoff) {
            accentClass = "border-l-4 border-l-steel/40";
          } else {
            accentClass = "border-l-4 border-l-border";
          }

          return (
            <Link key={entry.rosterId} href={`/rosters/${entry.rosterId}`}>
              <Card
                hover
                padding="none"
                className={`overflow-hidden ${accentClass} ${
                  !isPlayoff && !isComplete ? "opacity-50 hover:opacity-80" : ""
                }`}
              >
                <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
                  {/* Rank */}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      entry.rank === 1
                        ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-200"
                          : entry.rank === 2
                            ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                            : entry.rank === 3
                              ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                              : isBye
                                ? "bg-navy text-white"
                                : isPlayoff
                                  ? "bg-steel/10 text-steel"
                                  : "bg-surface text-text-muted"
                    }`}
                  >
                    {entry.rank}
                  </span>

                  {/* Avatar */}
                  {entry.avatar ? (
                    <Image
                      src={getSleeperAvatarUrl(entry.avatar)}
                      alt={entry.displayName}
                      width={40}
                      height={40}
                      className="rounded-full ring-2 ring-white"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-full bg-surface ring-2 ring-white" />
                  )}

                  {/* Team info + PF bar */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-text-primary">
                            {entry.teamName}
                          </p>
                        </div>
                        <p className="text-xs text-text-muted">
                          {entry.displayName}
                        </p>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="tabular text-base font-extrabold text-text-primary">
                          {entry.wins}-{entry.losses}
                          {entry.ties > 0 && `-${entry.ties}`}
                        </p>
                        {entry.streak && (
                          <span
                            className={`text-[10px] font-bold ${
                              entry.streak.includes("W")
                                ? "text-emerald-500"
                                : "text-red-400"
                            }`}
                          >
                            {entry.streak}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* PF/PA bar */}
                    <div className="mt-2 hidden items-center gap-3 sm:flex">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-navy/50 to-steel/50 transition-all"
                          style={{ width: `${pfPercent}%` }}
                        />
                      </div>
                      <div className="flex gap-3 text-[10px] font-medium">
                        <span className="text-text-secondary">
                          <span className="text-text-primary">
                            {entry.pointsFor.toFixed(1)}
                          </span>{" "}
                          PF
                        </span>
                        <span className="text-text-muted">
                          {entry.pointsAgainst.toFixed(1)} PA
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile stats row */}
                <div className="flex border-t border-border-light px-4 py-2 text-xs text-text-muted sm:hidden">
                  <span className="flex-1">
                    PF:{" "}
                    <span className="font-semibold text-text-primary">
                      {entry.pointsFor.toFixed(1)}
                    </span>
                  </span>
                  <span className="flex-1 text-center">
                    PA:{" "}
                    <span className="font-semibold text-text-secondary">
                      {entry.pointsAgainst.toFixed(1)}
                    </span>
                  </span>
                  {!isComplete && entry.streak && (
                    <span className="flex-1 text-right">
                      <span
                        className={`font-bold ${
                          entry.streak.includes("W")
                            ? "text-emerald-500"
                            : "text-red-400"
                        }`}
                      >
                        {entry.streak}
                      </span>
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

    </div>
  );
}

