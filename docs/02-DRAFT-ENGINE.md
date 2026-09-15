# 02 — Draft Engine

## Authentic FUT 16 flow (this is the reference, follow it)

Verified against EA's own FUT Draft announcement and the FIFA 16 Draft guides:

1. Entry costs 15,000 coins / 300 points / 1 Draft Token.
2. Single-player picks a difficulty (affects coin payout, not the reward ladder).
3. Choose 1 of **5 randomly sampled formations**. **Locked for the entire series** — you can only
   change it by starting over.
4. Pick a **captain from 5 superstars**. He is placed automatically.
5. Fill out the rest of a **23-man squad** (XI + 7 subs + 5 reserves) by choosing from **a random
   draw of 5** for each position.
6. Pick a **manager from 5**.
7. Rearrange freely to improve chemistry.
8. Play **up to 4 knockout matches**. Any loss ends the series. Rewards scale with wins; losing
   the first match still returns roughly the entry fee.
9. Draft players cannot be kept.

Any item can appear, including specials and Legends/Icons, and past special editions (a TOTY card
can show up months after TOTY).

## State machine

```ts
type Phase =
  | 'LANDING'
  | 'ENTRY'            // NEW: fee + difficulty select
  | 'FORMATION_PICK'
  | 'CAPTAIN_PICK'
  | 'DRAFT_FILL'
  | 'MANAGER_PICK'
  | 'SQUAD_REVIEW'
  | 'DRAFT_SCORE'
  | 'BRACKET'
  | 'MATCH_SIM'
  | 'POST_MATCH'
  | 'SERIES_END'       // trophy or eliminated
  | 'REWARDS';
```

Transitions are a pure reducer. `useDraft.ts` becomes a thin wrapper over
`src/engine/draftMachine.ts` so the whole flow is testable headlessly. Every transition returns a
new immutable state; every state is serialisable (see 06).

## Determinism: do this first, everything depends on it

Nothing in the current build is seeded, which blocks resume, daily drafts, reproducible shares and
distribution tests. One RNG, threaded through state.

```ts
// src/engine/rng.ts
export function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...parts: (string | number)[]): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (const p of parts) for (const ch of String(p)) {
    h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
```

Rules:
- **`Math.random()` is banned outside `rng.ts`.** Add an ESLint `no-restricted-properties` rule
  and a test that greps `src/engine` and `src/hooks` for it.
- State carries `{ seed: number, cursor: number }`. Every draw increments `cursor`. Resume restores
  both and re-derives the generator, so the same pack opens the same way.
- Two RNG modes:
  - **Free play**: one sequential stream from `hashSeed(runId)`.
  - **Daily**: per-draw independent streams from `hashSeed(dailyKey, slotId, drawIndex)`. Draws do
    not depend on the order you fill slots, so two players get identical options regardless of
    their pick order. That is what makes a daily leaderboard fair.

## Formation sampling

~26 formation definitions. Sample 5 with stratification so the choice is interesting:

- Exactly one from each of: back-3 group, back-4 group, back-5 group.
- Remaining 2 sampled from the rest without replacement.
- Never two formations with identical slot sets.
- Attach a shape label (`Counter`, `Wing Play`, `Anchored`, …) — already present, keep it.

## Squad shape and draw order

```
XI:        11 slots, formation-defined
Bench:     7 slots, drawn in FIFA order: GK, DEF, DEF, MID, MID, ATT, ATT
Reserves:  5 slots, wildcard (any position)
Total:     23
```

Bench and reserve slots constrain the *position group* of the draw, not the exact position.

## The draw algorithm

This is the heart of the product. Spec it precisely and test its distributions.

```ts
interface DrawContext {
  slot: SlotSpec;            // { kind: 'xi'|'bench'|'reserve', position?: Position, group: PosGroup }
  pickIndex: number;         // 0-based across the whole 22 non-captain picks
  squad: DraftedItem[];      // what's already picked (for affinity + dedupe)
  specialsDrafted: number;
  rng: () => number;
  pool: PoolIndex;
  mode: 'free' | 'daily';
}
function drawFive(ctx: DrawContext): PlayerItem[]
```

### Step 1 — Rating band

Pick a band per candidate from a per-phase table. Bands: `94+`, `91-93`, `88-90`, `85-87`,
`82-84`, `79-81`, `75-78`.

| Phase | 94+ | 91-93 | 88-90 | 85-87 | 82-84 | 79-81 | 75-78 |
|---|---|---|---|---|---|---|---|
| Captain (5 of 5) | .06 | .24 | .45 | .25 | — | — | — |
| XI picks 1–6 | .010 | .050 | .160 | .300 | .300 | .150 | .030 |
| XI picks 7–10 | .005 | .035 | .130 | .280 | .320 | .190 | .040 |
| Bench | — | .010 | .060 | .190 | .330 | .290 | .120 |
| Reserves | — | .005 | .030 | .130 | .300 | .350 | .185 |

