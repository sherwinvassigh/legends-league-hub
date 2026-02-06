"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface SeasonOption {
  season: string;
  leagueId: string;
  status: string;
}

interface SeasonContextType {
  seasons: SeasonOption[];
  currentSeason: string;
  currentLeagueId: string;
  setCurrentSeason: (season: string) => void;
  loading: boolean;
}

const SeasonContext = createContext<SeasonContextType>({
  seasons: [],
  currentSeason: "",
  currentLeagueId: "",
  setCurrentSeason: () => {},
  loading: true,
});

export function useSeasonContext() {
  return useContext(SeasonContext);
}

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [currentSeason, setCurrentSeason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function discoverSeasons() {
      try {
        const discovered: SeasonOption[] = [];
        let leagueId: string | null = "1313306806897881088";

        while (leagueId) {
          const res: Response = await fetch(
            `https://api.sleeper.app/v1/league/${leagueId}`
          );
          const league: { season: string; league_id: string; status: string; previous_league_id: string | null } = await res.json();
          discovered.push({
            season: league.season,
            leagueId: league.league_id,
            status: league.status,
          });
          leagueId = league.previous_league_id || null;
        }

        setSeasons(discovered);

        // Default to most recent completed season, or the latest season
        const completedSeason = discovered.find(
          (s) => s.status === "complete" || s.status === "in_season"
        );
        setCurrentSeason(
          completedSeason?.season || discovered[0]?.season || ""
        );
      } catch (err) {
        console.error("Error discovering seasons:", err);
      } finally {
        setLoading(false);
      }
    }

    discoverSeasons();
  }, []);

  const currentLeagueId =
    seasons.find((s) => s.season === currentSeason)?.leagueId || "";

  return (
    <SeasonContext.Provider
      value={{
        seasons,
        currentSeason,
        currentLeagueId,
        setCurrentSeason,
        loading,
      }}
    >
      {children}
    </SeasonContext.Provider>
  );
}
