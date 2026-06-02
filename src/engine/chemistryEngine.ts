import type { DraftedPlayer, Formation, ChemistryPreview } from '@/types';

// ─── Adjacency computation ────────────────────────────────────────────────────

/**
 * Build an adjacency list for a formation by measuring Euclidean distance
 * between player positions on the pitch (coords 0–100).
 * Two players are "linked" if distance < threshold.
 */
function buildAdjacency(formation: Formation, threshold = 30): number[][] {
  const positions = formation.positions;
  const n = positions.length;
  const adj: number[][] = Array.from({ length: n }, () => []);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }
  return adj;
}

// Cache adjacency lists per formation name to avoid recomputation
const adjacencyCache: Record<string, number[][]> = {};

function getAdjacency(formation: Formation): number[][] {
  if (!adjacencyCache[formation.name]) {
    adjacencyCache[formation.name] = buildAdjacency(formation);
  }
  return adjacencyCache[formation.name];
}

// ─── Link scoring ─────────────────────────────────────────────────────────────

function linkScore(a: DraftedPlayer, b: DraftedPlayer): number {
  if (a.player.clubName && a.player.clubName === b.player.clubName) return 3;
  if (a.player.leagueName && a.player.leagueName === b.player.leagueName) return 2;
  if (
    a.player.nationalityName &&
    a.player.nationalityName === b.player.nationalityName
  )
    return 1;
  return 0;
}

// ─── Per-player chemistry ────────────────────────────────────────────────────

/**
 * Raw link sum → 1–10 chem score.
 * 0 links → 1, each link score adds toward 10 (cap at 10).
 * Typical max raw: 3 neighbors × 3 pts = 9 raw → maps to 10.
 */
function rawToChemScore(rawSum: number): number {
  if (rawSum <= 0) return 1;
  // Scale: raw 9+ → 10, linear below
  const score = 1 + Math.floor((rawSum / 9) * 9);
  return Math.min(10, score);
}

// ─── Main exports ─────────────────────────────────────────────────────────────

/**
 * Calculate chemistry preview given current starters and formation.
 * Returns per-player scores (1–10) and normalized total (0–100).
 */
export function calculateChemistry(
  starters: DraftedPlayer[],
  formation: Formation
): ChemistryPreview {
  const adj = getAdjacency(formation);
  const n = starters.length;
  const perPlayer: number[] = [];

  for (let i = 0; i < n; i++) {
    let rawSum = 0;
    for (const j of adj[i]) {
      if (j < n) {
        rawSum += linkScore(starters[i], starters[j]);
      }
    }
    perPlayer.push(rawToChemScore(rawSum));
  }

  // Fill missing slots with 1 (for the live draft preview)
  while (perPlayer.length < formation.positions.length) {
    perPlayer.push(1);
  }

  const rawTotal = perPlayer.slice(0, 11).reduce((a, b) => a + b, 0);
  const total = Math.round((rawTotal / 110) * 100);

  return { perPlayer, total };
}

/**
 * Quick preview: what chemistry would player P give if placed at slotIndex?
 * Used in the draft picker to show chemistry diff before committing.
 */
export function previewChemistryWithCandidate(
  currentStarters: DraftedPlayer[],
  candidate: DraftedPlayer,
  formation: Formation
): ChemistryPreview {
  const hypothetical = [...currentStarters];
  // Replace or append at slotIndex
  const idx = candidate.slotIndex;
  if (idx < hypothetical.length) {
    hypothetical[idx] = candidate;
  } else {
    hypothetical.push(candidate);
  }
  return calculateChemistry(hypothetical, formation);
}
