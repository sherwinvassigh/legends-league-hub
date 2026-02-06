import Image from "next/image";
import Link from "next/link";
import { LEAGUE_CONFIG } from "@/lib/config";
import { getLeague, getRosters, getUsers } from "@/lib/sleeper";
import { getPlayers } from "@/lib/sleeper/players";
import { buildStandings, getSleeperAvatarUrl } from "@/lib/utils/standings";
import { Card, PageHeader, PositionBadge } from "@/components/ui";
import type { SleeperPlayer } from "@/lib/sleeper/types";

export const revalidate = 300;

async function getDataLeagueId(): Promise<string> {
  const league = await getLeague(LEAGUE_CONFIG.leagueId);
  if (league.status === "pre_draft" && league.previous_league_id) {
    return league.previous_league_id;
  }
  return league.league_id;
}

// Positional value ordering for sorting starters
const POSITION_ORDER: Record<string, number> = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4,
  K: 5,
  DEF: 6,
};

function getStartersGrouped(
  starterIds: string[] | null,
  rosterPositions: string[],
  players: Record<string, SleeperPlayer>
): { slotLabel: string; player: SleeperPlayer | null; playerId: string }[] {
  if (!starterIds) return [];
  const nonBnPositions = rosterPositions.filter((p) => p !== "BN");

  return starterIds.map((id, i) => {
    const slotLabel = nonBnPositions[i] || "BN";
    const player = id !== "0" ? players[id] || null : null;
    return { slotLabel, player, playerId: id };
  });
}

export default async function RostersPage() {
  const dataLeagueId = await getDataLeagueId();
  const [league, users, rosters, players] = await Promise.all([
    getLeague(dataLeagueId),
    getUsers(dataLeagueId),
    getRosters(dataLeagueId),
    getPlayers(),
  ]);

  const standings = buildStandings(rosters, users);
  const rosterMap = new Map(rosters.map((r) => [r.roster_id, r]));

  // FAAB budget from league settings
  const faabBudget = league.settings.waiver_budget || 0;

  return (
    <div>
      <PageHeader
        title="Rosters"
        subtitle={`${league.season} Season \u00B7 ${rosters.length} Teams`}
      />

      <div className="stagger-children grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
        {standings.map((entry) => {
          const roster = rosterMap.get(entry.rosterId);
          const starters = getStartersGrouped(
            roster?.starters || null,
            league.roster_positions,
            players
          );
          const totalPlayers = roster?.players?.length || 0;

          // Calculate remaining FAAB
          const faabUsed =
            (roster?.settings as Record<string, unknown>)?.waiver_budget_used;
          const faabRemaining =
            typeof faabUsed === "number" ? faabBudget - faabUsed : faabBudget;

          return (
            <Link key={entry.rosterId} href={`/rosters/${entry.rosterId}`}>
              <Card hover padding="none" className="h-full">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 pb-3 pt-5">
                  <div className="relative">
                    {entry.avatar ? (
                      <Image
                        src={getSleeperAvatarUrl(entry.avatar)}
                        alt={entry.displayName}
                        width={44}
                        height={44}
                        className="rounded-full ring-2 ring-border"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-surface ring-2 ring-border" />
                    )}
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold ${
                        entry.rank <= 3
                          ? "bg-navy text-white"
                          : "bg-surface-alt text-text-secondary"
                      }`}
                    >
                      {entry.rank}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-text-primary">
                      {entry.teamName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {entry.displayName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-lg font-extrabold text-text-primary">
                      {entry.wins}-{entry.losses}
                    </p>
                    <p className="tabular text-[10px] font-medium text-text-muted">
                      {entry.pointsFor.toFixed(0)} PF
                    </p>
                  </div>
                </div>

                {/* All 10 starters */}
                {starters.length > 0 && (
                  <div className="mx-5 space-y-1 border-t border-border-light pb-3 pt-3">
                    {starters.map((s, i) => (
                      <div
                        key={`${s.playerId}-${i}`}
                        className="flex items-center gap-2"
                      >
                        <span className="w-9 text-[9px] font-medium uppercase text-text-muted">
                          {s.slotLabel === "SUPER_FLEX" ? "SF" : s.slotLabel}
                        </span>
                        {s.player ? (
                          <>
                            <PositionBadge position={s.player.position} />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary">
                              {s.player.first_name[0]}. {s.player.last_name}
                            </span>
                            <span className="text-[10px] font-medium text-text-muted">
                              {s.player.team || "FA"}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-text-muted">
                            Empty
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer stats */}
                <div className="flex items-center gap-4 border-t border-border-light bg-surface/30 px-5 py-2.5 text-[10px] font-medium text-text-muted">
                  <span>{totalPlayers} players</span>
                  {(roster?.taxi?.length || 0) > 0 && (
                    <span>{roster?.taxi?.length} taxi</span>
                  )}
                  {(roster?.reserve?.length || 0) > 0 && (
                    <span>{roster?.reserve?.length} IR</span>
                  )}
                  <span className="tabular">
                    ${faabRemaining} FAAB
                  </span>
                  <span className="ml-auto text-steel">
                    View Roster &#8594;
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
