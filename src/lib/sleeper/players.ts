import type { SleeperPlayer } from "./types";

let cachedPlayers: Record<string, SleeperPlayer> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getPlayers(): Promise<Record<string, SleeperPlayer>> {
  const now = Date.now();
  if (cachedPlayers && now - cacheTimestamp < CACHE_TTL) {
    return cachedPlayers;
  }

  const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch players: ${res.status}`);
  }

  cachedPlayers = await res.json();
  cacheTimestamp = now;
  return cachedPlayers!;
}

export function getPlayerName(
  players: Record<string, SleeperPlayer>,
  playerId: string
): string {
  const player = players[playerId];
  if (!player) return playerId;
  return player.full_name || `${player.first_name} ${player.last_name}`;
}

export function getPlayerInfo(
  players: Record<string, SleeperPlayer>,
  playerId: string
): SleeperPlayer | null {
  return players[playerId] || null;
}
