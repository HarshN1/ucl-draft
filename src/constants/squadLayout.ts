/** Shared bench layout constants (draft + squad viewer). */

export const SUBS_COUNT = 7;
export const RESERVES_COUNT = 5;
export const BENCH_COUNT = SUBS_COUNT + RESERVES_COUNT;

/** FIFA draft sub order: GK → 2 DEF → 2 MID → 2 ATT (reserves are wildcards). */
export const BENCH_SUB_ROLES = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'ATT', 'ATT'] as const;
export type BenchSubRole = (typeof BENCH_SUB_ROLES)[number];

/** Internal draw roles — not shown on the bench UI. */
export const BENCH_DRAW_GROUPS = [
  ...BENCH_SUB_ROLES,
  'RES',
  'RES',
  'RES',
  'RES',
  'RES',
] as const;

/** @deprecated Use BENCH_DRAW_GROUPS — kept for imports that expect benchGroups. */
export const BENCH_GROUPS = BENCH_DRAW_GROUPS;

export const BENCH_ROLE_POSITIONS: Record<BenchSubRole, string[]> = {
  GK: ['GK'],
  DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB'],
  MID: ['CDM', 'CM', 'CAM', 'LM', 'RM', 'DM'],
  ATT: ['ST', 'CF', 'LW', 'RW'],
};
