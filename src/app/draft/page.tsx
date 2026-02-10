"use client";

import { useState, useEffect } from "react";
import { getLeagueDrafts, getDraftPicks, getUsers, getRosters } from "@/lib/sleeper";
import type { SleeperDraft, SleeperDraftPick } from "@/lib/sleeper/types";
import { Card, PageHeader, PositionBadge } from "@/components/ui";

export default function DraftPage() {
  const [season, setSeason] = useState("2025");
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<SleeperDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<SleeperDraft | null>(null);
  const [picks, setPicks] = useState<SleeperDraftPick[]>([]);
  const [teamNames, setTeamNames] = useState<Record<number, string>>({});

  // Season to league ID mapping
  const seasonLeagueMap: Record<string, string> = {
    "2023": "917492438267305984",
    "2024": "1048246044892524544",
    "2025": "1180278386412273664",
    "2026": "1313306806897881088",
  };

  useEffect(() => {
    async function fetchDraftData() {
      try {
        setLoading(true);
        const leagueId = seasonLeagueMap[season];
        if (!leagueId) return;

        const [draftsData, users, rosters] = await Promise.all([
          getLeagueDrafts(leagueId),
          getUsers(leagueId),
          getRosters(leagueId),
        ]);

        setDrafts(draftsData);

        // Build team name map
        const nameMap: Record<number, string> = {};
        for (const roster of rosters) {
          const user = users.find((u) => u.user_id === roster.owner_id);
          nameMap[roster.roster_id] =
            user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`;
        }
        setTeamNames(nameMap);

        // Auto-select first draft
        if (draftsData.length > 0) {
          const draft = draftsData[0];
          setSelectedDraft(draft);
          const picksData = await getDraftPicks(draft.draft_id);
          setPicks(picksData);
        } else {
          setSelectedDraft(null);
          setPicks([]);
        }
      } catch (error) {
        console.error("Error fetching draft data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDraftData();
  }, [season]);

  async function handleDraftChange(draftId: string) {
    const draft = drafts.find((d) => d.draft_id === draftId);
    if (!draft) return;

    setSelectedDraft(draft);
    setLoading(true);
    try {
      const picksData = await getDraftPicks(draftId);
      setPicks(picksData);
    } catch (error) {
      console.error("Error fetching picks:", error);
    } finally {
      setLoading(false);
    }
  }

  function getPositionColor(position: string): string {
    if (position === "QB") return "bg-red-50";
    if (position === "RB") return "bg-green-50";
    if (position === "WR") return "bg-blue-50";
    if (position === "TE") return "bg-purple-50";
    return "bg-gray-50";
  }

  // Organize picks into grid
  const rounds = selectedDraft?.settings.rounds || 0;
  const teams = selectedDraft?.settings.teams || 0;
  const picksByRoundAndSlot: Record<number, Record<number, SleeperDraftPick>> = {};

  for (const pick of picks) {
    if (!picksByRoundAndSlot[pick.round]) {
      picksByRoundAndSlot[pick.round] = {};
    }
    picksByRoundAndSlot[pick.round][pick.draft_slot] = pick;
  }

  // Calculate position breakdown
  const positionCounts: Record<string, number> = {};
  for (const pick of picks) {
    const pos = pick.metadata?.position || "Unknown";
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Draft" subtitle="Loading..." />
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
      <PageHeader title="Draft" subtitle={`${season} Season`} />

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

      {/* Draft Selector (if multiple drafts) */}
      {drafts.length > 1 && (
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-text-secondary">
            Select Draft:
          </label>
          <div className="flex gap-2">
            {drafts.map((draft) => (
              <button
                key={draft.draft_id}
                onClick={() => handleDraftChange(draft.draft_id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  selectedDraft?.draft_id === draft.draft_id
                    ? "bg-navy text-white shadow-lg shadow-navy/20"
                    : "bg-white text-text-muted ring-1 ring-border hover:text-text-primary hover:ring-steel"
                }`}
              >
                {draft.type === "snake" ? "Snake" : draft.type} Draft
              </button>
            ))}
          </div>
        </div>
      )}

      {!selectedDraft || picks.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <div className="mb-2 text-4xl">📋</div>
            <div className="mb-1 text-sm font-bold text-text-primary">No Draft Data</div>
            <div className="text-xs text-text-muted">
              {drafts.length === 0
                ? "No drafts found for this season"
                : "No picks available for this draft"}
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Position Breakdown */}
          <Card className="mb-6">
            <div className="mb-3 text-sm font-bold text-navy">Position Breakdown</div>
            <div className="flex flex-wrap gap-4">
              {Object.entries(positionCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([pos, count]) => (
                  <div key={pos} className="flex items-center gap-2">
                    <PositionBadge position={pos} />
                    <span className="text-sm font-bold text-text-primary">{count}</span>
                  </div>
                ))}
            </div>
          </Card>

          {/* Draft Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header Row - Team Names */}
              <div className="mb-2 grid gap-1" style={{ gridTemplateColumns: `60px repeat(${teams}, 1fr)` }}>
                <div className="text-xs font-bold text-text-muted"></div>
                {Array.from({ length: teams }, (_, slot) => {
                  const rosterId = selectedDraft?.slot_to_roster_id?.[String(slot + 1)];
                  const teamName = rosterId ? teamNames[rosterId] : `Slot ${slot + 1}`;
                  return (
                    <div key={slot} className="truncate text-center text-[10px] font-bold text-text-secondary">
                      {teamName}
                    </div>
                  );
                })}
              </div>

              {/* Rounds */}
              {Array.from({ length: rounds }, (_, roundIdx) => {
                const round = roundIdx + 1;
                return (
                  <div
                    key={round}
                    className="mb-1 grid gap-1"
                    style={{ gridTemplateColumns: `60px repeat(${teams}, 1fr)` }}
                  >
                    {/* Round Label */}
                    <div className="flex items-center justify-center rounded-lg bg-surface">
                      <div className="text-[10px] font-bold text-text-muted">Rd {round}</div>
                    </div>

                    {/* Picks */}
                    {Array.from({ length: teams }, (_, slotIdx) => {
                      const slot = slotIdx + 1;
                      const pick = picksByRoundAndSlot[round]?.[slot];

                      if (!pick) {
                        return (
                          <div key={slot} className="rounded-lg bg-surface p-1.5">
                            <div className="text-center text-[10px] text-text-muted">-</div>
                          </div>
                        );
                      }

                      const position = pick.metadata?.position || "?";
                      const firstName = pick.metadata?.first_name || "";
                      const lastName = pick.metadata?.last_name || "";
                      const team = pick.metadata?.team || "";

                      return (
                        <div
                          key={slot}
                          className={`rounded-lg p-1.5 ${getPositionColor(position)}`}
                        >
                          <div className="mb-0.5 flex items-center justify-between gap-1">
                            <PositionBadge position={position} />
                            <span className="text-[9px] text-text-muted">{team}</span>
                          </div>
                          <div className="truncate text-[10px] font-bold text-text-primary">
                            {firstName.charAt(0)}. {lastName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
