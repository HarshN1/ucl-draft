import type { Player, Formation } from '@/types';

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

// ─── OVR weight buckets ───────────────────────────────────────────────────────

function getWeight(ovr: number): number {
  if (ovr >= 90) return 5;
  if (ovr >= 85) return 20;
  if (ovr >= 80) return 40;
  return 35;
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

/**
 * Draw 5 unique player cards for a given formation slot.
 * Excludes already-drafted players.
 */
export function drawFiveCards(
  pool: Player[],
  positionGroup: string,
  alreadyDrafted: Set<number>
): Player[] {
  const acceptable = getAcceptablePositions(positionGroup);
  let candidates = pool.filter(
    (p) => acceptable.includes(p.position) && !alreadyDrafted.has(p.id)
  );

  // Fallback: expand to all outfield players if pool too thin
  if (candidates.length < 5) {
    candidates = pool.filter(
      (p) =>
        !alreadyDrafted.has(p.id) &&
        (positionGroup === 'GK' ? p.position === 'GK' : p.position !== 'GK')
    );
  }

  // Last resort
  if (candidates.length < 5) {
    candidates = pool.filter((p) => !alreadyDrafted.has(p.id));
  }

  const drawn: Player[] = [];
  const usedIds = new Set<number>();

  const maxAttempts = candidates.length * 3;
  let attempts = 0;

  while (drawn.length < 5 && candidates.length > 0 && attempts < maxAttempts) {
    attempts++;
    const weights = candidates.map((p) => getWeight(p.overall));
    const pick = weightedSample(candidates, weights);
    if (!usedIds.has(pick.id)) {
      drawn.push(pick);
      usedIds.add(pick.id);
      candidates = candidates.filter((p) => p.id !== pick.id);
    }
  }

  return drawn;
}

/**
 * Draw 5 captain candidates (all OVR >= 85).
 */
export function drawCaptainCandidates(
  pool: Player[],
  alreadyDrafted: Set<number>
): Player[] {
  const eligible = pool.filter(
    (p) => p.overall >= 85 && !alreadyDrafted.has(p.id)
  );

  if (eligible.length < 5) {
    // Fallback: just take top OVR players
    return pool
      .filter((p) => !alreadyDrafted.has(p.id))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 5);
  }

  // Uniform random draw among eligible
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

/**
 * Draw 5 sub candidates with heavier weighting toward lower-rated players.
 */
export function drawSubCandidates(
  pool: Player[],
  positionGroup: string,
  alreadyDrafted: Set<number>
): Player[] {
  const acceptable = getAcceptablePositions(positionGroup);
  let candidates = pool.filter(
    (p) => acceptable.includes(p.position) && !alreadyDrafted.has(p.id)
  );

  if (candidates.length < 5) {
    candidates = pool.filter((p) => !alreadyDrafted.has(p.id));
  }

  const drawn: Player[] = [];
  const usedIds = new Set<number>();

  // Invert weights for subs (more lower-rated cards)
  const maxAttempts = candidates.length * 3;
  let attempts = 0;

  while (drawn.length < 5 && candidates.length > 0 && attempts < maxAttempts) {
    attempts++;
    // Inverted weights: lower OVR = higher chance
    const weights = candidates.map((p) => {
      const w = getWeight(p.overall);
      return Math.max(1, 40 - w); // invert roughly
    });
    const pick = weightedSample(candidates, weights);
    if (!usedIds.has(pick.id)) {
      drawn.push(pick);
      usedIds.add(pick.id);
      candidates = candidates.filter((p) => p.id !== pick.id);
    }
  }

  return drawn;
}

/**
 * Randomly select 5 formations from the pool of 8 for the formation picker.
 */
export function sampleFormations(formations: Formation[]): Formation[] {
  const shuffled = [...formations].sort(() => Math.random() - 0.5);
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
