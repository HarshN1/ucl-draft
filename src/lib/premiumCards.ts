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
 * FIFA 16 Draft never hard-caps Icons/Specials — any pick can still roll them.
 * Odds taper gently as your squad accumulates specials so a typical 23-man
 * draft finishes with ~4–7 Special cards and ~16–19 Base Gold cards.
 */
export function premiumHandChance(baseChance: number, alreadyDrafted: number): number {
  const tapered = baseChance * Math.pow(0.76, alreadyDrafted);
  return Math.max(baseChance * 0.18, tapered);
}
