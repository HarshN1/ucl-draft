import type { Player, Formation, Manager, DraftedPlayer } from '@/types';
import { MANAGERS } from '@/data/managers';
import type { BenchSubRole } from '@/constants/squadLayout';
import { BENCH_ROLE_POSITIONS } from '@/constants/squadLayout';
import {
  getAdjacency,
  isInPosition,
  isExactPosition,
  normalizeLeague,
} from '@/engine/chemistryEngine';
import { premiumHandChance } from '@/lib/premiumCards';
import { isSpecialCard } from '@/lib/cardStyles';
import type { Rng } from '@/engine/rng';

// ─── Position mapping ─────────────────────────────────────────────────────────

const POSITION_MAP: Record<string, string[]> = {
  GK: ['GK'],
  CB: ['CB', 'RWB', 'LWB'],
  FB: ['LB', 'RB', 'LWB', 'RWB'],
  CDM: ['CDM', 'CM', 'DM'],
  CM: ['CM', 'CDM', 'CAM'],
  CAM: ['CAM', 'LM', 'RM', 'CM', 'CF'],
  WG: ['LW', 'RW', 'LM', 'RM', 'CAM'],
  ST: ['ST', 'CF', 'LW', 'RW'],
};

export function getAcceptablePositions(positionGroup: string): string[] {
  return POSITION_MAP[positionGroup] ?? ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM'];
}

export function canonicalPlayerId(p: Pick<Player, 'id' | 'basePlayerId'>): number {
  return p.basePlayerId ?? p.id;
}

function isUsed(p: Player, used: Set<number>): boolean {
  return used.has(p.id) || (p.basePlayerId !== undefined && used.has(p.basePlayerId));
}

function markUsed(p: Player, used: Set<number>): void {
  used.add(p.id);
  if (p.basePlayerId !== undefined) {
    used.add(p.basePlayerId);
  }
}

// ─── Star & Special weighting ─────────────────────────────────────────────────

function starWeight(ovr: number): number {
  if (ovr >= 92) return 240;
  if (ovr >= 90) return 210;
  if (ovr >= 88) return 165;
  if (ovr >= 86) return 120;
  if (ovr >= 84) return 80;
  if (ovr >= 82) return 38;
  if (ovr >= 80) return 18;
  if (ovr >= 78) return 3;
  if (ovr >= 75) return 0.8;
  return 0.2;
}

function specialWeight(p: Player): number {
  if (!isSpecialCard(p)) return 1;
  if (p.cardType === 'toty') return 2.5;
  if (p.cardType === 'tots') return 2.3;
  if (p.cardType === 'icon' || p.cardType === 'thunderstruck_icon' || p.isLegend) return 2.2;
  if (p.cardType === 'hero') return 2.0;
  if (p.cardType === 'futties' || p.cardType === 'motm') return 1.85;
  if (p.cardType === 'totw') return 1.65;
  if (p.cardType === 'thunderstruck' || p.cardType === 'cornerstones') return 1.4;
  return 1.2;
}

function matchesBenchRole(player: Player, role: BenchSubRole): boolean {
  const accepted = BENCH_ROLE_POSITIONS[role];
  if (accepted.includes(player.position)) return true;
  if (player.altPositions && player.altPositions.some((alt) => accepted.includes(alt))) {
    return true;
  }
  return false;
}

