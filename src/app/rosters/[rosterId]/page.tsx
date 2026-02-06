import Image from "next/image";
import Link from "next/link";
import { LEAGUE_CONFIG } from "@/lib/config";
import { getLeague, getRosters, getUsers } from "@/lib/sleeper";
import { getPlayers, getPlayerName } from "@/lib/sleeper/players";
import { getSleeperAvatarUrl } from "@/lib/utils/standings";
import { Card, PageHeader, PositionBadge } from "@/components/ui";
import type { SleeperPlayer } from "@/lib/sleeper/types";
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
  const groups: Record<string, SleeperPlayer[]> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    Other: [],
  };

  for (const id of playerIds) {
    const player = players[id];
    if (!player) continue;
    const pos = player.position;
    if (groups[pos]) {
      groups[pos].push(player);
    } else {
      groups.Other.push(player);
    }
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
        <span className="w-8 text-right text-xs text-text-muted">
          {player.age}
        </span>
      )}
      {player.years_exp != null && (
        <span className="w-8 text-right text-[10px] text-text-muted">
          Yr {player.years_exp}
        </span>
      )}
    </div>
  );
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
  const teamName =
    user?.metadata?.team_name || user?.display_name || "Unknown";
  const displayName = user?.display_name || user?.username || "Unknown";

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

  const fpts =
    (roster.settings.fpts || 0) +
    (roster.settings.fpts_decimal || 0) / 100;
  const fptsAgainst =
    (roster.settings.fpts_against || 0) +
    (roster.settings.fpts_against_decimal || 0) / 100;

  // FAAB
  const faabBudget = league.settings.waiver_budget || 0;
  const faabUsed =
    (roster.settings as Record<string, unknown>)?.waiver_budget_used;
  const faabRemaining =
    typeof faabUsed === "number" ? faabBudget - faabUsed : faabBudget;

  const benchGroups = groupPlayersByPosition(benchIds, players);

  return (
    <div>
      <PageHeader title={teamName} subtitle={displayName}>
        <Link
          href="/rosters"
          className="text-sm font-medium text-steel hover:text-steel-light"
        >
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
              <p className="truncate text-lg font-bold text-text-primary">
                {teamName}
              </p>
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
              <p className="text-lg font-bold text-text-primary">
                {fpts.toFixed(1)}
              </p>
              <p className="text-[10px] text-text-muted">PF</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {fptsAgainst.toFixed(1)}
              </p>
              <p className="text-[10px] text-text-muted">PA</p>
            </div>
            <div>
              <p className="tabular text-lg font-bold text-text-primary">
                ${faabRemaining}
              </p>
              <p className="text-[10px] text-text-muted">FAAB</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Starters */}
        <Card padding="none">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-text-primary">
              Starters ({starterIds.length})
            </h2>
          </div>
          <div className="divide-y divide-border-light px-4 sm:px-5">
            {starterIds.map((id, i) => {
              const player = players[id];
              const slotLabel = rosterPositions[i] || "BN";
              return (
                <div
                  key={`${id}-${i}`}
                  className="flex items-center gap-2 py-2.5 text-sm"
                >
                  <span className="w-12 text-[10px] font-medium uppercase text-text-muted">
                    {slotLabel === "SUPER_FLEX" ? "SFLEX" : slotLabel}
                  </span>
                  {player ? (
                    <>
                      <PositionBadge position={player.position} />
                      <span className="min-w-0 flex-1 truncate font-medium text-text-primary">
                        {player.first_name} {player.last_name}
                      </span>
                      <span className="text-xs text-text-muted">
                        {player.team || "FA"}
                      </span>
                      {player.age && (
                        <span className="w-8 text-right text-xs text-text-muted">
                          {player.age}
                        </span>
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
            <h2 className="text-sm font-semibold text-text-primary">
              Bench ({benchIds.length})
            </h2>
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
              <h2 className="text-sm font-semibold text-text-primary">
                Taxi Squad ({taxiIds.length})
              </h2>
            </div>
            <div className="divide-y divide-border-light px-4 sm:px-5">
              {taxiIds.map((id) => {
                const player = players[id];
                return player ? (
                  <PlayerRow key={id} player={player} />
                ) : (
                  <div key={id} className="py-2 text-xs text-text-muted">
                    {getPlayerName(players, id)}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* IR */}
        {reserveIds.length > 0 && (
          <Card padding="none">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-text-primary">
                Injured Reserve ({reserveIds.length})
              </h2>
            </div>
            <div className="divide-y divide-border-light px-4 sm:px-5">
              {reserveIds.map((id) => {
                const player = players[id];
                return player ? (
                  <PlayerRow key={id} player={player} />
                ) : (
                  <div key={id} className="py-2 text-xs text-text-muted">
                    {getPlayerName(players, id)}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
