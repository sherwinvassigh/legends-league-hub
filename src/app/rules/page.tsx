"use client";

import { useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { HiChevronDown } from "react-icons/hi2";

interface RuleSection {
  id: string;
  title: string;
  content: string[];
}

const RULES: RuleSection[] = [
  {
    id: "overview",
    title: "League Overview",
    content: [
      "League Name: L.E.G.E.N.D.S. (League of Extraordinary Gentlemen Excelling in NFL Dynasty Success)",
      "Platform: Sleeper",
      "Format: 10-team Superflex TE-Premium Dynasty",
      "Established: 2023",
    ],
  },
  {
    id: "financials",
    title: "Financial Structure",
    content: [
      "Entry Fee: $50 annually with 1-season deposit held for continuity",
      "Payment Method: LeagueSafe (includes service fee; $10 late payment penalty)",
      "Payouts: 1st Place 60% ($300), 2nd Place 30% ($150), 3rd Place 10% ($50)",
    ],
  },
  {
    id: "roster",
    title: "Roster Configuration",
    content: [
      "Total Spots: 25 (10 starters, 15 bench, 5 IR, 3 Taxi)",
      "Lineup: 1 QB, 2 RB, 3 WR, 1 TE, 1 Superflex (QB/RB/WR/TE), 2 Flex (RB/WR/TE)",
      "Taxi Squad: Available after 2024 season for up to 3 eligible rookies with 2-season eligibility limit",
    ],
  },
  {
    id: "scoring",
    title: "Scoring System",
    content: [
      "Format: Half-PPR TE-Premium",
      "TE Receiving: 1.0 PPR",
      "Other Positions: 0.5 PPR",
      "Passing TD: 4 points",
      "Receiving/Rushing TD: 6 points",
      "Passing Yards: 1 point per 25 yards",
      "Receiving/Rushing Yards: 1 point per 10 yards",
      "Interception/Fumble Lost: -1 point",
    ],
  },
  {
    id: "schedule",
    title: "Schedule",
    content: [
      "Regular Season: Weeks 1-14 (head-to-head + league median matchups)",
      "Playoffs: Weeks 15-17 (6 teams, top 2 seeds earn byes, re-seeded each round)",
      "Consolation: Toilet Bowl for non-playoff teams",
    ],
  },
  {
    id: "waivers",
    title: "Free Agency & Waivers",
    content: [
      "System: FAAB (Free Agent Acquisition Budget) of $100 per season",
      "Waiver Periods: 1-day in-season lockout after player games; offseason waivers clear Tuesdays",
      "Tiebreaker: Continuous rolling list when bids match",
      "Trade Deadline: Window closes end of Week 12; no trades Weeks 13-17",
    ],
  },
  {
    id: "trades",
    title: "Trade Rules",
    content: [
      "Processed immediately with retroactive Commissioner review",
      "Advanced draft pick trades require entry fee payment within 1 day",
      "Picks tradable up to 3 seasons forward",
      "No conditional trades",
      "No player can return to original owner for 1 year",
      "Anti-competitive trades subject to veto with public explanation",
    ],
  },
  {
    id: "draft",
    title: "Draft Structure",
    content: [
      "Startup Draft (2023): 25-round snake format with third-round reversal (90 seconds per pick)",
      "Annual Rookie Drafts: 4-round linear format held late May (5 minutes per pick)",
      'Draft Order: Inverse of teams\' "Max PF" (maximum points for) from prior regular season',
    ],
  },
  {
    id: "ir",
    title: "Injured Reserve & Roster Rules",
    content: [
      "IR Eligibility: Players designated IR or PUP by NFL teams only",
      "Soft Enforcement: Teams cannot add free agents or adjust lineups until roster is legal",
      "No Roster Cutdown Date: Cleanup required before Week 1",
    ],
  },
  {
    id: "integrity",
    title: "League Integrity Provisions",
    content: [
      "Anti-Competitive Conduct: Includes inactivity, collusion, intentionally weak trades, and tanking (not setting complete competitive lineups)",
      "Trade Veto Authority: Commissioner reviews all trades; majority of non-involved managers can override veto",
      "Penalties: Warnings for first offenses; subsequent violations may result in FAAB reduction, draft pick loss, trade suspension, or removal with fee forfeiture",
      "Illegal Lineups: Must advance competitive advantage; repeat intentional violations penalized",
    ],
  },
  {
    id: "ownership",
    title: "Ownership Changes",
    content: [
      "Retiring Managers: Must notify league early; deposit reimbursed if replacement found",
      "Orphan Teams: Commissioner manages until replacement identified (highest-projected lineups only, no trading/waivers)",
      "Dispersal Drafts: Available if multiple openings and league votes to continue; current managers can protect predetermined number of players",
    ],
  },
  {
    id: "amendments",
    title: "Rule Changes & Amendments",
    content: [
      "Voting Period: Held in May for managers in good standing",
      'Commissioner Proposals: Enacted unless 6 "NO" votes received',
      'Manager Suggestions: Require 6 "YES" votes to pass',
      "In-Season Changes: Require unanimous approval",
      "2024 Amendment: Added 3 Taxi Squad slots",
      "2024 Amendment: Removed OUT designation from IR eligibility",
      "2024 Amendment: Normalized FAAB budget to $100 (previously $1,000)",
      "2026 Proposed: League Trophy options and funding under consideration",
    ],
  },
];

function AccordionSection({
  section,
  index,
  defaultOpen,
}: {
  section: RuleSection;
  index: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border-light last:border-b-0" id={section.id}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface/50 sm:px-6"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-[10px] font-bold text-navy">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-bold text-text-primary">
          {section.title}
        </span>
        <HiChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pl-14 sm:px-6 sm:pl-[3.75rem]">
          <ul className="space-y-2.5">
            {section.content.map((line, i) => {
              const colonIdx = line.indexOf(":");
              const isAmendment =
                line.includes("Amendment") || line.includes("Proposed");
              if (colonIdx > 0 && colonIdx < 40) {
                const label = line.slice(0, colonIdx);
                const value = line.slice(colonIdx + 1).trim();
                return (
                  <li
                    key={i}
                    className={`text-[13px] leading-relaxed ${
                      isAmendment
                        ? "rounded-lg bg-amber-50 px-3 py-2"
                        : ""
                    }`}
                  >
                    <span className="font-semibold text-text-primary">
                      {label}:
                    </span>{" "}
                    <span className="text-text-secondary">{value}</span>
                  </li>
                );
              }
              return (
                <li
                  key={i}
                  className="text-[13px] leading-relaxed text-text-secondary"
                >
                  {line}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function RulesPage() {
  return (
    <div>
      <PageHeader
        title="League Constitution"
        subtitle="L.E.G.E.N.D.S. Official Rules & Bylaws"
      />

      {/* Table of contents */}
      <Card className="mb-8">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Jump to Section
        </p>
        <div className="flex flex-wrap gap-2">
          {RULES.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary transition-all hover:bg-navy hover:text-white hover:shadow-md hover:shadow-navy/10"
            >
              {section.title}
            </a>
          ))}
        </div>
      </Card>

      {/* Rules accordion — all expanded by default */}
      <Card padding="none">
        {RULES.map((section, i) => (
          <AccordionSection
            key={section.id}
            section={section}
            index={i}
            defaultOpen={true}
          />
        ))}
      </Card>
    </div>
  );
}
