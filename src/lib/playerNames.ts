import type { Player } from '@/types';
import displayMaps from '@/data/playerDisplayNames.json';

const BY_ID: Record<number, string> = Object.fromEntries(
  Object.entries(displayMaps.byId).map(([k, v]) => [Number(k), v])
);

const BY_EXACT: Record<string, string> = displayMaps.byExact;

export function displayName(player: Pick<Player, 'id' | 'name' | 'basePlayerId'>): string {
  const id = player.basePlayerId ?? player.id;
  return BY_ID[id] ?? BY_ID[player.id] ?? BY_EXACT[player.name] ?? player.name;
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

/**
 * Formats a player's name for the FIFA 16 horizontal nameplate bar.
 * Preserves multi-word surnames/known names ("van Dijk", "Vini Jr", "Roberto Carlos",
 * "De Bruyne", "van Basten", "Xabi Alonso") while stripping abbreviated initial
 * prefixes like "K. Mbappé" → "Mbappé" or "J. Bellingham" → "Bellingham".
 */
export function formatCardName(player: Pick<Player, 'id' | 'name' | 'basePlayerId'>): string {
  const raw = displayName(player).trim();
  // Strip leading initial(s) like "K. ", "J. M. ", "M.-A. "
  const withoutInitials = raw.replace(/^(?:[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]?\.[\s-]*)+/, '').trim();
  return withoutInitials || raw;
}

