/**
 * Key League Milestones
 *
 * Static dates and milestones from the constitution, shown on the homepage
 * during the offseason as FYI/upcoming info.
 */

export interface Milestone {
  label: string;
  description: string;
  icon: string;
  /** Approximate month (for ordering) */
  month: number;
}

export const LEAGUE_MILESTONES: Milestone[] = [
  {
    label: "Rookie Draft",
    description: "4-round linear rookie draft on Sleeper",
    icon: "draft",
    month: 5,
  },
  {
    label: "Dues Deadline",
    description: "$50 entry fee due before Week 1 via LeagueSafe",
    icon: "money",
    month: 8,
  },
  {
    label: "Regular Season",
    description: "Weeks 1-14 — H2H + league median scoring",
    icon: "play",
    month: 9,
  },
  {
    label: "Trade Deadline",
    description: "All trades must be completed by Week 12",
    icon: "deadline",
    month: 11,
  },
  {
    label: "Playoffs",
    description: "Weeks 15-17 — Top 6 teams, top 2 get byes",
    icon: "trophy",
    month: 12,
  },
  {
    label: "Offseason",
    description: "Free agency opens, taxi squad management",
    icon: "calendar",
    month: 1,
  },
];
