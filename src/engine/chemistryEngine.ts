import type {
  DraftedPlayer,
  Formation,
  ChemistryPreview,
  ChemistryLink,
  LinkQuality,
  Manager,
  Player,
} from '@/types';

// ─── Adjacency computation ────────────────────────────────────────────────────

/**
 * Build a clean, FUT-style chemistry link graph for a formation.
 */
function buildAdjacency(formation: Formation): number[][] {
  const positions = formation.positions;
  const n = positions.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  const link = (a: number, b: number) => {
    const la = adj[a];
    const lb = adj[b];
    if (a !== b && la && lb && !la.includes(b)) {
      la.push(b);
      lb.push(a);
    }
  };

  // 1. Cluster indices into lines by y (positions within 9 units share a line).
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => positions[a]!.y - positions[b]!.y
  );
  const lines: number[][] = [];
  for (const i of order) {
    const last = lines[lines.length - 1];
    const pos = positions[i];
    if (last && pos && Math.abs(pos.y - positions[last[0]!]!.y) <= 9) {
      last.push(i);
    } else {
      lines.push([i]);
    }
  }
  // Sort each line left → right.
  for (const line of lines) line.sort((a, b) => positions[a]!.x - positions[b]!.x);

  // 2. Horizontal links within each line.
  for (const line of lines) {
    for (let k = 0; k < line.length - 1; k++) {
      const left = line[k];
      const right = line[k + 1];
      if (left === undefined || right === undefined) continue;
      link(left, right);
    }
  }

  const euclid = (i: number, j: number) => {
    const dx = positions[i]!.x - positions[j]!.x;
    const dy = positions[i]!.y - positions[j]!.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 3. Vertical links between adjacent lines — only where columns actually align.
  const TOL = 18;
  for (let L = 0; L < lines.length - 1; L++) {
    const A = lines[L];
    const B = lines[L + 1];
    if (!A || !B) continue;
    const isGkLine = A.length === 1 && positions[A[0]!]!.positionGroup === 'GK';
    if (isGkLine) {
      const gk = A[0]!;
      [...B]
        .sort((a, b) => euclid(gk, a) - euclid(gk, b))
        .slice(0, Math.min(2, B.length))
        .forEach((d) => link(gk, d));
      continue;
    }
    let made = 0;
    for (const a of A) {
      for (const b of B) {
        if (Math.abs(positions[a]!.x - positions[b]!.x) <= TOL) {
          link(a, b);
          made++;
        }
      }
    }
    if (made === 0) {
      let pa = A[0]!;
      let pb = B[0]!;
      let bd = Infinity;
      for (const a of A)
        for (const b of B) {
          const d = euclid(a, b);
          if (d < bd) {
            bd = d;
            pa = a;
            pb = b;
          }
        }
      link(pa, pb);
    }
  }

  // 4. Top up any sparse node (0–1 links) with its nearest outfield neighbour.
  for (let i = 0; i < n; i++) {
    const row = adj[i];
    if (!row || positions[i]!.positionGroup === 'GK') continue;
    if (row.length >= 2) continue;
    const candidates = Array.from({ length: n }, (_, j) => j)
      .filter(
        (j) => j !== i && positions[j]!.positionGroup !== 'GK' && !row.includes(j)
      )
      .sort((a, b) => euclid(i, a) - euclid(i, b));
    for (const j of candidates) {
      if (row.length >= 2) break;
      link(i, j);
    }
  }

  return adj;
}

/**
 * Convert a formation's explicit slot-name link map into an index adjacency
 * list. This is the FIFA-accurate path; falls back to geometry if a formation
 * has no `links` defined.
 */
function adjacencyFromLinks(formation: Formation): number[][] {
  const n = formation.positions.length;
  const idx: Record<string, number> = {};
  formation.positions.forEach((p, i) => (idx[p.slot] = i));
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [slot, targets] of Object.entries(formation.links ?? {})) {
    const i = idx[slot];
    if (i == null) continue;
    for (const t of targets) {
      const j = idx[t];
      if (j == null || j === i) continue;
      const ai: number[] | undefined = adj[i];
      const aj: number[] | undefined = adj[j];
      if (!ai || !aj) continue;
      if (!ai.includes(j)) ai.push(j);
      if (!aj.includes(i)) aj.push(i);
    }
  }
  return adj;
}

const adjacencyCache: Record<string, number[][]> = {};

export function getAdjacency(formation: Formation): number[][] {
  const key = `${formation.name}|${formation.label}`;
  if (!adjacencyCache[key]) {
    adjacencyCache[key] =
      formation.links && Object.keys(formation.links).length > 0
        ? adjacencyFromLinks(formation)
        : buildAdjacency(formation);
  }
  return adjacencyCache[key]!;
}

