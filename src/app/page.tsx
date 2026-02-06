import Image from "next/image";
import Link from "next/link";
import { LEAGUE_CONFIG } from "@/lib/config";
import {
  getLeague,
  getRosters,
  getUsers,
  getNflState,
  getWinnersBracket,
} from "@/lib/sleeper";
import { getAllTransactions } from "@/lib/sleeper/transactions";
import { getPlayers, getPlayerName } from "@/lib/sleeper/players";
import { buildStandings, getSleeperAvatarUrl } from "@/lib/utils/standings";
import { getChampionRosterId, getRunnerUpRosterId } from "@/lib/utils/brackets";
import { Card } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";

export const revalidate = 300;

async function getMostRecentCompletedLeagueId(): Promise<string> {
  const league = await getLeague(LEAGUE_CONFIG.leagueId);
  if (league.status === "pre_draft" && league.previous_league_id) {
    return league.previous_league_id;
  }
  return league.league_id;
}

export default async function HomePage() {
  const currentLeague = await getLeague(LEAGUE_CONFIG.leagueId);
  const nflState = await getNflState();

  const dataLeagueId = await getMostRecentCompletedLeagueId();
  const [dataLeague, users, rosters] = await Promise.all([
    getLeague(dataLeagueId),
    getUsers(dataLeagueId),
    getRosters(dataLeagueId),
  ]);

  const standings = buildStandings(rosters, users);

  // Fetch bracket data to determine actual champion
  let championEntry: (typeof standings)[number] | null = null;
  let runnerUpEntry: (typeof standings)[number] | null = null;
  if (dataLeague.status === "complete") {
    try {
      const winnersBracket = await getWinnersBracket(dataLeagueId);
      const championRosterId = getChampionRosterId(winnersBracket);
      const runnerUpRosterId = getRunnerUpRosterId(winnersBracket);
      if (championRosterId != null) {
        championEntry =
          standings.find((s) => s.rosterId === championRosterId) || null;
      }
      if (runnerUpRosterId != null) {
        runnerUpEntry =
          standings.find((s) => s.rosterId === runnerUpRosterId) || null;
      }
    } catch {
      // Fall back to top of standings if bracket fetch fails
      championEntry = standings[0] || null;
    }
  }

  let recentTransactions: Awaited<ReturnType<typeof getAllTransactions>> = [];
  try {
    const allTxns = await getAllTransactions(dataLeagueId, 18);
    recentTransactions = allTxns.slice(0, 6);
  } catch {
    // silent
  }

  let players: Awaited<ReturnType<typeof getPlayers>> = {};
  if (recentTransactions.length > 0) {
    try {
      players = await getPlayers();
    } catch {
      // silent
    }
  }

  const userMap = new Map(users.map((u) => [u.user_id, u]));
  const rosterToUser = new Map(
    rosters.map((r) => [r.roster_id, userMap.get(r.owner_id)])
  );

  const seasonStatus =
    currentLeague.status === "pre_draft"
      ? `${currentLeague.season} Pre-Draft`
      : currentLeague.status === "drafting"
        ? `${currentLeague.season} Draft In Progress`
        : currentLeague.status === "in_season"
          ? `${currentLeague.season} Season — Week ${nflState.week}`
          : `${currentLeague.season} Season Complete`;

  // Stats
  const totalPF = standings.reduce((sum, s) => sum + s.pointsFor, 0);

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* ─── Hero Section ─── */}
      <section className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
        <div className="gradient-hero-subtle relative overflow-hidden px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8">
          {/* Subtle grid pattern */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative mx-auto max-w-7xl">
            <div className="flex flex-col items-center text-center">
              <div className="glow mb-5">
                <Image
                  src="/logos/icon.JPG"
                  alt={LEAGUE_CONFIG.name}
                  width={88}
                  height={88}
                  className="rounded-2xl"
                  priority
                />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                {LEAGUE_CONFIG.name}
              </h1>
              <p className="mt-2 max-w-md text-sm font-medium text-white/50">
                {LEAGUE_CONFIG.fullName}
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/70 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {seasonStatus}
              </div>

              {/* League stat pills */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {[
                  { label: "Teams", value: "10" },
                  { label: "Format", value: "Superflex" },
                  { label: "Scoring", value: "Half PPR" },
                  { label: "TE Prem", value: "1.0 PPR" },
                  { label: "Seasons", value: "3" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center backdrop-blur-sm"
                  >
                    <p className="text-base font-bold text-white">{value}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main Content Grid ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Standings */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  {dataLeague.season} Standings
                </h2>
                <p className="text-xs text-text-muted">
                  {standings.length} teams &middot; {totalPF.toFixed(0)} total
                  points scored
                </p>
              </div>
              <Link
                href="/standings"
                className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                Full Standings
              </Link>
            </div>

            {/* Standings rows */}
            <div className="stagger-children">
              {standings.map((entry) => {
                const pctBar =
                  entry.pointsFor > 0
                    ? Math.round(
                        (entry.pointsFor / (standings[0]?.pointsFor || 1)) * 100
                      )
                    : 0;
                return (
                  <Link
                    key={entry.rosterId}
                    href={`/rosters/${entry.rosterId}`}
                    className="flex items-center gap-3 border-b border-border-light px-5 py-3.5 transition-colors last:border-b-0 hover:bg-surface/50"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        entry.rank === 1
                          ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-200"
                          : entry.rank === 2
                            ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                            : entry.rank === 3
                              ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white"
                              : entry.rank <= 6
                                ? "bg-navy/10 text-navy"
                                : "bg-surface text-text-muted"
                      }`}
                    >
                      {entry.rank}
                    </span>
                    {entry.avatar ? (
                      <Image
                        src={getSleeperAvatarUrl(entry.avatar)}
                        alt={entry.displayName}
                        width={36}
                        height={36}
                        className="rounded-full ring-2 ring-white"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-surface ring-2 ring-white" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {entry.teamName}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-navy/60 to-steel/60"
                            style={{ width: `${pctBar}%` }}
                          />
                        </div>
                        <span className="tabular shrink-0 text-[10px] font-medium text-text-muted">
                          {entry.pointsFor.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-sm font-bold text-text-primary">
                        {entry.wins}-{entry.losses}
                        {entry.ties > 0 && `-${entry.ties}`}
                      </p>
                      {entry.streak && (
                        <span
                          className={`text-[10px] font-semibold ${
                            entry.streak.includes("W")
                              ? "text-emerald-500"
                              : "text-red-400"
                          }`}
                        >
                          {entry.streak}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right column: Activity + Champion */}
        <div className="space-y-6">
          {/* Season champion callout — uses actual playoff bracket winner */}
          {dataLeague.status === "complete" && championEntry && (
            <Card className="relative overflow-hidden border-amber-200/50 bg-gradient-to-br from-amber-50 to-white">
              <div className="absolute right-3 top-3 text-3xl opacity-20">
                &#x1F3C6;
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70">
                {dataLeague.season} Champion
              </p>
              <div className="mt-2 flex items-center gap-3">
                {championEntry.avatar ? (
                  <Image
                    src={getSleeperAvatarUrl(championEntry.avatar)}
                    alt={championEntry.displayName}
                    width={40}
                    height={40}
                    className="rounded-full ring-2 ring-amber-300"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-amber-100" />
                )}
                <div>
                  <p className="text-base font-bold text-text-primary">
                    {championEntry.teamName}
                  </p>
                  <p className="text-xs text-text-muted">
                    {championEntry.wins}-{championEntry.losses} &middot;{" "}
                    {championEntry.pointsFor.toFixed(1)} PF
                  </p>
                </div>
              </div>
              {runnerUpEntry && (
                <div className="mt-3 flex items-center gap-2 border-t border-amber-200/40 pt-3">
                  <span className="text-[10px] font-medium text-text-muted">
                    Runner-Up:
                  </span>
                  <span className="text-xs font-semibold text-text-secondary">
                    {runnerUpEntry.teamName}
                  </span>
                </div>
              )}
            </Card>
          )}

          {/* Recent activity */}
          <Card padding="none">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <h2 className="text-base font-bold text-text-primary">
                Recent Activity
              </h2>
              <Link
                href="/transactions"
                className="text-xs font-semibold text-steel hover:text-steel-light"
              >
                All
              </Link>
            </div>
            <div className="divide-y divide-border-light">
              {recentTransactions.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-text-muted">
                  No recent transactions
                </p>
              ) : (
                recentTransactions.map((txn) => {
                  const roster = rosterToUser.get(txn.roster_ids[0]);
                  const managerName =
                    roster?.display_name || roster?.username || "Unknown";
                  const addedPlayers = txn.adds
                    ? Object.keys(txn.adds).map((id) =>
                        getPlayerName(players, id)
                      )
                    : [];
                  const droppedPlayers = txn.drops
                    ? Object.keys(txn.drops).map((id) =>
                        getPlayerName(players, id)
                      )
                    : [];

                  const typeLabel =
                    txn.type === "trade"
                      ? "Trade"
                      : txn.type === "waiver"
                        ? "Waiver"
                        : txn.type === "free_agent"
                          ? "FA"
                          : "Commish";

                  const typeColor =
                    txn.type === "trade"
                      ? "bg-indigo-500"
                      : txn.type === "waiver"
                        ? "bg-amber-500"
                        : "bg-emerald-500";

                  return (
                    <div
                      key={txn.transaction_id}
                      className="px-5 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${typeColor}`}
                        />
                        <span className="text-xs font-semibold text-text-primary">
                          {managerName}
                        </span>
                        <span className="rounded bg-surface px-1.5 py-0.5 text-[9px] font-bold uppercase text-text-muted">
                          {typeLabel}
                        </span>
                        <span className="ml-auto text-[10px] text-text-muted">
                          {formatDistanceToNow(txn.status_updated, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="mt-1 pl-3.5 text-xs">
                        {addedPlayers.length > 0 && (
                          <span className="font-medium text-emerald-600">
                            +{addedPlayers.join(", ")}
                          </span>
                        )}
                        {addedPlayers.length > 0 &&
                          droppedPlayers.length > 0 && (
                            <span className="mx-1.5 text-text-muted">
                              /
                            </span>
                          )}
                        {droppedPlayers.length > 0 && (
                          <span className="font-medium text-red-400">
                            -{droppedPlayers.join(", ")}
                          </span>
                        )}
                        {txn.type === "trade" &&
                          txn.draft_picks.length > 0 && (
                            <span className="ml-1 text-text-muted">
                              +{txn.draft_picks.length} pick
                              {txn.draft_picks.length > 1 ? "s" : ""}
                            </span>
                          )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