/** Try to inject a special card into a draw pool (position-filtered when possible). */
function trySpecialPick(
  rng: Rng,
  pool: Player[],
  used: Set<number>,
  slotGroup?: string,
  aff?: Affinity
): Player | null {
  let specials = pool.filter((p) => isSpecialCard(p) && !isUsed(p, used));
  if (slotGroup) {
    const matched = specials.filter(
      (p) =>
        isExactPosition(p.position, slotGroup, p.altPositions) ||
        isInPosition(p.position, slotGroup, p.altPositions)
    );
    if (matched.length) specials = matched;
  }
  if (!specials.length) return null;
  const weights = specials.map((p) => {
    const affBoost = aff && matchesAffinity(p, aff) ? 1.65 : 1;
    return specialWeight(p) * starWeight(p.overall) * affBoost;
  });
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

// ─── Contextual & Adjacency Affinity ──────────────────────────────────────────

interface Affinity {
  clubs: Set<string>;
  leagues: Set<string>;
  nations: Set<string>;
}

function tallyAffinity(players: Player[]): Affinity {
  const cc: Record<string, number> = {};
  const lc: Record<string, number> = {};
  const nc: Record<string, number> = {};
  for (const p of players) {
    if (p.clubName && p.clubName !== 'Icons' && p.clubName !== 'HERO') {
      const c = p.clubName.toLowerCase().trim();
      cc[c] = (cc[c] ?? 0) + 1;
    }
    const normL = normalizeLeague(p.leagueName);
    if (normL && normL !== 'icons') {
      lc[normL] = (lc[normL] ?? 0) + 1;
    }
    if (p.nationalityName) {
      const n = p.nationalityName.toLowerCase().trim();
      nc[n] = (nc[n] ?? 0) + 1;
    }
  }
  const topN = (o: Record<string, number>, k: number) =>
    new Set(
      Object.entries(o)
        .sort((a, b) => b[1] - a[1])
        .slice(0, k)
        .map((e) => e[0])
    );
  return { clubs: topN(cc, 3), leagues: topN(lc, 2), nations: topN(nc, 2) };
}

function buildSlotAffinity(
  formation: Formation,
  slotIndex: number,
  drafted: DraftedPlayer[],
  allDraftedPlayers: Player[]
): Affinity {
  const adj = getAdjacency(formation)[slotIndex] ?? [];
  const neighbourPlayers = drafted
    .filter((dp) => adj.includes(dp.slotIndex))
    .map((dp) => dp.player);

  if (neighbourPlayers.length > 0) {
    const localAff = tallyAffinity(neighbourPlayers);
    const globalAff = tallyAffinity(allDraftedPlayers);
    const clubs = new Set<string>();
    localAff.clubs.forEach((c) => clubs.add(c));
    globalAff.clubs.forEach((c) => clubs.add(c));
    return {
      clubs,
      leagues: localAff.leagues.size > 0 ? localAff.leagues : globalAff.leagues,
      nations: localAff.nations.size > 0 ? localAff.nations : globalAff.nations,
    };
  }
  return tallyAffinity(allDraftedPlayers);
}

function matchesAffinity(p: Player, a: Affinity): boolean {
  const c = (p.clubName || '').toLowerCase().trim();
  const l = normalizeLeague(p.leagueName);
  const n = (p.nationalityName || '').toLowerCase().trim();
  return (!!c && a.clubs.has(c)) || (!!l && a.leagues.has(l)) || (!!n && a.nations.has(n));
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
  const hasAff = aff.clubs.size > 0 || aff.leagues.size > 0 || aff.nations.size > 0;
  const wantAff = hasAff && rng.next() < affinityProb;
  const usePos = related.length === 0 || rng.next() < posExactProb;
  const primary = usePos ? exact : related;
  const f = (list: Player[], lo: number, hi: number, withAff: boolean) =>
    list.filter(
      (p) => !isUsed(p, used) && p.overall >= lo && p.overall <= hi && (!withAff || matchesAffinity(p, aff))
    );
  let c = f(primary, band.lo, band.hi, wantAff);
  if (!c.length) c = f(primary, band.lo - 3, band.hi + 4, wantAff);
  if (!c.length) c = f(primary, band.lo - 3, band.hi + 4, false);
  if (!c.length) c = f(exact, 0, 99, false);
  if (!c.length) c = any.filter((p) => !isUsed(p, used));
  if (!c.length) return null;
  const chosen = weightedSample(
    rng,
    c,
    c.map((p) => {
      const clubBonus =
        wantAff && p.clubName && aff.clubs.has(p.clubName.toLowerCase().trim()) ? 2.2 : 1;
      return starWeight(p.overall) * clubBonus;
    })
  );
  markUsed(chosen, used);
  return chosen;
}

/**
 * FIFA 16 5-Card Starter Slot Draw:
 *  • Cards 1–2 (Adjacency / Squad Chemistry Bridges): seeded from pitch neighbours
 *    (`getAdjacency(formation)[slotIndex]`) and squad league/nation core.
 *  • Cards 3–4 (Position / Rating Band Core): independent of squad links so the
 *    user faces the authentic FIFA 16 "Higher OVR vs. 10 Chemistry" dilemma.
 *  • Card 5 (Marquee / Special Upside): high-OVR Gold (85+) or Special/Icon card.
 *
 * Base slots draw strictly from non-special cards so the 23-man squad hits the
 * authentic FIFA 16 balance (~4–7 Specials + ~16–19 Base Golds).
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

  const avail = pool.filter((p) => !isUsed(p, alreadyDrafted));
  const basePool = avail.filter((p) => !isSpecialCard(p));
  const coreAvail = basePool.length >= 10 ? basePool : avail;

  const exact = coreAvail.filter((p) => isExactPosition(p.position, slotGroup, p.altPositions));
  const related = coreAvail.filter(
    (p) =>
      !isExactPosition(p.position, slotGroup, p.altPositions) &&
      isInPosition(p.position, slotGroup, p.altPositions)
  );

  const allDraftedPlayers = pool.filter((p) => isUsed(p, alreadyDrafted));
  const aff = buildSlotAffinity(formation, slotIndex, drafted, allDraftedPlayers);

  const used = new Set<number>(alreadyDrafted);
  const out: Player[] = [];

  const band = (): Band => {
    const r = rng.next();
    return r < 0.25 ? { lo: 85, hi: 99 } : r < 0.8 ? { lo: 81, hi: 85 } : { lo: 78, hi: 81 };
  };

  // ~44% base chance of a Special card in a starter hand, tapering gently as specials are drafted.
  const hasPrimarySpecial = rng.next() < premiumHandChance(0.44, premiumDrafted);
  const premiumSlot = hasPrimarySpecial ? rng.int(5) : -1;

  const pushPick = (p: Player | null) => {
    if (!p || out.some((x) => canonicalPlayerId(x) === canonicalPlayerId(p))) return;
    markUsed(p, used);
    out.push(p);
  };

  // Options 1–2: Chemistry bridges (high affinity to adjacent pitch neighbours / captain).
  for (let k = 0; k < 2; k++) {
    if (premiumSlot === k) {
      const sp = trySpecialPick(rng, avail, used, slotGroup, aff);
      if (sp) {
        pushPick(sp);
        continue;
      }
    }
    pushPick(selectCard(rng, exact, related, coreAvail, used, band(), aff, 0.82, 0.9));
  }

  // Options 3–4: Pure position/rating-band options (1 exact, 1 exact/related hybrid).
  for (let k = 2; k < 4; k++) {
    if (premiumSlot === k) {
      const sp = trySpecialPick(rng, avail, used, slotGroup);
      if (sp) {
        pushPick(sp);
        continue;
      }
    }
    const posExactProb = k === 2 ? 1.0 : 0.45;
    pushPick(selectCard(rng, exact, related, coreAvail, used, band(), aff, 0.12, posExactProb));
  }

  // Option 5: Marquee / Wildcard slot — Special if rolled here, else 85+ Base Gold star.
  let o5: Player | null = null;
  if (premiumSlot === 4) {
    o5 = trySpecialPick(rng, avail, used, slotGroup, aff);
  }
  if (!o5) {
    const elites = (exact.length ? exact : coreAvail).filter(
      (p) => !isUsed(p, used) && p.overall >= 84
    );
    o5 = elites.length
      ? weightedSample(rng, elites, elites.map((p) => starWeight(p.overall)))
      : selectCard(rng, exact, related, coreAvail, used, { lo: 83, hi: 99 }, aff, 0.25, 0.85);
  }
  pushPick(o5);

  while (out.length < 5) {
    const f = coreAvail.find((p) => !isUsed(p, used)) ?? avail.find((p) => !isUsed(p, used));
    if (!f) break;
    pushPick(f);
  }
  return rng.shuffle(out).slice(0, 5);
}

/**
 * Draw 5 captain candidates — FIFA 16 Captain Round:
 * Mixes 1–2 elite Special/Icon superstars with 3–4 Base Gold 88+ superstars.
 */
export function drawCaptainCandidates(
  rng: Rng,
  pool: Player[],
  alreadyDrafted: Set<number>,
  premiumDrafted = 0
): Player[] {
  const avail = pool.filter((p) => !isUsed(p, alreadyDrafted));
  let eligible = avail.filter((p) => p.overall >= 88);
  if (eligible.length < 5) {
    eligible = avail.filter((p) => p.overall >= 84);
  }
  if (eligible.length < 5) {
    return avail.sort((a, b) => b.overall - a.overall).slice(0, 5);
  }

  const baseStars = eligible.filter((p) => !isSpecialCard(p));
  const specialStars = eligible.filter((p) => isSpecialCard(p));

  const picks: Player[] = [];
  const used = new Set<number>(alreadyDrafted);

  // Target 1 or 2 special captains when both pools are populated, else fall back cleanly.
  const targetSpecials =
    specialStars.length > 0 && baseStars.length >= 3
      ? rng.next() < premiumHandChance(0.55, premiumDrafted)
        ? 2
        : 1
      : 0;

  while (picks.length < targetSpecials) {
    const remSp = specialStars.filter((p) => !isUsed(p, used));
    if (!remSp.length) break;
    const choice = weightedSample(
      rng,
      remSp,
      remSp.map((p) => specialWeight(p) * starWeight(p.overall))
    );
    markUsed(choice, used);
    picks.push(choice);
  }

  while (picks.length < 5) {
    const remBase = baseStars.filter((p) => !isUsed(p, used));
    const remAny = eligible.filter((p) => !isUsed(p, used));
    const source = remBase.length > 0 ? remBase : remAny;
    if (!source.length) break;
    const choice = weightedSample(
      rng,
      source,
      source.map((p) => starWeight(p.overall))
    );
    markUsed(choice, used);
    picks.push(choice);
  }

  return rng.shuffle(picks);
}

/**
 * Substitutes: position-matched backups (7 slots: GK, DEF, DEF, MID, MID, ATT, ATT).
 */
export function drawSubCandidates(
  rng: Rng,
  pool: Player[],
  benchRole: BenchSubRole,
  alreadyDrafted: Set<number>,
  premiumDrafted = 0
): Player[] {
  const avail = pool.filter((p) => !isUsed(p, alreadyDrafted));
  const basePool = avail.filter((p) => !isSpecialCard(p));
  const coreAvail = basePool.length >= 10 ? basePool : avail;

  const exact = coreAvail.filter((p) => matchesBenchRole(p, benchRole));
  const related: Player[] = [];
  const aff = tallyAffinity(pool.filter((p) => isUsed(p, alreadyDrafted)));

  const used = new Set<number>(alreadyDrafted);
  const out: Player[] = [];
  const subPremium =
    rng.next() < premiumHandChance(0.32, premiumDrafted) ? rng.int(5) : -1;

  for (let k = 0; k < 5; k++) {
    const band: Band =
      k === 0
        ? rng.next() < 0.55
          ? { lo: 85, hi: 99 }
          : { lo: 82, hi: 85 }
        : { lo: 79, hi: 84 };
    let p: Player | null = null;
    if (k === subPremium) {
      const roleSpecials = avail.filter((sp) => matchesBenchRole(sp, benchRole));
      p = trySpecialPick(rng, roleSpecials.length ? roleSpecials : avail, used, undefined, aff);
      if (p) markUsed(p, used);
    }
    if (!p) p = selectCard(rng, exact, related, coreAvail, used, band, aff, 0.45, 0.85);
    if (p && !out.some((x) => canonicalPlayerId(x) === canonicalPlayerId(p))) {
      out.push(p);
    }
  }
  while (out.length < 5) {
    const f = coreAvail.find((p) => !isUsed(p, used)) ?? avail.find((p) => !isUsed(p, used));
    if (!f) break;
    markUsed(f, used);
    out.push(f);
  }
  return rng.shuffle(out).slice(0, 5);
}

/**
 * Reserves: true "blind" wildcards like the console game — a randomised mix of
 * positions and ratings (no fixed slot).
 */
export function drawReserveWildcard(
  rng: Rng,
  pool: Player[],
  alreadyDrafted: Set<number>,
  premiumDrafted = 0
): Player[] {
  const avail = pool.filter((p) => !isUsed(p, alreadyDrafted));
  const basePool = avail.filter((p) => !isSpecialCard(p));
  const coreAvail = basePool.length >= 10 ? basePool : avail;

  const used = new Set<number>(alreadyDrafted);
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
    return r < 0.16 ? { lo: 85, hi: 99 } : r < 0.72 ? { lo: 80, hi: 85 } : { lo: 75, hi: 79 };
  };

  const pickWeightedBase = (): Player | null => {
    const b = band();
    let c = coreAvail.filter(
      (x) => !isUsed(x, used) && x.overall >= b.lo && x.overall <= b.hi && canPick(x)
    );
    if (!c.length) c = coreAvail.filter((x) => !isUsed(x, used) && canPick(x));
    if (!c.length) c = avail.filter((x) => !isUsed(x, used) && canPick(x));
    if (!c.length) c = avail.filter((x) => !isUsed(x, used));
    if (!c.length) return null;
    return weightedSample(
      rng,
      c,
      c.map((p) => starWeight(p.overall))
    );
  };

  const premiumSlot =
    rng.next() < premiumHandChance(0.28, premiumDrafted) ? rng.int(5) : -1;

  for (let k = 0; k < 5; k++) {
    let p: Player | null = null;
    if (k === premiumSlot) {
      p = trySpecialPick(rng, avail, used);
      if (p && !canPick(p)) p = null;
    }
    if (!p) p = pickWeightedBase();
    if (p && !out.some((x) => canonicalPlayerId(x) === canonicalPlayerId(p))) {
      markUsed(p, used);
      recordPick(p);
      out.push(p);
    }
  }

  while (out.length < 5) {
    const f = coreAvail.find((x) => !isUsed(x, used)) ?? avail.find((x) => !isUsed(x, used));
    if (!f) break;
    markUsed(f, used);
    out.push(f);
  }
  return rng.shuffle(out).slice(0, 5);
}

/**
 * Select 5 formations of distinct shapes for the picker.
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
  formation: Formation,
  altPositions?: string[]
): number {
  const positions = formation.positions;

  let idx = positions.findIndex((p) => {
    const acceptable = getAcceptablePositions(p.positionGroup);
    return acceptable.includes(position);
  });

  if (idx === -1 && altPositions && altPositions.length > 0) {
    idx = positions.findIndex((p) => {
      const acceptable = getAcceptablePositions(p.positionGroup);
      return altPositions.some((alt) => acceptable.includes(alt));
    });
  }

  if (idx === 0 && position !== 'GK') {
    idx = positions.findIndex((p, i) => {
      if (i === 0) return false;
      const acceptable = getAcceptablePositions(p.positionGroup);
      return acceptable.includes(position);
    });
  }

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
