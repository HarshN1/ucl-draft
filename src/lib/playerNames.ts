import type { Player } from '@/types';
import displayMaps from '@/data/playerDisplayNames.json';

const BY_ID: Record<number, string> = Object.fromEntries(
  Object.entries(displayMaps.byId).map(([k, v]) => [Number(k), v])
);

const BY_EXACT: Record<string, string> = displayMaps.byExact;

export function displayName(player: Pick<Player, 'id' | 'name' | 'basePlayerId'>): string {
  const id = player.basePlayerId ?? player.id;
  if (BY_ID[id]) return BY_ID[id];
  if (BY_ID[player.id]) return BY_ID[player.id];
  if (BY_EXACT[player.name]) return BY_EXACT[player.name];
  return player.name;
}

export function withDisplayName(player: Player): Player {
  const name = displayName(player);
  return name === player.name ? player : { ...player, name };
}

/** Apply display names to a player record (for build scripts). */
export function applyDisplayNameToRecord<T extends Pick<Player, 'id' | 'name' | 'basePlayerId'>>(
  player: T
): T {
  const name = displayName(player);
  return name === player.name ? player : { ...player, name };
}
