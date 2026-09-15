import type { Player, Formation, Manager, DraftedPlayer } from '@/types';
import { MANAGERS } from '@/data/managers';
import type { BenchSubRole } from '@/constants/squadLayout';
import { BENCH_ROLE_POSITIONS } from '@/constants/squadLayout';
import { isInPosition, isExactPosition } from '@/engine/chemistryEngine';
import { premiumHandChance } from '@/lib/premiumCards';
import { isSpecialCard } from '@/lib/cardStyles';
import type { Rng } from '@/engine/rng';

// ─── Position mapping ─────────────────────────────────────────────────────────
// Maps a formation slot's positionGroup to acceptable player positions from DB.
// Falls back to broader groups if pool is sparse.

const POSITION_MAP: Record<string, string[]> = {
  GK: ['GK'],
  CB: ['CB', 'RWB', 'LWB'],
  FB: ['LB', 'RB', 'LWB', 'RWB'],
  CDM: ['CDM', 'CM', 'DM'],
  CM: ['CM', 'CDM', 'CAM'],
  CAM: ['CAM', 'LM', 'RM', 'CM'],
  WG: ['LW', 'RW', 'LM', 'RM', 'CAM'],
  ST: ['ST', 'CF', 'LW', 'RW'],
};

export function getAcceptablePositions(positionGroup: string): string[] {
  return POSITION_MAP[positionGroup] ?? ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM'];
}

// ─── Star weighting ───────────────────────────────────────────────────────────
// Heavily biases draws toward recognizable, high-rated players (superstars).

function starWeight(ovr: number): number {
  if (ovr >= 90) return 210;
  if (ovr >= 88) return 165;
  if (ovr >= 86) return 120;
  if (ovr >= 84) return 80;
  if (ovr >= 82) return 34;
  if (ovr >= 80) return 16;
  if (ovr >= 78) return 2;   // silver 78–79: rare
  if (ovr >= 75) return 0.6;
  return 0.2;                // mid/low: almost never
}

function specialWeight(p: Player): number {
  if (!isSpecialCard(p)) return 1;
  if (p.cardType === 'icon' || p.cardType === 'thunderstruck_icon') return 2.4;
  if (p.cardType === 'hero') return 2;
  if (p.cardType === 'totw') return 1.6;
  if (p.cardType === 'thunderstruck' || p.cardType === 'cornerstones') return 1.3;
  return 1.2;
}

function matchesBenchRole(position: string, role: BenchSubRole): boolean {
  const accepted = BENCH_ROLE_POSITIONS[role];
  return accepted.includes(position);
}

/** Try to inject a special card into a draw pool (position-filtered when possible). */
function trySpecialPick(
  rng: Rng,
  pool: Player[],
  used: Set<number>,
  slotGroup?: string
): Player | null {
  let specials = pool.filter((p) => isSpecialCard(p) && !used.has(p.id));
  if (slotGroup) {
    const matched = specials.filter(
      (p) => isExactPosition(p.position, slotGroup) || isInPosition(p.position, slotGroup)
    );
    if (matched.length) specials = matched;
  }
  if (!specials.length) return null;
  const weights = specials.map((p) => specialWeight(p) * starWeight(p.overall));
  return weightedSample(rng, specials, weights);
}

