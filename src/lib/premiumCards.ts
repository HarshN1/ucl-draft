import type { Player } from '@/types';
import { isSpecialCard } from '@/lib/cardStyles';

/** Icons, heroes, legacy legends, and other special card types. */
export function isPremiumCard(player: Player): boolean {
  return isSpecialCard(player);
}

export function countPremiumPlayers(players: (Player | null)[]): number {
  return players.filter((p): p is Player => !!p && isPremiumCard(p)).length;
}

/**
 * FIFA draft never hard-caps icons/heroes — any pick can still roll them.
 * Odds just taper as your squad already has specials (≈half per card drafted).
 */
export function premiumHandChance(baseChance: number, alreadyDrafted: number): number {
  return baseChance * Math.pow(0.5, alreadyDrafted);
}
