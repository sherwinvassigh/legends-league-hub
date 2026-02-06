export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  metadata: {
    team_name?: string;
    [key: string]: unknown;
  };
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  status: "pre_draft" | "drafting" | "in_season" | "complete";
  season: string;
  season_type: string;
  sport: string;
  total_rosters: number;
  previous_league_id: string | null;
  draft_id: string;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  settings: {
    num_teams: number;
    type: number;
    max_keepers: number;
    draft_rounds: number;
    playoff_teams: number;
    playoff_week_start: number;
    trade_deadline: number;
    waiver_type: number;
    waiver_budget: number;
    taxi_slots: number;
    reserve_slots: number;
    [key: string]: unknown;
  };
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  players: string[] | null;
  starters: string[] | null;
  reserve: string[] | null;
  taxi: string[] | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
    ppts?: number;
    ppts_decimal?: number;
    [key: string]: unknown;
  };
  metadata?: {
    streak?: string;
    record?: string;
    [key: string]: unknown;
  };
}

export interface SleeperMatchup {
  matchup_id: number;
  roster_id: number;
  players: string[];
  starters: string[];
  points: number;
  starters_points: number[];
  custom_points: number | null;
}

export interface SleeperTransaction {
  type: "trade" | "free_agent" | "waiver" | "commissioner";
  transaction_id: string;
  status: string;
  status_updated: number;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draft_picks: SleeperTradedPick[];
  creator: string;
  created: number;
  consenter_ids: number[];
  waiver_budget: Array<{
    sender: number;
    receiver: number;
    amount: number;
  }>;
  settings: {
    waiver_bid?: number;
    [key: string]: unknown;
  } | null;
  metadata?: Record<string, unknown>;
}

export interface SleeperTradedPick {
  season: string;
  round: number;
  roster_id: number;
  previous_owner_id: number;
  owner_id: number;
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string;
  type: string;
  status: string;
  season: string;
  settings: {
    rounds: number;
    pick_timer: number;
    teams: number;
    [key: string]: unknown;
  };
  draft_order: Record<string, number> | null;
  slot_to_roster_id: Record<string, number> | null;
}

export interface SleeperDraftPick {
  round: number;
  pick_no: number;
  roster_id: number;
  player_id: string;
  picked_by: string;
  draft_slot: number;
  metadata: {
    first_name: string;
    last_name: string;
    position: string;
    team: string;
    [key: string]: unknown;
  };
}

export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  position: string;
  team: string | null;
  age?: number;
  years_exp?: number;
  status?: string;
  injury_status?: string;
  number?: number;
  weight?: string;
  height?: string;
  college?: string;
  fantasy_positions?: string[];
}

export interface SleeperBracketMatchup {
  r: number;
  m: number;
  t1: number | { w?: number; l?: number };
  t2: number | { w?: number; l?: number };
  w: number | null;
  l: number | null;
  p?: number; // Placement position this game decides (1=championship, 3=3rd place, 5=5th place)
  t1_from?: { w?: number; l?: number };
  t2_from?: { w?: number; l?: number };
}

export interface SleeperState {
  season: string;
  season_type: string;
  week: number;
  display_week: number;
  leg: number;
  season_start_date: string;
  league_season: string;
  league_create_season: string;
}

export interface LeagueSeasonData {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
}
