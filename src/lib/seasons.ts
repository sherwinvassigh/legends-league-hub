/**
 * Known league ID chain for L.E.G.E.N.D.S.
 * Order: newest to oldest. The app uses this to build the season selector.
 * When a new Sleeper season is created, add its ID here.
 */
export interface SeasonInfo {
  season: string;
  leagueId: string;
  status: "complete" | "in_season" | "pre_draft" | "drafting";
}

// This will be populated at runtime from the Sleeper API.
// We start from the current league ID and chain backwards via previous_league_id.
export const CURRENT_LEAGUE_ID = "1313306806897881088";
