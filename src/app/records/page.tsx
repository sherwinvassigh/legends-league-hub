"use client";

import { useState } from "react";
import { Card, PageHeader } from "@/components/ui";

type TabType = "trophies" | "all-time" | "records" | "awards" | "h2h";

export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("trophies");

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "trophies", label: "Trophy Vault", icon: "🏆" },
    { id: "all-time", label: "All-Time Standings", icon: "📊" },
    { id: "records", label: "League Records", icon: "🎯" },
    { id: "awards", label: "Season Awards", icon: "🏅" },
    { id: "h2h", label: "Head-to-Head", icon: "⚔️" },
  ];

  return (
    <div>
      <PageHeader title="Records" subtitle="League History & Achievements" />

      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === tab.id
                ? "bg-navy text-white shadow-lg shadow-navy/20"
                : "bg-white text-text-muted ring-1 ring-border hover:text-text-primary hover:ring-steel"
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Placeholder Content */}
      <Card>
        <div className="py-16 text-center">
          <div className="mb-4 text-6xl">{tabs.find(t => t.id === activeTab)?.icon}</div>
          <div className="mb-2 text-xl font-extrabold text-navy">
            {tabs.find(t => t.id === activeTab)?.label}
          </div>
          <div className="text-sm text-text-muted">
            Historical records and statistics coming soon
          </div>
          <div className="mt-4 text-xs text-text-muted">
            This page will display comprehensive league history including champions,
            all-time standings, league records, season awards, and head-to-head matchups.
          </div>
        </div>
      </Card>
    </div>
  );
}
