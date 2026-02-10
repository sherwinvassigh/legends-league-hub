import Image from "next/image";
import { LEAGUE_CONFIG } from "@/lib/config";
import { getLeague, getRosters, getUsers } from "@/lib/sleeper";
import { getSleeperAvatarUrl } from "@/lib/utils/standings";
import {
  resolveDraftPickOwnership,
  computePickCapital,
  type DraftPickOwnership,
} from "@/lib/utils/draft-picks";
import { Card, PageHeader, Badge } from "@/components/ui";
import { HiCheckCircle, HiXCircle } from "react-icons/hi2";

export const revalidate = 300;

async function getDataLeagueId(): Promise<string> {
  const league = await getLeague(LEAGUE_CONFIG.leagueId);
  if (league.status === "pre_draft" && league.previous_league_id) {
    return league.previous_league_id;
  }
  return league.league_id;
}

export default async function DraftPicksPage() {
  const dataLeagueId = await getDataLeagueId();
  const [league, users, rosters] = await Promise.all([
    getLeague(dataLeagueId),
    getUsers(dataLeagueId),
    getRosters(dataLeagueId),
  ]);

  // Get next 3 years of draft picks
  const currentYear = parseInt(league.season);
  const futureSeasons = [
    String(currentYear + 1),
    String(currentYear + 2),
    String(currentYear + 3),
  ];

  const pickOwnership = await resolveDraftPickOwnership(
    dataLeagueId,
    rosters,
    futureSeasons,
    4 // 4 rounds for rookie drafts
  );

  const pickCapital = computePickCapital(
    pickOwnership,
    rosters.map((r) => r.roster_id)
  );

  // Sort teams by current standings (wins desc, then PF desc)
  const sortedRosters = [...rosters].sort((a, b) => {
    if (b.settings.wins !== a.settings.wins) {
      return b.settings.wins - a.settings.wins;
    }
    const aPF = (a.settings.fpts || 0) + (a.settings.fpts_decimal || 0) / 100;
    const bPF = (b.settings.fpts || 0) + (b.settings.fpts_decimal || 0) / 100;
    return bPF - aPF;
  });

  function getPickCellContent(
    rosterId: number,
    season: string,
    round: number
  ): { label: string; color: string; detail?: string } {
    const pick = pickOwnership.find(
      (p) =>
        p.season === season &&
        p.round === round &&
        p.currentOwnerRosterId === rosterId
    );

    if (!pick) {
      return { label: "-", color: "bg-gray-100 text-gray-400" };
    }

    if (pick.status === "owns_own") {
      return { label: "Own", color: "bg-green-100 text-green-700" };
    }

    if (pick.status === "acquired") {
      const originalTeam = rosters.find(
        (r) => r.roster_id === pick.originalTeamRosterId
      );
      const originalUser = originalTeam
        ? users.find((u) => u.user_id === originalTeam.owner_id)
        : null;
      const teamName =
        originalUser?.metadata?.team_name || originalUser?.display_name || "Unknown";
      return {
        label: "↓",
        color: "bg-blue-100 text-blue-700",
        detail: `from ${teamName}`,
      };
    }

    return { label: "-", color: "bg-gray-100 text-gray-400" };
  }

  // Check for traded away picks
  function getTradedAwayPicks(rosterId: number): DraftPickOwnership[] {
    return pickOwnership.filter(
      (p) =>
        p.originalTeamRosterId === rosterId && p.currentOwnerRosterId !== rosterId
    );
  }

  return (
    <div>
      <PageHeader
        title="Draft Picks"
        subtitle={`Future Pick Ownership • Next 3 Years`}
      />

      {/* Overview */}
      <Card className="mb-6">
        <div className="mb-4 text-sm font-bold text-navy">Quick Guide</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-16 rounded-lg bg-green-100" />
            <div className="text-xs text-text-secondary">Team owns their pick</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-16 items-center justify-center rounded-lg bg-blue-100 text-sm text-blue-700">
              ↓
            </div>
            <div className="text-xs text-text-secondary">Acquired from another team</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-16 items-center justify-center rounded-lg bg-red-100 text-xs text-red-700">
              Traded
            </div>
            <div className="text-xs text-text-secondary">Pick traded away</div>
          </div>
        </div>
      </Card>

      {/* Pick Ownership Table */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <Card padding="none">
            <div className="overflow-hidden">
              {/* Header */}
              <div className="grid gap-px bg-border-light" style={{ gridTemplateColumns: "200px repeat(12, 1fr)" }}>
                <div className="bg-surface px-4 py-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Team
                  </div>
                </div>
                {futureSeasons.map((season) => (
                  <div key={season} className="col-span-4 bg-surface px-2 py-3 text-center">
                    <div className="text-xs font-bold text-navy">{season}</div>
                    <div className="mt-0.5 grid grid-cols-4 gap-px text-[9px] text-text-muted">
                      <div>R1</div>
                      <div>R2</div>
                      <div>R3</div>
                      <div>R4</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rows */}
              {sortedRosters.map((roster, idx) => {
                const user = users.find((u) => u.user_id === roster.owner_id);
                const teamName =
                  user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`;
                const capital = pickCapital.find((c) => c.rosterId === roster.roster_id);
                const tradedAway = getTradedAwayPicks(roster.roster_id);

                return (
                  <div
                    key={roster.roster_id}
                    className={`grid gap-px bg-border-light ${idx % 2 === 0 ? "bg-white" : "bg-surface/30"}`}
                    style={{ gridTemplateColumns: "200px repeat(12, 1fr)" }}
                  >
                    {/* Team Name */}
                    <div className="flex items-center gap-3 bg-white px-4 py-3">
                      {user?.avatar && (
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-surface">
                          <Image
                            src={getSleeperAvatarUrl(user.avatar)}
                            alt={teamName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-text-primary">
                          {teamName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <div className="text-[10px] text-text-muted">
                            {capital?.totalOwned || 0} picks
                          </div>
                          {capital?.ownsOwnFirst ? (
                            <HiCheckCircle className="h-3 w-3 text-green-600" title="Owns all future 1st round picks" />
                          ) : (
                            <HiXCircle className="h-3 w-3 text-red-500" title="Missing 1st round pick(s)" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Picks by Season/Round */}
                    {futureSeasons.map((season) =>
                      [1, 2, 3, 4].map((round) => {
                        const cell = getPickCellContent(roster.roster_id, season, round);
                        const tradedAwayPick = tradedAway.find(
                          (p) => p.season === season && p.round === round
                        );

                        if (tradedAwayPick) {
                          const newOwner = rosters.find(
                            (r) => r.roster_id === tradedAwayPick.currentOwnerRosterId
                          );
                          const newOwnerUser = newOwner
                            ? users.find((u) => u.user_id === newOwner.owner_id)
                            : null;
                          const newOwnerName =
                            newOwnerUser?.metadata?.team_name ||
                            newOwnerUser?.display_name ||
                            "Unknown";

                          return (
                            <div
                              key={`${season}-${round}`}
                              className="flex items-center justify-center bg-red-100 p-2 text-center"
                              title={`Traded to ${newOwnerName}`}
                            >
                              <span className="text-[9px] font-bold text-red-700">
                                Traded
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`${season}-${round}`}
                            className={`flex items-center justify-center p-2 text-center ${cell.color}`}
                            title={cell.detail}
                          >
                            <span className="text-sm font-bold">{cell.label}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Pick Capital Summary */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-extrabold text-navy">Pick Capital Summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pickCapital
            .sort((a, b) => b.totalOwned - a.totalOwned)
            .map((capital) => {
              const roster = rosters.find((r) => r.roster_id === capital.rosterId);
              const user = roster ? users.find((u) => u.user_id === roster.owner_id) : null;
              const teamName =
                user?.metadata?.team_name || user?.display_name || `Team ${capital.rosterId}`;

              return (
                <Card key={capital.rosterId}>
                  <div className="mb-2 truncate text-sm font-bold text-navy">
                    {teamName}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-extrabold text-navy">
                      {capital.totalOwned}
                    </div>
                    <div className="text-xs text-text-muted">total picks</div>
                  </div>
                  {capital.totalTradedAway > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      {capital.totalTradedAway} traded away
                    </div>
                  )}
                  <div className="mt-2">
                    {capital.ownsOwnFirst ? (
                      <Badge className="bg-green-100 text-green-700">
                        ✓ All 1st rounders
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700">⚠ Missing 1st(s)</Badge>
                    )}
                  </div>
                </Card>
              );
            })}
        </div>
      </div>
    </div>
  );
}