/** Broad position bucket for reserve diversity (max 2 per bucket, 1 GK). */
function broadPositionGroup(pos: string): string {
  if (pos === 'GK') return 'GK';
  if (['CB', 'RWB', 'LWB'].includes(pos)) return 'DEF';
  if (['LB', 'RB', 'CDM', 'DM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'MID';
  return 'ATT';
}

// ─── Weighted sampling ────────────────────────────────────────────────────────

function weightedSample<T>(rng: Rng, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    rand -= weights[i]!;
    if (rand <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

// ─── Contextual affinity ("Markov-style progression vector") ───────────────────
// As the squad fills, it accumulates a thematic identity. Later card pools are
// skewed toward the squad's two dominant leagues/nationalities so cohesive
// hybrids become mathematically reachable.

interface Affinity {
  leagues: Set<string>;
  nations: Set<string>;
}

function tallyAffinity(players: Player[]): Affinity {
  const lc: Record<string, number> = {};
  const nc: Record<string, number> = {};
  for (const p of players) {
    if (p.leagueName) lc[p.leagueName] = (lc[p.leagueName] ?? 0) + 1;
    if (p.nationalityName) nc[p.nationalityName] = (nc[p.nationalityName] ?? 0) + 1;
  }
  const top2 = (o: Record<string, number>) =>
    new Set(
      Object.entries(o)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map((e) => e[0])
    );
  return { leagues: top2(lc), nations: top2(nc) };
}

function matchesAffinity(p: Player, a: Affinity): boolean {
  return a.leagues.has(p.leagueName) || a.nations.has(p.nationalityName);
}

interface Band {
  lo: number;
  hi: number;
}

/**
 * Select one card for an option slot: roll for an affinity bias and an
 * exact/related position, then narrow to the rating band — widening
 * progressively so a card is always returned without duplicates.
 */
function selectCard(
  rng: Rng,
  exact: Player[],
  related: Player[],
  any: Player[],
  used: Set<number>,
  band: Band,
  aff: Affinity,
  affinityProb: number,
  posExactProb: number
): Player | null {
  const wantAff = (aff.leagues.size > 0 || aff.nations.size > 0) && rng.next() < affinityProb;
  const usePos = related.length === 0 || rng.next() < posExactProb;
  const primary = usePos ? exact : related;
  const f = (list: Player[], lo: number, hi: number, withAff: boolean) =>
    list.filter(
      (p) => !used.has(p.id) && p.overall >= lo && p.overall <= hi && (!withAff || matchesAffinity(p, aff))
    );
  let c = f(primary, band.lo, band.hi, wantAff);
  if (!c.length) c = f(primary, band.lo - 3, band.hi + 4, wantAff);
  if (!c.length) c = f(primary, band.lo - 3, band.hi + 4, false);
  if (!c.length) c = f(exact, 0, 99, false);
  if (!c.length) c = any.filter((p) => !used.has(p.id));
  if (!c.length) return null;
  const chosen = rng.pick(c);
  used.add(chosen.id);
  return chosen;
}

/**
 * Weighted Multi-Factor Selection for a STARTER slot — builds a 5-card pool that
 * feels like a structured FUT pack rather than a flat random draw:
 *
 *  • Card 1  (Anchor):  exact position, 35% an elite 90+, else 85–89.
 *  • Cards 2–3 (Core):  exact position, gold 81–84.
 *  • Card 4 (Chem bridge): a related/exact player 78–83 that shares a league or
 *    nationality with an already-drafted, linked neighbour (reliable chemistry).
 *  • Card 5 (Wildcard): chaos 80–95 from anywhere, weighted to the slot's half.
 *
 * No player already on the pitch/bench/reserves can ever reappear.
 */
export function drawCardsForSlot(
  rng: Rng,
  pool: Player[],
  formation: Formation,
  slotIndex: number,
  drafted: DraftedPlayer[],
  alreadyDrafted: Set<number>,
  premiumDrafted = 0
): Player[] {
  const slotGroup = formation.positions[slotIndex]!.positionGroup;
  void drafted; // squad context now comes from the global affinity vector below

  const avail = pool.filter((p) => !alreadyDrafted.has(p.id));
  const exact = avail.filter((p) => isExactPosition(p.position, slotGroup));
  const related = avail.filter(
    (p) => !isExactPosition(p.position, slotGroup) && isInPosition(p.position, slotGroup)
  );
  const aff = tallyAffinity(pool.filter((p) => alreadyDrafted.has(p.id)));

  const used = new Set<number>();
  const out: Player[] = [];

  // Rating bands tuned so elites are a treat (≈20%), gold is the norm (≈55%),
  // and an all-silver pull is rare (floor 79).
  const band = (): Band => {
    const r = rng.next();
    return r < 0.2 ? { lo: 86, hi: 99 } : r < 0.75 ? { lo: 82, hi: 85 } : { lo: 79, hi: 81 };
  };

  // One premium slot per hand (~14% base; odds halve for each special already drafted).
  const premiumSlot =
    rng.next() < premiumHandChance(0.14, premiumDrafted) ? rng.int(5) : -1;

  const pushPick = (p: Player | null, fromSpecial = false) => {
    if (!p || out.some((x) => x.id === p.id)) return;
    if (fromSpecial) used.add(p.id);
    out.push(p);
  };

  // Options 1–3: strict exact-position matches (premium slot may inject a special).
  for (let k = 0; k < 3; k++) {
    if (premiumSlot === k) {
      const sp = trySpecialPick(rng, avail, used, slotGroup);
      if (sp) {
        pushPick(sp, true);
        continue;
      }
    }
    pushPick(selectCard(rng, exact, related, avail, used, band(), aff, k === 2 ? 0.45 : 0.15, 1));
  }
  // Option 4: related-position chemistry bridge.
  if (premiumSlot === 3) {
    const sp = trySpecialPick(rng, avail, used, slotGroup);
    if (sp) pushPick(sp, true);
    else pushPick(selectCard(rng, exact, related, avail, used, { lo: 79, hi: 84 }, aff, 0.45, 0));
  } else {
    pushPick(selectCard(rng, exact, related, avail, used, { lo: 79, hi: 84 }, aff, 0.45, 0));
  }

  // Option 5: wildcard — uses premium roll if assigned here, else elite base gold.
  let o5: Player | null = null;
  if (premiumSlot === 4) {
    o5 = trySpecialPick(rng, avail, used, slotGroup);
    if (!o5) {
      const legs = avail.filter(
        (p) =>
          p.isLegend &&
          !used.has(p.id) &&
          (isExactPosition(p.position, slotGroup) || isInPosition(p.position, slotGroup))
      );
      if (legs.length) o5 = rng.pick(legs);
    }
  }
  if (!o5) {
    const elites = (exact.length ? exact : avail).filter((p) => !used.has(p.id) && p.overall >= 85);
    o5 = elites.length
      ? weightedSample(rng, elites, elites.map((p) => starWeight(p.overall)))
      : selectCard(rng, exact, related, avail, used, { lo: 84, hi: 99 }, aff, 0.2, 0.8);
  }
  if (o5 && !out.some((x) => x.id === o5!.id)) {
    used.add(o5.id);
    out.push(o5);
  }

  while (out.length < 5) {
    const f = avail.find((p) => !used.has(p.id));
    if (!f) break;
    used.add(f.id);
    out.push(f);
  }
  return rng.shuffle(out).slice(0, 5);
}

/**
 * Draw 5 captain candidates — all big-name stars (OVR 86+ preferred).
 */
export function drawCaptainCandidates(
  rng: Rng,
  pool: Player[],
  alreadyDrafted: Set<number>,
  premiumDrafted = 0
): Player[] {
  let eligible = pool.filter((p) => p.overall >= 88 && !alreadyDrafted.has(p.id));
  if (eligible.length < 5) {
    eligible = pool.filter((p) => p.overall >= 84 && !alreadyDrafted.has(p.id));
  }
  if (eligible.length < 5) {
    return pool
      .filter((p) => !alreadyDrafted.has(p.id))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 5);
  }

  const picks: Player[] = [];
  const used = new Set<number>();
  let rem = [...eligible];
  while (picks.length < 5 && rem.length > 0) {
    const choice = weightedSample(rng, rem, rem.map((p) => starWeight(p.overall)));
    if (!used.has(choice.id)) {
      picks.push(choice);
      used.add(choice.id);
    }
    rem = rem.filter((p) => p.id !== choice.id);
  }

  // Chance to guarantee at least one special captain option (tapers if squad has specials).
  if (
    rng.next() < premiumHandChance(0.35, premiumDrafted) &&
    !picks.some((p) => isSpecialCard(p))
  ) {
    const sp = eligible.filter((p) => isSpecialCard(p) && !used.has(p.id));
    if (sp.length) {
      const choice = weightedSample(rng, sp, sp.map((p) => specialWeight(p) * starWeight(p.overall)));
      picks[rng.int(picks.length)] = choice;
    }
  }
  return picks;
}

/**
 * Substitutes: position-matched backups — one option may roll elite (86+), the
 * rest are solid gold utilities (80–84), with a moderate affinity bias.
 */
export function drawSubCandidates(
  rng: Rng,
  pool: Player[],
  benchRole: BenchSubRole,
  alreadyDrafted: Set<number>,
  premiumDrafted = 0
): Player[] {
  const avail = pool.filter((p) => !alreadyDrafted.has(p.id));
  const exact = avail.filter((p) => matchesBenchRole(p.position, benchRole));
  const related: Player[] = [];
  const aff = tallyAffinity(pool.filter((p) => alreadyDrafted.has(p.id)));

  const used = new Set<number>();
  const out: Player[] = [];
  const subPremium =
    rng.next() < premiumHandChance(0.08, premiumDrafted) ? rng.int(5) : -1;
  for (let k = 0; k < 5; k++) {
    const band: Band = k === 0 ? (rng.next() < 0.5 ? { lo: 86, hi: 99 } : { lo: 82, hi: 85 }) : { lo: 80, hi: 84 };
    let p: Player | null = null;
    if (k === subPremium) p = trySpecialPick(rng, avail, used);
    if (!p) p = selectCard(rng, exact, related, avail, used, band, aff, 0.4, 0.8);
    if (p) out.push(p);
  }
  while (out.length < 5) {
    const f = avail.find((p) => !used.has(p.id));
    if (!f) break;
    used.add(f.id);
    out.push(f);
  }
  return rng.shuffle(out).slice(0, 5);
}

/**
 * Reserves: true "blind" wildcards like the console game — a randomised mix of
 * positions and ratings (no fixed slot). Elites are uncommon and an all-silver
 * pull is rare; the occasional Legend can show up as a late chemistry-saver.
 */
export function drawReserveWildcard(
  rng: Rng,
  pool: Player[],
  alreadyDrafted: Set<number>,
  premiumDrafted = 0
): Player[] {
  const avail = pool.filter((p) => !alreadyDrafted.has(p.id));
  const used = new Set<number>();
  const out: Player[] = [];
  const groupCounts: Record<string, number> = {};
  let gkCount = 0;

  const canPick = (p: Player): boolean => {
    if (p.position === 'GK' && gkCount >= 1) return false;
    const g = broadPositionGroup(p.position);
    return (groupCounts[g] ?? 0) < 2;
  };

  const recordPick = (p: Player) => {
    const g = broadPositionGroup(p.position);
    groupCounts[g] = (groupCounts[g] ?? 0) + 1;
    if (p.position === 'GK') gkCount += 1;
  };

  const band = (): Band => {
    const r = rng.next();
    return r < 0.1 ? { lo: 86, hi: 99 } : r < 0.68 ? { lo: 80, hi: 85 } : { lo: 75, hi: 79 };
  };

  const pickWeightedBase = (): Player | null => {
    const b = band();
    let c = avail.filter(
      (x) => !used.has(x.id) && x.overall >= b.lo && x.overall <= b.hi && canPick(x)
    );
    if (!c.length) c = avail.filter((x) => !used.has(x.id) && canPick(x));
    if (!c.length) c = avail.filter((x) => !used.has(x.id));
    if (!c.length) return null;
    return weightedSample(
      rng,
      c,
      c.map((p) => starWeight(p.overall))
    );
  };

  // At most one premium card per reserve hand (~8% base, tapers with drafted specials).
  const premiumSlot =
    rng.next() < premiumHandChance(0.08, premiumDrafted) ? rng.int(5) : -1;

  for (let k = 0; k < 5; k++) {
    let p: Player | null = null;
    if (k === premiumSlot) {
      p = trySpecialPick(rng, avail, used);
      if (p && !canPick(p)) p = null;
    }
    if (!p) p = pickWeightedBase();
    if (p) {
      used.add(p.id);
      recordPick(p);
      out.push(p);
    }
  }

  while (out.length < 5) {
    const f = avail.find((x) => !used.has(x.id));
    if (!f) break;
    used.add(f.id);
    out.push(f);
  }
  return rng.shuffle(out).slice(0, 5);
}

/**
 * Select 5 formations of distinct shapes for the picker. Many formations share
 * a base name (e.g. five 4-3-3 variants); we pick 5 different names and a random
 * variant of each, so the picker always shows variety.
 */
export function sampleFormations(rng: Rng, formations: Formation[]): Formation[] {
  const byName: Record<string, Formation[]> = {};
  for (const f of formations) (byName[f.name] ??= []).push(f);
  const names = rng.shuffle(Object.keys(byName)).slice(0, 5);
  return names.map((n) => rng.pick(byName[n]!));
}

/**
 * Draw 5 random manager candidates for the manager pick step.
 */
export function drawManagers(rng: Rng): Manager[] {
  return rng.shuffle(MANAGERS).slice(0, 5);
}

/**
 * Given a captain's position and the formation, find the best matching slot index.
 * Falls back to the first non-GK slot if no ideal match found.
 */
export function findBestSlotForCaptain(
  position: string,
  formation: Formation
): number {
  const positions = formation.positions;

  // Try exact position match first
  let idx = positions.findIndex((p) => {
    const acceptable = getAcceptablePositions(p.positionGroup);
    return acceptable.includes(position);
  });

  // If the only match is GK slot but player isn't a GK, skip it
  if (idx === 0 && position !== 'GK') {
    idx = positions.findIndex((p, i) => {
      if (i === 0) return false; // skip GK slot
      const acceptable = getAcceptablePositions(p.positionGroup);
      return acceptable.includes(position);
    });
  }

  // Final fallback: first non-GK slot
  if (idx === -1) {
    idx = positions.findIndex((p) => p.positionGroup !== 'GK');
  }

  return idx === -1 ? 0 : idx;
}

/**
 * Compute average OVR of 11 starters.
 */
export function computeOvrAvg(players: Player[]): number {
  if (players.length === 0) return 0;
  const total = players.reduce((sum, p) => sum + p.overall, 0);
  return Math.round(total / players.length);
}