Tune the constants in `src/engine/config/drawTables.ts`, never inline.

### Step 2 — Position eligibility weight

Within the band, weight candidates by how well they fit the slot:

| Fit | Weight |
|---|---|
| Primary position matches slot | 1.00 |
| Alt position matches slot | 0.45 |
| Related position (per the chemistry position table, 03) | 0.30 |
| Unrelated | 0.05 |
| Wrong (e.g. a GK for ST, or outfielder for GK) | 0 |

GK slots draw **only** goalkeepers. Reserve slots use group weight 1.0 across the group.

### Step 3 — Affinity seeding (this is what makes chemistry solvable)

With probability `P_affinity` (free play: **0.55**; daily: **0** — fairness beats flavour), the
draw is anchored:

1. Choose an anchor from players already linked to this slot in the formation's link map, weighted
   toward anchors with low current individual chemistry.
2. Force **2 of the 5** candidates to share the anchor's `clubId`, `leagueId`, or `nationId`
   (priority: club > nation+league > league > nation).
3. The other 3 are unconstrained.

Without this, a 23-man draft from a 5000-player pool almost never produces solvable chemistry and
the puzzle disappears. With it, a good player can reliably build 90+ chem and a careless one can't.

### Step 4 — Rarity / specials

```
p_special(pick) = SPECIAL_BASE[phase] * 0.65 ** specialsDrafted
SPECIAL_BASE = { captain: 0.55, xi: 0.18, bench: 0.10, reserve: 0.07 }
p_special floor = 0.02   // never fully dry
```

Within specials, distribute: `totw .46, promo .28, hero .14, icon .12`. Captain draw guarantees at
least one special among the five.

For non-specials, respect rarity by band: 88+ is always `gold_rare`; 82–87 mostly `gold_rare` with
some `gold`; 79–81 `gold`; 75–78 `gold` plus occasional `silver_rare` (this is the "more silvers
early" flavour from the backlog, without breaking the power level).

### Step 5 — Dedupe and finalise

- Reject any `eaId` already in the squad (not just `id` — you don't want two Mbappé items).
- Reject duplicates within the five.
- If the filtered candidate set for a slot has fewer than 5 members, widen bands outward one step
  at a time, then relax position weight, then (last resort) allow a `wrong`-fit filler. Log a
  warning with the slot so pool gaps surface in testing.
- Shuffle the final five with the same RNG so the special isn't always in the same position.

### Invariants the tests must hold (10,000 simulated drafts)

| Metric | Target |
|---|---|
| Mean XI rating | 84.0 – 87.0 |
| p10 / p90 XI rating | ≥ 81 / ≤ 90 |
| Specials per 23-man squad | mean 2.5 – 4.5, p99 ≤ 9 |
| Captain rating | min 88 |
| Achievable team chemistry with greedy optimal play | ≥ 90 in ≥ 85% of drafts |
| Draft score (chem + rating) | p5 ≥ 160, p95 ≤ 198 |
| Slots that ever fall back to `wrong` fit | < 0.5% |
| Same seed twice | byte-identical draft |

## Quick Sim (auto-pick)

Greedy with a chemistry-aware objective, not "highest rating":

```
score(candidate) = 0.45 * normalisedRating
                 + 0.45 * Δ(teamChemistry if placed)
                 + 0.10 * positionFitBonus
```

Evaluate all 5, take the max, break ties by rating. For the manager, pick the one maximising
`Σ manager bonus` across the XI — that's already the behaviour, keep it. Quick Sim must use the
same RNG stream so a quick-simmed run is still reproducible.

## Swaps and undraft

- No undraft (authentic).
- Swap any two drafted players by tap-tap or drag, including bench/reserve ↔ XI, at any point
  during `DRAFT_FILL` and `SQUAD_REVIEW`.
- Swapping recomputes chemistry immediately with a 180 ms number roll on the chem pods.
- Captain can be moved during `SQUAD_REVIEW` only.

## Difficulty (new, for the `ENTRY` phase)

Five levels — Beginner / Semi-Pro / Professional / World Class / Legendary — applying a strength
multiplier to AI opponents (0.90, 0.95, 1.00, 1.05, 1.10) and a coin-payout multiplier. Does not
affect the reward ladder. This is the authentic single-player Draft behaviour.

## File layout

```
src/engine/
  draftMachine.ts      # reducer + transitions
  rng.ts
  draw.ts              # drawFive + helpers
  config/
    drawTables.ts      # band tables, special rates, affinity P
    formations.ts      # 26 defs + link maps (see 03)
  chemistry.ts         # see 03
  rating.ts            # squad rating (see 03)
  matchSim.ts          # see 04
  bracket.ts           # see 04
  autoPick.ts          # quick sim
src/hooks/useDraft.ts  # thin React binding, no game logic
```

Game logic must not import React. A test can play 10,000 full drafts in Node in under a minute;
that is the acceptance bar for this refactor.
