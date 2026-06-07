import type { Player, Formation, Manager, DraftedPlayer } from '@/types';
import { MANAGERS } from '@/data/managers';
import { isInPosition, isExactPosition } from '@/engine/chemistryEngine';

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

// ─── Weighted sampling ────────────────────────────────────────────────────────

function weightedSample<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  return items[items.length - 1];
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

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

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
  exact: Player[],
  related: Player[],
  any: Player[],
  used: Set<number>,
  band: Band,
  aff: Affinity,
  affinityProb: number,
  posExactProb: number
): Player | null {
  const wantAff = (aff.leagues.size > 0 || aff.nations.size > 0) && Math.random() < affinityProb;
  const usePos = related.length === 0 || Math.random() < posExactProb;
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
  const pick = c[Math.floor(Math.random() * c.length)];
  used.add(pick.id);
  return pick;
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
  pool: Player[],
  formation: Formation,
  slotIndex: number,
  drafted: DraftedPlayer[],
  alreadyDrafted: Set<number>
): Player[] {
  const slotGroup = formation.positions[slotIndex].positionGroup;
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
    const r = Math.random();
    return r < 0.2 ? { lo: 86, hi: 99 } : r < 0.75 ? { lo: 82, hi: 85 } : { lo: 79, hi: 81 };
  };

  // Options 1–3: strict exact-position matches.
  for (let k = 0; k < 3; k++) {
    const p = selectCard(exact, related, avail, used, band(), aff, k === 2 ? 0.45 : 0.15, 1);
    if (p) out.push(p);
  }
  // Option 4: related-position chemistry bridge.
  const o4 = selectCard(exact, related, avail, used, { lo: 79, hi: 84 }, aff, 0.45, 0);
  if (o4) out.push(o4);
  // Option 5: 15% chance of a position-matched Legend, else an elite (85+) base.
  let o5: Player | null = null;
  if (Math.random() < 0.15) {
    const legs = avail.filter(
      (p) =>
        p.isLegend &&
        !used.has(p.id) &&
        (isExactPosition(p.position, slotGroup) || isInPosition(p.position, slotGroup))
    );
    if (legs.length) o5 = pick(legs);
  }
  if (!o5) {
    const elites = (exact.length ? exact : avail).filter((p) => !used.has(p.id) && p.overall >= 85);
    o5 = elites.length ? pick(elites) : selectCard(exact, related, avail, used, { lo: 84, hi: 99 }, aff, 0.2, 0.8);
  }
  if (o5 && !used.has(o5.id)) {
    used.add(o5.id);
    out.push(o5);
  }

  while (out.length < 5) {
    const f = avail.find((p) => !used.has(p.id));
    if (!f) break;
    used.add(f.id);
    out.push(f);
  }
  return out.sort(() => Math.random() - 0.5).slice(0, 5);
}

/**
 * Draw 5 captain candidates — all big-name stars (OVR 86+ preferred).
 */
export function drawCaptainCandidates(
  pool: Player[],
  alreadyDrafted: Set<number>
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
    const choice = weightedSample(rem, rem.map((p) => starWeight(p.overall)));
    if (!used.has(choice.id)) {
      picks.push(choice);
      used.add(choice.id);
    }
    rem = rem.filter((p) => p.id !== choice.id);
  }

  // 40% chance to guarantee at least one Legend captain option.
  if (Math.random() < 0.4 && !picks.some((p) => p.isLegend)) {
    const legs = eligible.filter((p) => p.isLegend && !used.has(p.id));
    if (legs.length) picks[Math.floor(Math.random() * picks.length)] = pick(legs);
  }
  return picks;
}

/**
 * Substitutes: position-matched backups — one option may roll elite (86+), the
 * rest are solid gold utilities (80–84), with a moderate affinity bias.
 */
export function drawSubCandidates(
  pool: Player[],
  positionGroup: string,
  alreadyDrafted: Set<number>
): Player[] {
  const avail = pool.filter((p) => !alreadyDrafted.has(p.id));
  const exact = avail.filter((p) => isExactPosition(p.position, positionGroup));
  const related = avail.filter(
    (p) => !isExactPosition(p.position, positionGroup) && isInPosition(p.position, positionGroup)
  );
  const aff = tallyAffinity(pool.filter((p) => alreadyDrafted.has(p.id)));

  const used = new Set<number>();
  const out: Player[] = [];
  for (let k = 0; k < 5; k++) {
    const band: Band = k === 0 ? (Math.random() < 0.5 ? { lo: 86, hi: 99 } : { lo: 82, hi: 85 }) : { lo: 80, hi: 84 };
    const p = selectCard(exact, related, avail, used, band, aff, 0.4, 0.8);
    if (p) out.push(p);
  }
  while (out.length < 5) {
    const f = avail.find((p) => !used.has(p.id));
    if (!f) break;
    used.add(f.id);
    out.push(f);
  }
  return out.sort(() => Math.random() - 0.5).slice(0, 5);
}

/**
 * Reserves: true "blind" wildcards like the console game — a randomised mix of
 * positions and ratings (no fixed slot). Elites are uncommon and an all-silver
 * pull is rare; the occasional Legend can show up as a late chemistry-saver.
 */
export function drawReserveWildcard(pool: Player[], alreadyDrafted: Set<number>): Player[] {
  const avail = pool.filter((p) => !alreadyDrafted.has(p.id));
  const used = new Set<number>();
  const out: Player[] = [];
  const band = (): Band => {
    const r = Math.random();
    return r < 0.1 ? { lo: 86, hi: 99 } : r < 0.68 ? { lo: 80, hi: 85 } : { lo: 75, hi: 79 };
  };
  for (let k = 0; k < 5; k++) {
    let p: Player | null = null;
    if (Math.random() < 0.08) {
      const legs = avail.filter((x) => x.isLegend && !used.has(x.id));
      if (legs.length) p = pick(legs);
    }
    if (!p) {
      const b = band();
      let c = avail.filter((x) => !used.has(x.id) && x.overall >= b.lo && x.overall <= b.hi);
      if (!c.length) c = avail.filter((x) => !used.has(x.id));
      if (c.length) p = pick(c);
    }
    if (p) {
      used.add(p.id);
      out.push(p);
    }
  }
  return out.sort(() => Math.random() - 0.5).slice(0, 5);
}

/**
 * Select 5 formations of distinct shapes for the picker. Many formations share
 * a base name (e.g. five 4-3-3 variants); we pick 5 different names and a random
 * variant of each, so the picker always shows variety.
 */
export function sampleFormations(formations: Formation[]): Formation[] {
  const byName: Record<string, Formation[]> = {};
  for (const f of formations) (byName[f.name] ??= []).push(f);
  const names = Object.keys(byName).sort(() => Math.random() - 0.5).slice(0, 5);
  return names.map((n) => {
    const variants = byName[n];
    return variants[Math.floor(Math.random() * variants.length)];
  });
}

/**
 * Draw 5 random manager candidates for the manager pick step.
 */
export function drawManagers(): Manager[] {
  const shuffled = [...MANAGERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
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
