"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, PageHeader } from "@/components/ui";
import { DUES_DATA } from "@/lib/config/dues";
import { HiCheckCircle, HiXCircle, HiClock } from "react-icons/hi2";

interface SleeperUserInfo {
  display_name: string;
  username: string;
  avatar: string | null;
  user_id: string;
}

function getSleeperAvatarUrl(avatarId: string): string {
  return `https://sleepercdn.com/avatars/thumbs/${avatarId}`;
}

export default function DuesPage() {
  const [selectedSeason, setSelectedSeason] = useState(
    DUES_DATA[DUES_DATA.length - 1]?.season || ""
  );
  const [avatarMap, setAvatarMap] = useState<
    Map<string, string | null>
  >(new Map());

  // Fetch Sleeper users to get avatars
  useEffect(() => {
    async function fetchAvatars() {
      try {
        // Walk the league chain to find the most recent active league
        let leagueId = "1313306806897881088";
        const leagueRes = await fetch(
          `https://api.sleeper.app/v1/league/${leagueId}`
        );
        const league = await leagueRes.json();
        if (league.status === "pre_draft" && league.previous_league_id) {
          leagueId = league.previous_league_id;
        }

        const usersRes = await fetch(
          `https://api.sleeper.app/v1/league/${leagueId}/users`
        );
        const users: SleeperUserInfo[] = await usersRes.json();

        const map = new Map<string, string | null>();
        for (const user of users) {
          // Map by both display_name and username for flexible matching
          if (user.display_name) {
            map.set(user.display_name.toLowerCase(), user.avatar);
          }
          if (user.username) {
            map.set(user.username.toLowerCase(), user.avatar);
          }
        }
        setAvatarMap(map);
      } catch (err) {
        console.error("Error fetching Sleeper avatars:", err);
      }
    }

    fetchAvatars();
  }, []);

  const seasonData = DUES_DATA.find((d) => d.season === selectedSeason);
  if (!seasonData) {
    return (
      <div>
        <PageHeader title="League Dues" subtitle="No dues data available" />
        <Card>
          <p className="py-8 text-center text-sm text-text-muted">
            Dues data has not been configured yet.
          </p>
        </Card>
      </div>
    );
  }

  const paidCount = seasonData.managers.filter((m) => m.paid).length;
  const totalManagers = seasonData.managers.length;
  const totalCollected = paidCount * seasonData.entryFee;
  const totalExpected = totalManagers * seasonData.entryFee;
  const pctPaid = totalManagers > 0 ? (paidCount / totalManagers) * 100 : 0;

  return (
    <div>
      <PageHeader
        title="League Dues"
        subtitle={`${selectedSeason} Season — via ${seasonData.paymentMethod}`}
      />

      {/* Season selector */}
      <div className="mb-6 flex gap-2">
        {DUES_DATA.map((d) => (
          <button
            key={d.season}
            onClick={() => setSelectedSeason(d.season)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              d.season === selectedSeason
                ? "bg-navy text-white shadow-lg shadow-navy/20"
                : "bg-white text-text-muted ring-1 ring-border hover:ring-steel hover:text-text-primary"
            }`}
          >
            {d.season}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Collection Progress
          </p>
          <div className="mt-2 flex items-end gap-2">
            <p className="text-2xl font-extrabold text-navy">
              {paidCount}/{totalManagers}
            </p>
            <p className="mb-0.5 text-xs text-text-muted">managers paid</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
              style={{ width: `${pctPaid}%` }}
            />
          </div>
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Collected / Expected
          </p>
          <div className="mt-2 flex items-end gap-2">
            <p className="tabular text-2xl font-extrabold text-text-primary">
              ${totalCollected}
            </p>
            <p className="tabular mb-0.5 text-xs text-text-muted">
              / ${totalExpected}
            </p>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            ${seasonData.entryFee} per team
          </p>
        </Card>

        <Card>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Payouts
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-secondary">
                🥇 1st Place
              </span>
              <span className="tabular font-bold text-text-primary">
                ${seasonData.payouts.first}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-secondary">
                🥈 2nd Place
              </span>
              <span className="tabular font-bold text-text-primary">
                ${seasonData.payouts.second}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-secondary">
                🥉 3rd Place
              </span>
              <span className="tabular font-bold text-text-primary">
                ${seasonData.payouts.third}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Manager payment table */}
      <Card padding="none">
        <div className="border-b border-border/50 px-5 py-4">
          <h2 className="text-base font-bold text-text-primary">
            Payment Status
          </h2>
          <p className="text-xs text-text-muted">
            Entry Fee: ${seasonData.entryFee} &middot; Late Penalty: $
            {seasonData.latePenalty} &middot; Deposit: ${seasonData.deposit}
          </p>
        </div>

        {/* Header row (desktop) */}
        <div className="hidden border-b border-border-light px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted sm:flex">
          <span className="flex-1">Manager</span>
          <span className="w-24 text-center">Entry Fee</span>
          <span className="w-24 text-center">Deposit</span>
          <span className="w-32 text-center">Date Paid</span>
          <span className="w-24 text-center">Notes</span>
        </div>

        <div className="divide-y divide-border-light">
          {seasonData.managers.map((manager) => {
            const avatarId = avatarMap.get(manager.displayName.toLowerCase());
            return (
              <div
                key={manager.displayName}
                className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-0"
              >
                {/* Manager name + avatar */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {avatarId ? (
                    <Image
                      src={getSleeperAvatarUrl(avatarId)}
                      alt={manager.displayName}
                      width={32}
                      height={32}
                      className="shrink-0 rounded-full ring-2 ring-white"
                    />
                  ) : (
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-white ${
                        manager.paid ? "bg-emerald-50" : "bg-amber-50"
                      }`}
                    >
                      <span className="text-xs font-bold text-text-muted">
                        {manager.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="truncate text-sm font-semibold text-text-primary">
                    {manager.displayName}
                  </span>
                </div>

                {/* Entry Fee status */}
                <div className="flex items-center gap-1 sm:w-24 sm:justify-center">
                  {manager.paid ? (
                    <HiCheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <HiXCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      manager.paid ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {manager.paid ? "Paid" : "Unpaid"}
                  </span>
                </div>

                {/* Deposit status */}
                <div className="flex items-center gap-1 sm:w-24 sm:justify-center">
                  {manager.depositPaid ? (
                    <HiCheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <HiClock className="h-4 w-4 text-amber-500" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      manager.depositPaid
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {manager.depositPaid ? "Yes" : "Pending"}
                  </span>
                </div>

                {/* Date paid */}
                <div className="sm:w-32 sm:text-center">
                  <span className="text-xs text-text-muted">
                    {manager.paidDate
                      ? new Date(manager.paidDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>

                {/* Notes */}
                <div className="sm:w-24 sm:text-center">
                  {manager.notes ? (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      {manager.notes}
                    </span>
                  ) : (
                    <span className="text-[10px] text-text-muted">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="mt-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          How This Works
        </p>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
          This page is manually updated by the commissioner when payments are
          received via LeagueSafe. Payment status, dates, and notes are tracked
          in the site&apos;s configuration file. If you believe your status is
          incorrect, contact the commissioner.
        </p>
      </Card>
    </div>
  );
}
