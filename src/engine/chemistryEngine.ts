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
 *
 * Rather than a blunt distance radius (which over-connects central players and
 * makes the pitch look messy), we model how FUT actually links a formation:
 *
 *  1. Group positions into horizontal "lines" by their y coordinate.
 *  2. Link neighbours *within* each line (left-to-right).
 *  3. Link *between* adjacent lines using column alignment — each player bonds
 *     with the closest player (by x) in the line ahead and the line behind.
 *
 * This keeps every player connected into one web with a tidy 2–4 links each,
 * no lone strikers or full-backs, and no spider-web of crossing diagonals.
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

  // 3. Vertical links between adjacent lines — only where columns actually
  //    align (|Δx| ≤ TOL). This prevents a lone pivot from hoovering up a link
  //    to every player in the lines around it (the messy spider-web case).
  const TOL = 18;
  for (let L = 0; L < lines.length - 1; L++) {
    const A = lines[L];
    const B = lines[L + 1];
    if (!A || !B) continue;
    const isGkLine = A.length === 1 && positions[A[0]!]!.positionGroup === 'GK';
    if (isGkLine) {
      // GK bonds only with the closest one or two defenders.
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
    // Guarantee the two lines are connected even if nothing aligned.
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

  // 4. Top up any sparse node (0–1 links, e.g. a wide full-back) with its
  //    nearest outfield neighbour — this is how a LB picks up the LM ahead of
  //    it without everyone funnelling through the central pivot.
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
      if (!aj.includes(i)) aj.push(i); // links are undirected
    }
  }
  return adj;
}

const adjacencyCache: Record<string, number[][]> = {};

