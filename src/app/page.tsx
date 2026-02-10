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
import { getMatchups } from "@/lib/sleeper/matchups";
import { getAllTransactions } from "@/lib/sleeper/transactions";
import { getPlayers, getPlayerInfo } from "@/lib/sleeper/players";
import { buildStandings, getSleeperAvatarUrl } from "@/lib/utils/standings";
import { getChampionRosterId, getRunnerUpRosterId } from "@/lib/utils/brackets";
import { Card } from "@/components/ui";
import { LEAGUE_MILESTONES } from "@/lib/config/milestones";
import { formatDistanceToNow } from "date-fns";
import {
  HiCalendarDays,
  HiTrophy,
  HiCurrencyDollar,
  HiPlayCircle,
  HiClock,
  HiDocumentText,
} from "react-icons/hi2";

export const revalidate = 300;

async function getMostRecentCompletedLeagueId(): Promise<string> {
  const league = await getLeague(LEAGUE_CONFIG.leagueId);
  if (league.status === "pre_draft" && league.previous_league_id) {
    return league.previous_league_id;
  }
  return league.league_id;
}

const POSITION_COLORS: Record<string, string> = {
  QB: "text-pos-qb",
  RB: "text-pos-rb",
  WR: "text-pos-wr",
  TE: "text-pos-te",
  K: "text-pos-k",
  DEF: "text-pos-def",
};

const MILESTONE_ICONS: Record<string, React.ReactNode> = {
  draft: <HiDocumentText className="h-4 w-4" />,
  money: <HiCurrencyDollar className="h-4 w-4" />,
  play: <HiPlayCircle className="h-4 w-4" />,
  deadline: <HiClock className="h-4 w-4" />,
  trophy: <HiTrophy className="h-4 w-4" />,
  calendar: <HiCalendarDays className="h-4 w-4" />,
};