// ─── Position grouping (for in-position chemistry) ─────────────────────────────

/** Map a raw player position to a formation position group. */
export function playerPositionGroup(position: string): string {
  const p = position.toUpperCase();
  if (p === 'GK') return 'GK';
  if (p === 'CB') return 'CB';
  if (['LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'FB';
  if (['CDM', 'DM'].includes(p)) return 'CDM';
  if (p === 'CM') return 'CM';
  if (['CAM', 'CF'].includes(p)) return 'CAM';
  if (['LW', 'RW', 'LM', 'RM'].includes(p)) return 'WG';
  if (p === 'ST') return 'ST';
  return 'CM';
}

// Groups that are "close enough" to count as in-position (no penalty)
const RELATED_GROUPS: Record<string, string[]> = {
  GK: ['GK'],
  CB: ['CB', 'FB'],
  FB: ['FB', 'CB', 'WG'],
  CDM: ['CDM', 'CM'],
  CM: ['CM', 'CDM', 'CAM'],
  CAM: ['CAM', 'CM', 'WG', 'ST'],
  WG: ['WG', 'CAM', 'ST', 'FB'],
  ST: ['ST', 'CAM', 'WG'],
};

/** Is a player playing in (or adjacent to) their natural or secondary position? */
export function isInPosition(
  playerPosition: string,
  slotGroup: string,
  altPositions?: string[]
): boolean {
  const pg = playerPositionGroup(playerPosition);
  if (pg === slotGroup) return true;
  if ((RELATED_GROUPS[slotGroup] ?? []).includes(pg)) return true;
  if (altPositions && altPositions.length > 0) {
    for (const alt of altPositions) {
      const altGroup = playerPositionGroup(alt);
      if (altGroup === slotGroup || (RELATED_GROUPS[slotGroup] ?? []).includes(altGroup)) {
        return true;
      }
    }
  }
  return false;
}

/** Strict natural-position match (exact group, or exact secondary position group). */
export function isExactPosition(
  playerPosition: string,
  slotGroup: string,
  altPositions?: string[]
): boolean {
  if (playerPositionGroup(playerPosition) === slotGroup) return true;
  if (altPositions && altPositions.some((alt) => playerPositionGroup(alt) === slotGroup)) {
    return true;
  }
  return false;
}

// ─── FUT 16 position-fit categories (Green / Yellow / Orange / Red) ─────────────

export type PositionCategory = 'perfect' | 'related' | 'outOfRole' | 'wrong';

// Player groups that count as a "related" (yellow) fit for each slot group.
const RELATED_BY_SLOT: Record<string, string[]> = {
  GK: [],
  CB: ['FB'],
  FB: ['CB', 'WG'],
  CDM: ['CM'],
  CM: ['CDM', 'CAM'],
  CAM: ['CM', 'WG', 'ST'],
  WG: ['CAM', 'ST'],
  ST: ['WG', 'CAM'],
};
// Player groups that count as an "out of role" (orange) fit for each slot group.
const OUTOFROLE_BY_SLOT: Record<string, string[]> = {
  GK: [],
  CB: ['CDM'],
  FB: ['CM'],
  CDM: ['CB', 'CAM'],
  CM: ['WG', 'ST', 'FB'],
  CAM: ['CDM', 'FB'],
  WG: ['FB', 'CM'],
  ST: ['CM'],
};

const CATEGORY_RANK: Record<PositionCategory, number> = {
  perfect: 3,
  related: 2,
  outOfRole: 1,
  wrong: 0,
};

function singlePositionCategory(playerPosition: string, slotGroup: string): PositionCategory {
  const pg = playerPositionGroup(playerPosition);
  if (pg === slotGroup) return 'perfect';
  if ((RELATED_BY_SLOT[slotGroup] ?? []).includes(pg)) return 'related';
  if ((OUTOFROLE_BY_SLOT[slotGroup] ?? []).includes(pg)) return 'outOfRole';
  return 'wrong';
}

/**
 * Classify how well a player's natural (and optional secondary) positions fit a slot.
 * Primary position match = 'perfect' (Green dot).
 * Exact secondary position match upgrades fit to at least 'related' (Yellow dot).
 */
export function positionCategory(
  playerPosition: string,
  slotGroup: string,
  altPositions?: string[]
): PositionCategory {
  let best = singlePositionCategory(playerPosition, slotGroup);
  if (best === 'perfect' || !altPositions || altPositions.length === 0) {
    return best;
  }
  for (const alt of altPositions) {
    const altCat = singlePositionCategory(alt, slotGroup);
    // An exact secondary position gives at least 'related' (Yellow) fit in FUT 16
    const effectiveAlt: PositionCategory = altCat === 'perfect' ? 'related' : altCat;
    if (CATEGORY_RANK[effectiveAlt] > CATEGORY_RANK[best]) {
      best = effectiveAlt;
    }
  }
  return best;
}

/** Convenience helper for UI components to inspect a Player's position fit in a slot. */
export function playerPositionFit(
  player: Pick<Player, 'position' | 'altPositions'>,
  slotGroup: string
): PositionCategory {
  return positionCategory(player.position, slotGroup, player.altPositions);
}

/**
 * FUT 16 base individual chemistry from position fit × Net Link Balance.
 */
function baseChemFromBalance(category: PositionCategory, net: number): number {
  if (category === 'wrong') return 0;
  const tiers: Record<Exclude<PositionCategory, 'wrong'>, [number, number, number, number]> = {
    perfect: [9, 6, 3, 1],
    related: [8, 5, 2, 0],
    outOfRole: [5, 3, 1, 0],
  };
  const t = tiers[category];
  const idx = net >= 0 ? 0 : net === -1 ? 1 : net === -2 ? 2 : 3;
  return t[idx];
}

// ─── League & Nation Normalization ─────────────────────────────────────────────

/**
 * Normalize a league name across SoFIFA CSV, Futbin Special Cards, and Manager
 * definitions so cross-source players in the same league always link.
 */
export function normalizeLeague(name: string): string {
  const s = (name || '').toLowerCase().trim();
  if (!s) return '';
  if (s === 'icons' || s === 'fut_legends') return 'icons';
  if (s.includes('ukrain')) return 'ukraine';
  if (s.includes('premier') || s.includes('england') || s.includes('barclays')) return 'premier';
  if (
    (s.includes('laliga') || s.includes('la liga') || s.includes('spain primera')) &&
    !s.includes('2') &&
    !s.includes('hypermotion')
  ) {
    return 'laliga';
  }
  if (s.includes('ecuador') || s.includes('ligapro')) return 'ecuador';
  if (s.includes('série a') || s.includes('brazil')) return 'brazil';
  if (s.includes('serie a') || s.includes('seriea') || s.includes('calcio a')) return 'seriea';
  if (s.includes('ö. bundesliga') || s.includes('austria')) return 'austria';
  if (s.includes('bundesliga') && !s.includes('2')) return 'bundesliga';
  if (s.includes('ligue 1') || s.includes('ligue1')) return 'ligue1';
  if (s.includes('eredivisie')) return 'eredivisie';
  if (s.includes('primeira liga') || s.includes('liga portugal') || s.includes('portugal')) {
    return 'portugal';
  }
  if (s.includes('saudi') || s.includes('roshn')) return 'saudi';
  if (s.includes('major league soccer') || s === 'mls') return 'mls';
  if (s.includes('süper lig') || s.includes('super lig') || s.includes('trendyol')) {
    return 'superlig';
  }
  if (s.includes('1a pro league') || s.includes('jupiler')) return 'proleague_be';
  if (s.includes('scottish') || s === 'premiership') return 'scotland';
  if (s.includes('liga profesional') || s === 'lpf') return 'argentina';
  if (s.includes('championship')) return 'championship';
  return s;
}

function normalizeNation(name: string): string {
  return (name || '').toLowerCase().trim();
}

const PSEUDO_CLUBS = new Set(['hero', 'icons', 'ea fc icons', 'special', 'free agent', '']);

function isRealClub(clubName: string | undefined): boolean {
  if (!clubName) return false;
  return !PSEUDO_CLUBS.has(clubName.toLowerCase().trim());
}

export function isLegendOrIcon(p: Player): boolean {
  return !!(
    p.isLegend ||
    p.cardType === 'icon' ||
    p.cardType === 'thunderstruck_icon' ||
    normalizeLeague(p.leagueName) === 'icons'
  );
}

export function isHeroCard(p: Player): boolean {
  return p.cardType === 'hero';
}

// ─── Link quality between two players ──────────────────────────────────────────

function shared(a: Player, b: Player) {
  const clubMatch =
    isRealClub(a.clubName) &&
    isRealClub(b.clubName) &&
    a.clubName.toLowerCase().trim() === b.clubName.toLowerCase().trim();
  const la = normalizeLeague(a.leagueName);
  const lb = normalizeLeague(b.leagueName);
  const leagueMatch = !!la && !!lb && la !== 'icons' && la === lb;
  const na = normalizeNation(a.nationalityName);
  const nb = normalizeNation(b.nationalityName);
  const nationMatch = !!na && !!nb && na === nb;

  return {
    club: clubMatch,
    league: leagueMatch,
    nation: nationMatch,
  };
}

/**
 * FUT-style link quality:
 *  - green  : Strong (+1) or Hyper (+2) link
 *  - yellow : Weak (0) link
 *  - red    : Dead (-1) link
 */
export function linkQuality(a: Player, b: Player): LinkQuality {
  const i = linkIntensity(a, b);
  return i >= 1 ? 'green' : i === 0 ? 'yellow' : 'red';
}

/**
 * FUT 16 "Net Link Balance" intensity for a single active link:
 *   +2 Hyper  — same club AND same nationality (or Hero + same league & nation)
 *   +1 Strong — same club, OR (same league AND same nationality), OR Legend/Icon
 *               same-nation / Legend-to-Legend, OR Hero same-league
 *    0 Weak   — same league only, OR same nationality only, OR Legend to any
 *   -1 Dead   — nothing shared
 */
export function linkIntensity(a: Player, b: Player): number {
  const aLegend = isLegendOrIcon(a);
  const bLegend = isLegendOrIcon(b);
  if (aLegend || bLegend) {
    if (aLegend && bLegend) return 1;
    const legend = aLegend ? a : b;
    const other = aLegend ? b : a;
    return normalizeNation(legend.nationalityName) &&
      normalizeNation(legend.nationalityName) === normalizeNation(other.nationalityName)
      ? 1
      : 0;
  }

  const s = shared(a, b);

  // FUT Heroes: automatic Strong (+1) link to anyone in the same league
  // (and Hyper +2 if same league AND same nationality).
  if (isHeroCard(a) || isHeroCard(b)) {
    if (s.league && s.nation) return 2;
    if (s.league) return 1;
    if (s.nation) return 0;
    return -1;
  }

  if (s.club && s.nation) return 2;
  if (s.club || (s.league && s.nation)) return 1;
  if (s.league || s.nation) return 0;
  return -1;
}

// ─── Manager bonus ─────────────────────────────────────────────────────────────

function managerBoost(player: Player, manager: Manager | null | undefined): number {
  if (!manager) return 0;
  if (normalizeNation(manager.nationalityName) === normalizeNation(player.nationalityName)) {
    return 1;
  }
  const ml = normalizeLeague(manager.leagueName);
  const pl = normalizeLeague(player.leagueName);
  if (ml && pl && ml === pl) {
    return 1;
  }
  return 0;
}

// ─── Main calculation ──────────────────────────────────────────────────────────

/**
 * Calculate FUT-style chemistry for the current starters.
 * Returns per-player chem (0–10 indexed by slotIndex), pitch links, and
 * normalized team chemistry (0–100).
 */
export function calculateChemistry(
  starters: DraftedPlayer[],
  formation: Formation,
  manager?: Manager | null
): ChemistryPreview {
  const adj = getAdjacency(formation);
  const slotCount = formation.positions.length;

  const bySlot: (DraftedPlayer | undefined)[] = new Array(slotCount).fill(undefined);
  for (const dp of starters) {
    if (dp.slotIndex >= 0 && dp.slotIndex < slotCount) {
      bySlot[dp.slotIndex] = dp;
    }
  }

  const perPlayer: number[] = new Array(slotCount).fill(0);
  const links: ChemistryLink[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < slotCount; i++) {
    const player = bySlot[i];
    if (!player) continue;

    const slot = formation.positions[i];
    if (!slot) continue;

    let net = 0;
    for (const j of adj[i] ?? []) {
      const neighbor = bySlot[j];
      if (!neighbor) continue;
      net += linkIntensity(player.player, neighbor.player);

      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seenPairs.has(key)) {
        seenPairs.add(key);
        links.push({
          from: Math.min(i, j),
          to: Math.max(i, j),
          quality: linkQuality(player.player, neighbor.player),
        });
      }
    }

    const category = positionCategory(
      player.player.position,
      slot.positionGroup,
      player.player.altPositions
    );
    const base = baseChemFromBalance(category, net);
    const loyalty = 1;
    const mgr = managerBoost(player.player, manager) > 0 ? 1 : 0;
    perPlayer[i] = Math.max(0, Math.min(10, base + loyalty + mgr));
  }

  const rawTotal = perPlayer.reduce((a, b) => a + b, 0);
  const total = Math.min(100, rawTotal);

  return { perPlayer, links, total };
}

/**
 * Preview chemistry if a candidate were placed at a given slot.
 */
export function previewChemistryWithCandidate(
  currentStarters: DraftedPlayer[],
  candidate: DraftedPlayer,
  formation: Formation,
  manager?: Manager | null
): ChemistryPreview {
  const hypothetical = currentStarters.filter(
    (s) => s.slotIndex !== candidate.slotIndex
  );
  hypothetical.push(candidate);
  return calculateChemistry(hypothetical, formation, manager);
}
