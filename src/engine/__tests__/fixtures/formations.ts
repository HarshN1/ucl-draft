import type { Formation } from '@/types';
import { FORMATIONS } from '@/data/formations';

/** Stable 4-3-3 for deterministic chemistry/adjacency tests. */
export const FORMATION_433: Formation =
  FORMATIONS.find((f) => f.name === '4-3-3' && f.label === 'Balanced') ??
  FORMATIONS[0]!;

export const ALL_FORMATIONS = FORMATIONS;