export function getAdjacency(formation: Formation): number[][] {
  // Cache by name + label (formations can share a name across variants).
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
function playerPositionGroup(position: string): string {
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

/** Is a player playing in (or adjacent to) their natural position? */
export function isInPosition(playerPosition: string, slotGroup: string): boolean {
  const pg = playerPositionGroup(playerPosition);
  if (pg === slotGroup) return true;
  return (RELATED_GROUPS[slotGroup] ?? []).includes(pg);
}

/** Strict natural-position match (exact group) — used for the out-of-position flag. */
export function isExactPosition(playerPosition: string, slotGroup: string): boolean {
  return playerPositionGroup(playerPosition) === slotGroup;
}

// ─── FUT 16 position-fit categories (Green / Yellow / Orange / Red) ─────────────

type PositionCategory = 'perfect' | 'related' | 'outOfRole' | 'wrong';

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

/** Classify how well a player's natural position fits a slot. */
export function positionCategory(playerPosition: string, slotGroup: string): PositionCategory {
  const pg = playerPositionGroup(playerPosition);
  if (pg === slotGroup) return 'perfect';
  if ((RELATED_BY_SLOT[slotGroup] ?? []).includes(pg)) return 'related';
  if ((OUTOFROLE_BY_SLOT[slotGroup] ?? []).includes(pg)) return 'outOfRole';
  return 'wrong';
}

/**
 * FUT 16 base individual chemistry from position fit × Net Link Balance.
 * Net Balance is the summed link intensity to active neighbours (green/hyper
 * links cancel dead links). A perfect position with a non-negative balance
 * peaks at 9 base — the remaining point comes from the Draft loyalty shield.
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

// ─── Link quality between two players ──────────────────────────────────────────

function shared(a: Player, b: Player) {
  return {
    club: !!a.clubName && a.clubName === b.clubName,
    league: !!a.leagueName && a.leagueName === b.leagueName,
    nation: !!a.nationalityName && a.nationalityName === b.nationalityName,
  };
}

/**
 * FUT-style link quality:
 *  - green  : same club, OR (same nation AND same league)
 *  - yellow : same league only, OR same nation only
 *  - red    : nothing shared
 */
export function linkQuality(a: Player, b: Player): LinkQuality {
  const i = linkIntensity(a, b);
  return i >= 1 ? 'green' : i === 0 ? 'yellow' : 'red';
}

/**
 * FUT 16 "Net Link Balance" intensity for a single active link:
 *   +2 Hyper  — same club AND same nationality
 *   +1 Strong — same club, OR (same league AND same nationality)
 *    0 Weak   — same league only, OR same nationality only
 *   -1 Dead   — nothing shared
 * Strong/Hyper links cancel out Dead links when summed across a slot.
 *
 * Legends are universal bridges: legend↔legend and legend↔same-nation are
 * Strong (+1), legend↔different-nation is Weak (0), and a legend NEVER emits a
 * dead (-1) link — it neutralises dead zones on the pitch.
 */
export function linkIntensity(a: Player, b: Player): number {
  if (a.isLegend || b.isLegend) {
    if (a.isLegend && b.isLegend) return 1;
    const legend = a.isLegend ? a : b;
    const other = a.isLegend ? b : a;
    return legend.nationalityName && legend.nationalityName === other.nationalityName ? 1 : 0;
  }
  const s = shared(a, b);
  if (s.club && s.nation) return 2;
  if (s.club || (s.league && s.nation)) return 1;
  if (s.league || s.nation) return 0;
  return -1;
}

// ─── Manager bonus ─────────────────────────────────────────────────────────────

/**
 * Normalize a league name to a canonical token so a hardcoded manager league
 * ("LaLiga") matches whatever the dataset uses ("LaLiga EA SPORTS",
 * "Spain Primera Division", etc.).
 */
export function normalizeLeague(name: string): string {
  const s = (name || '').toLowerCase();
  if (s.includes('premier') || s.includes('england')) return 'premier';
  if (s.includes('laliga') || s.includes('la liga') || s.includes('primera')) return 'laliga';
  if (s.includes('serie a') || s.includes('seriea')) return 'seriea';
  if (s.includes('bundesliga') && !s.includes('2.')) return 'bundesliga';
  if (s.includes('ligue 1') || s.includes('ligue1')) return 'ligue1';
  if (s.includes('eredivisie')) return 'eredivisie';
  if (s.includes('portugal') || s.includes('liga portugal')) return 'portugal';
  if (s.includes('brazil') || s.includes('série a') || s.includes('serie a tim')) return 'brazil';
  return s.trim();
}

function normalizeNation(name: string): string {
  return (name || '').toLowerCase().trim();
}

function managerBoost(player: Player, manager: Manager | null | undefined): number {
  if (!manager) return 0;
  if (normalizeNation(manager.nationalityName) === normalizeNation(player.nationalityName)) {
    return 1;
  }
  if (normalizeLeague(manager.leagueName) === normalizeLeague(player.leagueName)) {
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

  // Map slotIndex → drafted player
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

    // Net Link Balance: sum link intensities to active neighbours (green/hyper
    // links cancel dead red links). Links to empty slots count as 0 (neutral),
    // so early picks aren't penalised before their neighbours are drafted.
    let net = 0;
    for (const j of adj[i] ?? []) {
      const neighbor = bySlot[j];
      if (!neighbor) continue;
      net += linkIntensity(player.player, neighbor.player);

      // Record each undirected pair once for the pitch lines (colour by quality)
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seenPairs.has(key)) {
        seenPairs.add(key);
        links.push({ from: Math.min(i, j), to: Math.max(i, j), quality: linkQuality(player.player, neighbor.player) });
      }
    }

    // FUT 16 "9 + 1" rule: matrix base (max 9) + native Draft loyalty shield
    // (+1) + manager league/nation match (+1), capped at 10.
    const category = positionCategory(player.player.position, slot.positionGroup);
    const base = baseChemFromBalance(category, net);
    const loyalty = 1;
    const mgr = managerBoost(player.player, manager) > 0 ? 1 : 0;
    perPlayer[i] = Math.max(0, Math.min(10, base + loyalty + mgr));
  }

  // Team chemistry = exact sum of all active starters' chemistry, capped at 100.
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
