"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  getLeague,
  getRosters,
  getUsers,
  getWinnersBracket,
  getLosersBracket,
} from "@/lib/sleeper";
import { getSleeperAvatarUrl } from "@/lib/utils/standings";
import {
  buildBracketDisplay,
  getChampionRosterId,
  type BracketRound,
  type BracketMatchupDisplay,
} from "@/lib/utils/brackets";
import { Card, PageHeader } from "@/components/ui";
import { HiTrophy } from "react-icons/hi2";

interface ChampionInfo {
  rosterId: number;
  teamName: string;
  displayName: string;
  avatar: string | null;
}

export default function PlayoffsPage() {
  const [season, setSeason] = useState("2025");
  const [loading, setLoading] = useState(true);
  const [winnersRounds, setWinnersRounds] = useState<BracketRound[]>([]);
  const [losersRounds, setLosersRounds] = useState<BracketRound[]>([]);
  const [champion, setChampion] = useState<ChampionInfo | null>(null);
  const [leagueStatus, setLeagueStatus] = useState<string>("");

  // Season to league ID mapping
  const seasonLeagueMap: Record<string, string> = {
    "2023": "917492438267305984",
    "2024": "1048246044892524544",
    "2025": "1180278386412273664",
    "2026": "1313306806897881088",
  };

  useEffect(() => {
    async function fetchPlayoffData() {
      try {
        setLoading(true);
        const leagueId = seasonLeagueMap[season];
        if (!leagueId) return;

        const [league, rosters, users, winnersBracket, losersBracket] =
          await Promise.all([
            getLeague(leagueId),
            getRosters(leagueId),
            getUsers(leagueId),
            getWinnersBracket(leagueId),
            getLosersBracket(leagueId),
          ]);

        setLeagueStatus(league.status);

        // Build bracket displays
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

        setWinnersRounds(winnersDisplay);
        setLosersRounds(losersDisplay);

        // Get champion info
        const championId = getChampionRosterId(winnersBracket);
        if (championId) {
          const roster = rosters.find((r) => r.roster_id === championId);
          const user = roster
            ? users.find((u) => u.user_id === roster.owner_id)
            : null;
          if (roster && user) {
            setChampion({
              rosterId: championId,
              teamName: user.metadata?.team_name || user.display_name,
              displayName: user.display_name,
              avatar: user.avatar || null,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching playoff data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlayoffData();
  }, [season]);

  function MatchupCard({
    matchup,
    isChampionship,
    isThirdPlace,
  }: {
    matchup: BracketMatchupDisplay;
    isChampionship?: boolean;
    isThirdPlace?: boolean;
  }) {
    const borderClass = isChampionship
      ? "border-2 border-amber-400 bg-amber-50/30"
      : isThirdPlace
      ? "border-2 border-orange-400 bg-orange-50/20"
      : "border border-border";

    const isTeam1Winner = matchup.winnerId === matchup.team1?.rosterId;
    const isTeam2Winner = matchup.winnerId === matchup.team2?.rosterId;

    return (
      <Card className={`${borderClass} relative`} padding="sm">
        {isChampionship && (
          <div className="absolute -right-2 -top-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg">
              <HiTrophy className="h-5 w-5" />
            </div>
          </div>
        )}
        {isThirdPlace && (
          <div className="absolute -right-2 -top-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow">
              3rd
            </div>
          </div>
        )}

        <div className="space-y-2">
          {/* Team 1 */}
          <div
            className={`flex items-center gap-2 rounded-lg p-2 ${
              isTeam1Winner
                ? "bg-green-50 ring-1 ring-green-200"
                : "bg-surface/50"
            }`}
          >
            {matchup.team1 ? (
              <>
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {matchup.team1.avatar ? (
                    <Image
                      src={getSleeperAvatarUrl(matchup.team1.avatar)}
                      alt={matchup.team1.teamName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-extrabold text-text-muted">
                      {matchup.team1.teamName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 truncate text-xs font-bold text-text-primary">
                  {matchup.team1.teamName}
                </div>
                {isTeam1Winner && (
                  <div className="text-green-600">
                    <HiTrophy className="h-4 w-4" />
                  </div>
                )}
              </>
            ) : (
              <div className="py-1 text-xs text-text-muted">TBD</div>
            )}
          </div>

          {/* Team 2 */}
          <div
            className={`flex items-center gap-2 rounded-lg p-2 ${
              isTeam2Winner
                ? "bg-green-50 ring-1 ring-green-200"
                : "bg-surface/50"
            }`}
          >
            {matchup.team2 ? (
              <>
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-surface">
                  {matchup.team2.avatar ? (
                    <Image
                      src={getSleeperAvatarUrl(matchup.team2.avatar)}
                      alt={matchup.team2.teamName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-extrabold text-text-muted">
                      {matchup.team2.teamName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 truncate text-xs font-bold text-text-primary">
                  {matchup.team2.teamName}
                </div>
                {isTeam2Winner && (
                  <div className="text-green-600">
                    <HiTrophy className="h-4 w-4" />
                  </div>
                )}
              </>
            ) : (
              <div className="py-1 text-xs text-text-muted">TBD</div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Playoffs" subtitle="Loading..." />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="h-24 animate-pulse rounded-xl bg-surface" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Playoffs" subtitle={`${season} Season`} />

      {/* Season Selector */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-bold text-text-secondary">Season:</label>
        <div className="flex gap-2">
          {["2023", "2024", "2025", "2026"].map((yr) => (
            <button
              key={yr}
              onClick={() => setSeason(yr)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                season === yr
                  ? "bg-navy text-white shadow-lg shadow-navy/20"
                  : "bg-white text-text-muted ring-1 ring-border hover:text-text-primary hover:ring-steel"
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Champion Banner */}
      {champion && leagueStatus === "complete" && (
        <Card className="mb-6 border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-xl">
              <HiTrophy className="h-10 w-10" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-800">
                {season} Champion
              </div>
              <div className="truncate text-xl font-extrabold text-amber-900">
                {champion.teamName}
              </div>
              <div className="truncate text-sm text-amber-700">
                {champion.displayName}
              </div>
            </div>
            {champion.avatar && (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ring-amber-400">
                <Image
                  src={getSleeperAvatarUrl(champion.avatar)}
                  alt={champion.teamName}
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Playoffs Not Started */}
      {leagueStatus === "pre_draft" ||
      leagueStatus === "drafting" ||
      (winnersRounds.length === 0 && losersRounds.length === 0) ? (
        <Card>
          <div className="py-12 text-center">
            <div className="mb-2 text-4xl">🏆</div>
            <div className="mb-1 text-sm font-bold text-text-primary">
              Playoffs Haven't Started
            </div>
            <div className="text-xs text-text-muted">
              Check back when the regular season is complete
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Winners Bracket */}
          {winnersRounds.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-4 text-lg font-extrabold text-navy">
                Winners Bracket
              </h2>
              <div className="grid gap-4 lg:grid-cols-3">
                {winnersRounds.map((round) => (
                  <div key={round.round}>
                    <div className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-text-muted">
                      {round.label}
                    </div>
                    <div className="space-y-3">
                      {round.matchups.map((matchup) => (
                        <MatchupCard
                          key={matchup.matchupId}
                          matchup={matchup}
                          isChampionship={matchup.placement === 1}
                          isThirdPlace={matchup.placement === 3}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Losers/Consolation Bracket */}
          {losersRounds.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-extrabold text-navy">
                Consolation Bracket
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {losersRounds.map((round) => (
                  <div key={round.round}>
                    <div className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-text-muted">
                      {round.label}
                    </div>
                    <div className="space-y-3">
                      {round.matchups.map((matchup) => (
                        <MatchupCard
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