export default async function HomePage() {
  const currentLeague = await getLeague(LEAGUE_CONFIG.leagueId);
  const nflState = await getNflState();

  const isOffseason =
    currentLeague.status === "pre_draft" || currentLeague.status === "complete";
  const isInSeason = currentLeague.status === "in_season";
  const isDrafting = currentLeague.status === "drafting";

  const dataLeagueId = await getMostRecentCompletedLeagueId();
  const [dataLeague, users, rosters] = await Promise.all([
    getLeague(dataLeagueId),
    getUsers(dataLeagueId),
    getRosters(dataLeagueId),
  ]);

  const standings = buildStandings(rosters, users);

  // Champion data
  let championEntry: (typeof standings)[number] | null = null;
  let runnerUpEntry: (typeof standings)[number] | null = null;
  if (dataLeague.status === "complete") {
    try {
      const winnersBracket = await getWinnersBracket(dataLeagueId);
      const championRosterId = getChampionRosterId(winnersBracket);
      const runnerUpRosterId = getRunnerUpRosterId(winnersBracket);
      if (championRosterId != null)
        championEntry = standings.find((s) => s.rosterId === championRosterId) || null;
      if (runnerUpRosterId != null)
        runnerUpEntry = standings.find((s) => s.rosterId === runnerUpRosterId) || null;
    } catch {
      championEntry = standings[0] || null;
    }
  }

  // In-season matchups for current/last week
  let weekMatchups: { team1: string; team2: string; score1: number; score2: number }[] = [];
  let leaguePulse: { highestScorer: string; highestScore: number; closestMargin: number; closestTeams: string } | null = null;

  if (isInSeason) {
    try {
      const matchupWeek = Math.max(1, nflState.week - 1);
      const rawMatchups = await getMatchups(dataLeagueId, matchupWeek);
      const rosterMap = new Map(rosters.map((r) => [r.roster_id, r]));
      const userMap2 = new Map(users.map((u) => [u.user_id, u]));

      const paired = new Map<number, typeof rawMatchups>();
      for (const m of rawMatchups) {
        if (!paired.has(m.matchup_id)) paired.set(m.matchup_id, []);
        paired.get(m.matchup_id)!.push(m);
      }

      let highestScore = 0;
      let highestScorer = "";
      let closestMargin = Infinity;
      let closestTeams = "";

      for (const [, pair] of paired) {
        if (pair.length !== 2) continue;
        const getName = (rid: number) => {
          const r = rosterMap.get(rid);
          const u = r ? userMap2.get(r.owner_id) : null;
          return u?.metadata?.team_name || u?.display_name || `Team ${rid}`;
        };

        const t1Name = getName(pair[0].roster_id);
        const t2Name = getName(pair[1].roster_id);
        weekMatchups.push({ team1: t1Name, team2: t2Name, score1: pair[0].points, score2: pair[1].points });

        for (const m of pair) {
          const name = getName(m.roster_id);
          if (m.points > highestScore) { highestScore = m.points; highestScorer = name; }
        }
        const margin = Math.abs(pair[0].points - pair[1].points);
        if (margin < closestMargin && margin > 0) {
          closestMargin = margin;
          closestTeams = `${t1Name} vs ${t2Name}`;
        }
      }

      if (highestScorer) {
        leaguePulse = { highestScorer, highestScore, closestMargin, closestTeams };
      }
    } catch { /* silent */ }
  }

  // Recent transactions
  let recentTransactions: Awaited<ReturnType<typeof getAllTransactions>> = [];
  try {
    const allTxns = await getAllTransactions(dataLeagueId, 18);
    recentTransactions = allTxns.slice(0, 6);
  } catch { /* silent */ }

  let players: Awaited<ReturnType<typeof getPlayers>> = {};
  if (recentTransactions.length > 0) {
    try { players = await getPlayers(); } catch { /* silent */ }
  }

  const userMap = new Map(users.map((u) => [u.user_id, u]));
  const rosterToUser = new Map(
    rosters.map((r) => [r.roster_id, userMap.get(r.owner_id)])
  );

  const seasonStatus = isOffseason
    ? currentLeague.status === "pre_draft"
      ? `${currentLeague.season} Offseason`
      : `${dataLeague.season} Season Complete`
    : isDrafting
      ? `${currentLeague.season} Draft In Progress`
      : `${currentLeague.season} Season — Week ${nflState.week}`;

  const totalPF = standings.reduce((sum, s) => sum + s.pointsFor, 0);

  return (
    <div className="space-y-8">
      {/* ─── Banner (visual only — no overlay text) ─── */}
      <section className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
        <div className="relative h-36 overflow-hidden sm:h-48">
          <Image
            src="/logos/banner.JPG"
            alt="L.E.G.E.N.D.S. Banner"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/30 to-navy-dark/60" />
        </div>
      </section>

      {/* ─── League Info (below banner) ─── */}
      <div className="-mt-12 flex flex-col items-center text-center sm:-mt-16">
        <Image
          src="/logos/icon.JPG"
          alt={LEAGUE_CONFIG.name}
          width={72}
          height={72}
          className="rounded-2xl ring-4 ring-white shadow-lg"
          priority
        />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">
          {LEAGUE_CONFIG.name}
        </h1>
        <p className="mt-1 max-w-md text-xs font-medium text-text-muted">
          {LEAGUE_CONFIG.fullName}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-xs font-semibold text-text-secondary ring-1 ring-border">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {seasonStatus}
        </div>
      </div>

      {/* ─── League Stat Pills ─── */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {[
          { label: "Teams", value: "10" },
          { label: "Format", value: "Superflex" },
          { label: "Scoring", value: "Half PPR" },
          { label: "TE Prem", value: "1.0 PPR" },
          { label: "Seasons", value: "3" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-surface px-4 py-2.5 text-center ring-1 ring-border">
            <p className="text-sm font-bold text-text-primary">{value}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* ─── Dynamic Content by Season Phase ─── */}

      {/* IN-SEASON: Week matchups + League Pulse */}
      {isInSeason && weekMatchups.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card padding="none">
              <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
                <h2 className="text-base font-bold text-text-primary">
                  Week {Math.max(1, nflState.week - 1)} Results
                </h2>
                <Link href="/matchups" className="text-xs font-semibold text-steel hover:text-steel-light">
                  All Matchups
                </Link>
              </div>
              <div className="divide-y divide-border-light">
                {weekMatchups.map((m, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <span className={`flex-1 text-right text-sm font-semibold ${m.score1 > m.score2 ? "text-text-primary" : "text-text-muted"}`}>
                      {m.team1}
                    </span>
                    <div className="tabular flex items-center gap-2 text-sm font-bold">
                      <span className={m.score1 > m.score2 ? "text-emerald-600" : "text-text-muted"}>{m.score1.toFixed(1)}</span>
                      <span className="text-text-muted">-</span>
                      <span className={m.score2 > m.score1 ? "text-emerald-600" : "text-text-muted"}>{m.score2.toFixed(1)}</span>
                    </div>
                    <span className={`flex-1 text-sm font-semibold ${m.score2 > m.score1 ? "text-text-primary" : "text-text-muted"}`}>
                      {m.team2}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          {leaguePulse && (
            <Card>
              <h2 className="text-sm font-bold text-text-primary">League Pulse</h2>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Highest Scorer</p>
                  <p className="text-sm font-semibold text-text-primary">{leaguePulse.highestScorer}</p>
                  <p className="tabular text-xs text-emerald-600">{leaguePulse.highestScore.toFixed(1)} pts</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Closest Game</p>
                  <p className="text-sm font-semibold text-text-primary">{leaguePulse.closestTeams}</p>
                  <p className="tabular text-xs text-amber-600">{leaguePulse.closestMargin.toFixed(2)} pt margin</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* DRAFTING: Draft status */}
      {isDrafting && (
        <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50 to-white text-center">
          <p className="text-2xl">&#x1F3C8;</p>
          <h2 className="mt-2 text-lg font-bold text-text-primary">Draft In Progress</h2>
          <p className="mt-1 text-sm text-text-muted">The {currentLeague.season} rookie draft is currently underway on Sleeper.</p>
          <Link href="/draft" className="mt-4 inline-block rounded-xl bg-navy px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-navy/20">
            View Draft Board
          </Link>
        </Card>
      )}

      {/* ─── Main Grid: Standings + Right Column ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  {dataLeague.season} {isInSeason ? "Standings" : "Final Standings"}
                </h2>
                <p className="text-xs text-text-muted">{standings.length} teams &middot; {totalPF.toFixed(0)} total points</p>
              </div>
              <Link href="/standings" className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary">
                Full Standings
              </Link>
            </div>
            <div className="stagger-children">
              {standings.map((entry) => {
                const pctBar = entry.pointsFor > 0 ? Math.round((entry.pointsFor / (standings[0]?.pointsFor || 1)) * 100) : 0;
                return (
                  <Link key={entry.rosterId} href={`/rosters/${entry.rosterId}`} className="flex items-center gap-3 border-b border-border-light px-5 py-3.5 transition-colors last:border-b-0 hover:bg-surface/50">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${entry.rank === 1 ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-200" : entry.rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" : entry.rank === 3 ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white" : entry.rank <= 6 ? "bg-navy/10 text-navy" : "bg-surface text-text-muted"}`}>
                      {entry.rank}
                    </span>
                    {entry.avatar ? (
                      <Image src={getSleeperAvatarUrl(entry.avatar)} alt={entry.displayName} width={36} height={36} className="rounded-full ring-2 ring-white" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-surface ring-2 ring-white" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{entry.teamName}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface">
                          <div className="h-full rounded-full bg-gradient-to-r from-navy/60 to-steel/60" style={{ width: `${pctBar}%` }} />
                        </div>
                        <span className="tabular shrink-0 text-[10px] font-medium text-text-muted">{entry.pointsFor.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-sm font-bold text-text-primary">{entry.wins}-{entry.losses}{entry.ties > 0 && `-${entry.ties}`}</p>
                      {entry.streak && (
                        <span className={`text-[10px] font-semibold ${entry.streak.includes("W") ? "text-emerald-500" : "text-red-400"}`}>{entry.streak}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {isOffseason && dataLeague.status === "complete" && championEntry && (
            <Card className="relative overflow-hidden border-amber-200/50 bg-gradient-to-br from-amber-50 to-white">
              <div className="absolute right-3 top-3 text-3xl opacity-20">&#x1F3C6;</div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70">{dataLeague.season} Champion</p>
              <div className="mt-2 flex items-center gap-3">
                {championEntry.avatar ? (
                  <Image src={getSleeperAvatarUrl(championEntry.avatar)} alt={championEntry.displayName} width={40} height={40} className="rounded-full ring-2 ring-amber-300" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-amber-100" />
                )}
                <div>
                  <p className="text-base font-bold text-text-primary">{championEntry.teamName}</p>
                  <p className="text-xs text-text-muted">{championEntry.wins}-{championEntry.losses} &middot; {championEntry.pointsFor.toFixed(1)} PF</p>
                </div>
              </div>
              {runnerUpEntry && (
                <div className="mt-3 flex items-center gap-2 border-t border-amber-200/40 pt-3">
                  <span className="text-[10px] font-medium text-text-muted">Runner-Up:</span>
                  <span className="text-xs font-semibold text-text-secondary">{runnerUpEntry.teamName}</span>
                </div>
              )}
            </Card>
          )}

          {isOffseason && (
            <Card padding="none">
              <div className="border-b border-border/50 px-5 py-4">
                <h2 className="text-base font-bold text-text-primary">Key Dates</h2>
                <p className="text-xs text-text-muted">{currentLeague.season} season milestones</p>
              </div>
              <div className="divide-y divide-border-light">
                {LEAGUE_MILESTONES.map((m) => (
                  <div key={m.label} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
                      {MILESTONE_ICONS[m.icon] || <HiCalendarDays className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">{m.label}</p>
                      <p className="text-xs text-text-muted">{m.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card padding="none">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <h2 className="text-base font-bold text-text-primary">Recent Activity</h2>
              <Link href="/transactions" className="text-xs font-semibold text-steel hover:text-steel-light">All</Link>
            </div>
            <div className="divide-y divide-border-light">
              {recentTransactions.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-text-muted">No recent transactions</p>
              ) : (
                recentTransactions.map((txn) => {
                  const roster = rosterToUser.get(txn.roster_ids[0]);
                  const managerName = roster?.display_name || roster?.username || "Unknown";
                  const typeLabel = txn.type === "trade" ? "Trade" : txn.type === "waiver" ? "Waiver" : txn.type === "free_agent" ? "FA" : "Commish";
                  const typeColor = txn.type === "trade" ? "bg-indigo-50 text-indigo-700" : txn.type === "waiver" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
                  const addedPlayers = txn.adds ? Object.keys(txn.adds).map((id) => { const p = getPlayerInfo(players, id); return { name: p ? `${p.first_name} ${p.last_name}` : id, position: p?.position || "?", team: p?.team || "FA" }; }) : [];
                  const droppedPlayers = txn.drops ? Object.keys(txn.drops).map((id) => { const p = getPlayerInfo(players, id); return { name: p ? `${p.first_name} ${p.last_name}` : id, position: p?.position || "?", team: p?.team || "FA" }; }) : [];

                  return (
                    <div key={txn.transaction_id} className="flex items-start gap-3 px-5 py-3.5">
                      <span className={`mt-0.5 inline-flex w-14 shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${typeColor}`}>{typeLabel}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary">{managerName}</p>
                        <div className="mt-1 space-y-0.5 text-xs">
                          {addedPlayers.map((p, i) => (
                            <div key={`add-${i}`} className="inline-flex items-center gap-1 mr-2">
                              <span className="font-semibold text-emerald-600">+</span>
                              <span className={`text-[9px] font-bold ${POSITION_COLORS[p.position] || "text-text-muted"}`}>{p.position}</span>
                              <span className="font-medium text-emerald-600">{p.name}</span>
                              <span className="text-text-muted/60">{p.team}</span>
                            </div>
                          ))}
                          {droppedPlayers.map((p, i) => (
                            <div key={`drop-${i}`} className="inline-flex items-center gap-1 mr-2">
                              <span className="font-semibold text-red-400">-</span>
                              <span className={`text-[9px] font-bold ${POSITION_COLORS[p.position] || "text-text-muted"}`}>{p.position}</span>
                              <span className="font-medium text-red-400">{p.name}</span>
                              <span className="text-text-muted/60">{p.team}</span>
                            </div>
                          ))}
                          {txn.type === "trade" && txn.draft_picks.length > 0 && (
                            <p className="text-text-muted">+{txn.draft_picks.length} pick{txn.draft_picks.length > 1 ? "s" : ""}</p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] text-text-muted">{formatDistanceToNow(txn.status_updated, { addSuffix: true })}</span>
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
