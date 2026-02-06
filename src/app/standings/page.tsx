import Image from "next/image";
import Link from "next/link";
import { LEAGUE_CONFIG } from "@/lib/config";
import {
  getLeague,
  getRosters,
  getUsers,
  getWinnersBracket,
  getLosersBracket,
} from "@/lib/sleeper";
import { buildStandings, getSleeperAvatarUrl } from "@/lib/utils/standings";
import {
  resolveBracketPlacements,
  buildBracketDisplay,
} from "@/lib/utils/brackets";
import { Card, PageHeader } from "@/components/ui";

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
  const [league, users, rosters, winnersBracket, losersBracket] =
    await Promise.all([
      getLeague(dataLeagueId),
      getUsers(dataLeagueId),
      getRosters(dataLeagueId),
      getWinnersBracket(dataLeagueId),
      getLosersBracket(dataLeagueId),
    ]);

  const standings = buildStandings(rosters, users);
  const playoffTeams = league.settings.playoff_teams || 6;
  const maxPF = Math.max(...standings.map((s) => s.pointsFor));

  // Get final playoff placements
  const placements = resolveBracketPlacements(
    winnersBracket,
    losersBracket,
    playoffTeams
  );
  const placementMap = new Map(
    placements.map((p) => [p.rosterId, p.placement])
  );

  // Build bracket display data for visualization
  const winnersDisplay = buildBracketDisplay(
    winnersBracket,
    rosters,
    users,
    "winners"
  );
  const losersDisplay = buildBracketDisplay(
    losersBracket,
    rosters,
    users,
    "losers"
  );

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
          const finalPlace = placementMap.get(entry.rosterId);
          const isChampion = finalPlace === 1;

          // Determine the left accent border color
          let accentClass = "";
          if (isChampion) {
            accentClass = "border-l-4 border-l-amber-400";
          } else if (isBye) {
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
                      isChampion
                        ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-200"
                        : entry.rank === 1
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
                          {isComplete && finalPlace != null && (
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                finalPlace === 1
                                  ? "bg-amber-100 text-amber-700"
                                  : finalPlace === 2
                                    ? "bg-slate-100 text-slate-600"
                                    : finalPlace === 3
                                      ? "bg-amber-50 text-amber-600"
                                      : finalPlace <= 6
                                        ? "bg-blue-50 text-blue-600"
                                        : "bg-surface text-text-muted"
                              }`}
                            >
                              {finalPlace === 1
                                ? "🏆"
                                : `${finalPlace}${getPlacementSuffix(finalPlace)}`}
                            </span>
                          )}
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
                  {isComplete && finalPlace != null && (
                    <span className="flex-1 text-right font-semibold text-text-secondary">
                      {finalPlace === 1
                        ? "🏆 Champ"
                        : `Finished ${finalPlace}${getPlacementSuffix(finalPlace)}`}
                    </span>
                  )}
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

      {/* ─── Playoff Bracket ─── */}
      {isComplete && winnersDisplay.length > 0 && (
        <>
          <div className="mt-12 mb-6">
            <h2 className="text-xl font-extrabold tracking-tight text-text-primary">
              Playoff Bracket
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {league.season} Postseason Results
            </p>
            <div className="mt-3 h-px bg-gradient-to-r from-border via-border to-transparent" />
          </div>

          {/* Winners Bracket */}
          <div className="mb-8">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-text-muted">
              Winners Bracket
            </h3>
            <div className="space-y-4">
              {winnersDisplay.map((round) => (
                <div key={round.round}>
                  <p className="mb-2 text-xs font-bold text-text-secondary">
                    {round.label}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {round.matchups.map((matchup) => (
                      <BracketMatchupCard
                        key={matchup.matchupId}
                        matchup={matchup}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Losers Bracket */}
          {losersDisplay.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-text-muted">
                Consolation Bracket
              </h3>
              <div className="space-y-4">
                {losersDisplay.map((round) => (
                  <div key={round.round}>
                    <p className="mb-2 text-xs font-bold text-text-secondary">
                      {round.label}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {round.matchups.map((matchup) => (
                        <BracketMatchupCard
                          key={matchup.matchupId}
                          matchup={matchup}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BracketMatchupCard({
  matchup,
}: {
  matchup: {
    matchupId: number;
    team1: {
      rosterId: number;
      teamName: string;
      displayName: string;
      avatar: string | null;
    } | null;
    team2: {
      rosterId: number;
      teamName: string;
      displayName: string;
      avatar: string | null;
    } | null;
    winnerId: number | null;
    placement?: number;
  };
}) {
  const isChampionship = matchup.placement === 1;

  return (
    <Card
      padding="none"
      className={`overflow-hidden ${
        isChampionship ? "ring-2 ring-amber-300" : ""
      }`}
    >
      {isChampionship && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-amber-600">
          Championship
        </div>
      )}
      {matchup.placement === 3 && (
        <div className="bg-surface px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-text-muted">
          3rd Place
        </div>
      )}
      {matchup.placement === 5 && (
        <div className="bg-surface px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-text-muted">
          5th Place
        </div>
      )}
      <div className="divide-y divide-border-light">
        {[matchup.team1, matchup.team2].map((team, idx) => {
          if (!team) return null;
          const isWinner = matchup.winnerId === team.rosterId;
          return (
            <div
              key={team.rosterId || idx}
              className={`flex items-center gap-2.5 px-4 py-2.5 ${
                isWinner ? "" : matchup.winnerId ? "opacity-40" : ""
              }`}
            >
              {team.avatar ? (
                <Image
                  src={getSleeperAvatarUrl(team.avatar)}
                  alt={team.displayName}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <div className="h-7 w-7 shrink-0 rounded-full bg-surface" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary">
                {team.teamName}
              </span>
              {isWinner && isChampionship && (
                <span className="text-sm">🏆</span>
              )}
              {isWinner && !isChampionship && (
                <span className="text-[10px] font-bold text-emerald-500">
                  W
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
