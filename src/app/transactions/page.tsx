"use client";

import { useState, useEffect } from "react";
import { Card, PageHeader } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";

interface PlayerInfo {
  name: string;
  position: string;
  team: string;
  rosterId: number;
}

interface TransactionDisplay {
  transaction_id: string;
  type: "trade" | "waiver" | "free_agent" | "commissioner";
  status_updated: number;
  managerName: string;
  managerNames: string[];
  addedPlayers: PlayerInfo[];
  droppedPlayers: PlayerInfo[];
  draftPicks: { label: string; rosterId: number }[];
  waiverBid: number | null;
  tradeSides: {
    name: string;
    receives: { players: PlayerInfo[]; picks: string[] };
  }[];
}

const INITIAL_LIMIT = 25;
const LOAD_MORE_COUNT = 25;

const POSITION_COLORS: Record<string, string> = {
  QB: "text-pos-qb",
  RB: "text-pos-rb",
  WR: "text-pos-wr",
  TE: "text-pos-te",
  K: "text-pos-k",
  DEF: "text-pos-def",
};

function PlayerTag({ player, prefix }: { player: PlayerInfo; prefix: "+" | "-" }) {
  const color = prefix === "+" ? "text-emerald-600" : "text-red-400";
  const posColor = POSITION_COLORS[player.position] || "text-text-muted";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`font-semibold ${color}`}>{prefix}</span>
      <span className={`text-[9px] font-bold ${posColor}`}>{player.position}</span>
      <span className={`font-medium ${color}`}>{player.name}</span>
      <span className="text-text-muted/60">{player.team}</span>
    </span>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);
  const [filter, setFilter] = useState<
    "all" | "trade" | "waiver" | "free_agent"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
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

        const [leagueRes, usersRes, rostersRes, playersRes] =
          await Promise.all([
            fetch(`https://api.sleeper.app/v1/league/${leagueId}`),
            fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`),
            fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
            fetch("https://api.sleeper.app/v1/players/nfl"),
          ]);

        const [league, users, rosters, players] = await Promise.all([
          leagueRes.json(),
          usersRes.json(),
          rostersRes.json(),
          playersRes.json(),
        ]);

        setSeason(league.season);

        const userMap = new Map(
          users.map(
            (u: {
              user_id: string;
              display_name?: string;
              username?: string;
            }) => [u.user_id, u]
          )
        );
        const rosterToUser = new Map(
          rosters.map((r: { roster_id: number; owner_id: string }) => [
            r.roster_id,
            userMap.get(r.owner_id),
          ])
        );

        function getPlayerData(id: string): { name: string; position: string; team: string } {
          const p = players[id];
          if (!p) return { name: `Player ${id}`, position: "?", team: "" };
          return {
            name: `${p.first_name} ${p.last_name}`,
            position: p.position || "?",
            team: p.team || "FA",
          };
        }

        function getManagerName(rosterId: number): string {
          const user = rosterToUser.get(rosterId) as
            | { display_name?: string; username?: string }
            | undefined;
          return user?.display_name || user?.username || "Unknown";
        }

        const totalWeeks = 18;
        const weekPromises = Array.from({ length: totalWeeks }, (_, i) =>
          fetch(
            `https://api.sleeper.app/v1/league/${leagueId}/transactions/${i + 1}`
          )
            .then((r) => r.json())
            .catch(() => [])
        );
        const allWeeks = await Promise.all(weekPromises);
        const allTxns = allWeeks
          .flat()
          .filter((t: { status: string }) => t.status === "complete")
          .sort(
            (
              a: { status_updated: number },
              b: { status_updated: number }
            ) => b.status_updated - a.status_updated
          );

        const displayTxns: TransactionDisplay[] = allTxns.map(
          (txn: {
            transaction_id: string;
            type: "trade" | "waiver" | "free_agent" | "commissioner";
            status_updated: number;
            roster_ids: number[];
            adds: Record<string, number> | null;
            drops: Record<string, number> | null;
            draft_picks: {
              season: string;
              round: number;
              owner_id: number;
            }[];
            settings: { waiver_bid?: number } | null;
          }) => {
            const managerName = getManagerName(txn.roster_ids[0]);
            const managerNames = txn.roster_ids.map(getManagerName);

            const addedPlayers: PlayerInfo[] = txn.adds
              ? Object.entries(txn.adds).map(([id, rId]) => {
                  const data = getPlayerData(id);
                  return { ...data, rosterId: rId };
                })
              : [];

            const droppedPlayers: PlayerInfo[] = txn.drops
              ? Object.entries(txn.drops).map(([id, rId]) => {
                  const data = getPlayerData(id);
                  return { ...data, rosterId: rId };
                })
              : [];

            const draftPicks = txn.draft_picks.map((pick) => ({
              label: `${pick.season} Rd ${pick.round}`,
              rosterId: pick.owner_id,
            }));

            const waiverBid = txn.settings?.waiver_bid ?? null;

            const tradeSides: TransactionDisplay["tradeSides"] = [];
            if (txn.type === "trade") {
              for (const rId of txn.roster_ids) {
                const name = getManagerName(rId);
                const playerAdds = addedPlayers.filter((p) => p.rosterId === rId);
                const pickAdds = draftPicks
                  .filter((p) => p.rosterId === rId)
                  .map((p) => p.label + " Pick");
                tradeSides.push({
                  name,
                  receives: { players: playerAdds, picks: pickAdds },
                });
              }
            }

            return {
              transaction_id: txn.transaction_id,
              type: txn.type,
              status_updated: txn.status_updated,
              managerName,
              managerNames,
              addedPlayers,
              droppedPlayers,
              draftPicks,
              waiverBid,
              tradeSides,
            };
          }
        );

        setTransactions(displayTxns);
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const searchLower = searchQuery.toLowerCase().trim();

  const filteredTxns = transactions.filter((t) => {
    // Type filter
    if (filter !== "all" && t.type !== filter) return false;
    // Search filter
    if (searchLower) {
      const allPlayers = [...t.addedPlayers, ...t.droppedPlayers];
      const matchesPlayer = allPlayers.some((p) =>
        p.name.toLowerCase().includes(searchLower)
      );
      const matchesManager = t.managerNames.some((n) =>
        n.toLowerCase().includes(searchLower)
      );
      if (!matchesPlayer && !matchesManager) return false;
    }
    return true;
  });

  const visibleTxns = filteredTxns.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTxns.length;

  const typeCounts = {
    all: transactions.length,
    trade: transactions.filter((t) => t.type === "trade").length,
    waiver: transactions.filter((t) => t.type === "waiver").length,
    free_agent: transactions.filter((t) => t.type === "free_agent").length,
  };

  return (
    <div>
      <PageHeader
        title="Activity"
        subtitle={
          season
            ? `${season} Season — ${transactions.length} transactions`
            : "Loading..."
        }
      />

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search players or managers..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(INITIAL_LIMIT);
            }}
            className="w-full rounded-xl border border-border bg-white px-4 py-2.5 pl-9 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
          />
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted hover:text-text-primary"
            >
              Clear
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-xs text-text-muted">
            Showing {filteredTxns.length} transaction{filteredTxns.length !== 1 ? "s" : ""} matching &ldquo;{searchQuery}&rdquo;
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(
          [
            { key: "all", label: "All" },
            { key: "trade", label: "Trades" },
            { key: "waiver", label: "Waivers" },
            { key: "free_agent", label: "Free Agents" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setVisibleCount(INITIAL_LIMIT);
            }}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
              filter === f.key
                ? "bg-navy text-white shadow-lg shadow-navy/20"
                : "bg-white text-text-muted ring-1 ring-border hover:ring-steel hover:text-text-primary"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-60">{typeCounts[f.key]}</span>
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <div className="h-16 animate-pulse rounded-xl bg-surface" />
            </Card>
          ))}
        </div>
      ) : filteredTxns.length === 0 ? (
        <Card>
          <p className="py-12 text-center text-sm text-text-muted">
            No transactions found
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="divide-y divide-border-light">
            {visibleTxns.map((txn) => (
              <TransactionRow key={txn.transaction_id} txn={txn} />
            ))}
          </div>

          {hasMore && (
            <div className="border-t border-border-light px-5 py-4 text-center">
              <button
                onClick={() => setVisibleCount((c) => c + LOAD_MORE_COUNT)}
                className="rounded-xl bg-surface px-6 py-2.5 text-xs font-bold text-text-secondary transition-all hover:bg-surface-hover hover:text-text-primary"
              >
                Show More ({filteredTxns.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function TransactionRow({ txn }: { txn: TransactionDisplay }) {
  const typeConfig = {
    trade: { label: "Trade", color: "bg-indigo-50 text-indigo-700" },
    waiver: { label: "Waiver", color: "bg-amber-50 text-amber-700" },
    free_agent: { label: "FA", color: "bg-emerald-50 text-emerald-700" },
    commissioner: { label: "Commish", color: "bg-gray-50 text-gray-700" },
  };

  const config = typeConfig[txn.type] || typeConfig.commissioner;

  if (txn.type === "trade") {
    return (
      <div className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex w-14 shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-indigo-50 text-indigo-700">
            Trade
          </span>
          <span className="text-xs font-medium text-text-secondary">
            {txn.managerNames.join(" ↔ ")}
          </span>
          <span className="ml-auto text-[10px] text-text-muted">
            {formatDistanceToNow(txn.status_updated, { addSuffix: true })}
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {txn.tradeSides.map((side) => (
            <div key={side.name} className="rounded-lg bg-surface/70 p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {side.name} receives
              </p>
              <div className="space-y-1 text-xs">
                {side.receives.players.map((p, i) => (
                  <div key={i}>
                    <PlayerTag player={p} prefix="+" />
                  </div>
                ))}
                {side.receives.picks.map((p, i) => (
                  <p key={i} className="font-medium text-steel">
                    + {p}
                  </p>
                ))}
                {side.receives.players.length === 0 &&
                  side.receives.picks.length === 0 && (
                    <p className="text-text-muted">(nothing listed)</p>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Waiver / FA / Commissioner
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <span
        className={`mt-0.5 inline-flex w-14 shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${config.color}`}
      >
        {config.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">
          {txn.managerName}
        </p>
        <div className="mt-1 space-y-0.5 text-xs">
          {txn.addedPlayers.map((p, i) => (
            <div key={`add-${i}`}>
              <PlayerTag player={p} prefix="+" />
            </div>
          ))}
          {txn.droppedPlayers.map((p, i) => (
            <div key={`drop-${i}`}>
              <PlayerTag player={p} prefix="-" />
            </div>
          ))}
          {txn.waiverBid != null && txn.waiverBid > 0 && (
            <p className="text-text-muted">${txn.waiverBid} FAAB</p>
          )}
        </div>
      </div>
      <span className="shrink-0 text-[10px] text-text-muted">
        {formatDistanceToNow(txn.status_updated, { addSuffix: true })}
      </span>
    </div>
  );
}
