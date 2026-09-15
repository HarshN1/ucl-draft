# 03 — Chemistry & Squad Rating (exact FUT 16 math)

Two independent numbers feed the Draft Score. Both are currently approximations. Both have exact
published formulas. Implement them literally.

---

## Part A — Chemistry

### Top-level

```
Team Chemistry   TC = IC₁ + IC₂ + … + IC₁₁        (starting XI only, cap 100)
Individual Chem  IC = PLC + MB + LB               (cap 10, uncapped sum can reach 12)
In-match chem    C  = (IC × 0.75) + (TC × 0.025)  (0–10 scale, used by the match sim)
```

The in-match weighting is why individual chemistry matters more than the big 100 on screen: a
player on IC 10 in a TC 90 squad outperforms IC 9 in a TC 100 squad (9.75 vs 9.25). Use `C` — not
`TC` — as the per-player multiplier in the sim (see 04).

**Substitutes and reserves are assigned a flat Player Chemistry of 5** regardless of links. Do not
compute links for the bench, and do not include them in TC.

### PLC — position and links chemistry

`PLC = table[positionCategory][L-band]`, where

```
L = Σ(link values received from linked teammates) / (number of links)
```

Link values:

| Value | Name | Condition |
|---|---|---|
| 3 | Hyper (green) | Same nationality **and** same club |
| 2 | Strong (green) | Same club, different nation — **or** same nation and same league, different club |
| 1 | Weak (orange) | Same league only — **or** same nation only |
| 0 | Dead (red) | Nothing shared |

Position categories: **green** = natural (the slot equals the item's primary position), **yellow**
= related, **orange** = unrelated, **red** = wrong.

#### PLC table

EA never published the exact grid. This is a calibrated reconstruction pinned to the publicly
documented anchor cases. Put it in `src/engine/config/plcTable.ts` so it can be corrected in one
place without touching logic.

| L band | red | orange | yellow | green |
|---|---|---|---|---|
| L = 0 | 0 | 2 | 3 | 5 |
| 0 < L < 1 | 0 | 3 | 4 | 6 |
| 1 ≤ L < 1.6 | 1 | 5 | 6 | 8 |
| 1.6 ≤ L < 2 | 1 | 5 | 7 | 8 |
| 2 ≤ L < 2.6 | 2 | 6 | 8 | 9 |
| 2.6 ≤ L < 3 | 2 | 7 | 8 | 9 |
| L = 3 | 3 | 7 | 9 | 10 |

**Locked anchor cases — these are the unit tests, do not change the table in a way that breaks them:**

1. Orange position, `L = 1.67` (two strong + one weak over three links) → **PLC 5**, and the same
   value must hold anywhere in `1 ≤ L < 1.6`. (Documented FIFA 16 worked example.)
2. That same player with a matching manager and loyalty → **IC 7**.
3. Green position, `L = 2` (all strong links), no bonuses → **PLC 9**; with loyalty → **IC 10**.
4. Green position, `L = 3` → **PLC 10**.
5. Red position, `L = 0` → **PLC 0**, and `IC ≤ 2` even with both bonuses.
6. Monotonicity: PLC is non-decreasing in `L` for fixed category, and non-decreasing across
   red → orange → yellow → green for fixed `L`.

### MB — manager bonus

`+1` if the manager's nation **or** league matches the player's. Capped at `+1` even if both match.
Managers do not add to TC directly; they raise ICs, which raise TC.

### LB — loyalty bonus

`+1`. In Draft every item is effectively first-owner, so **loyalty is always on**. This is correct
behaviour, not a shortcut — remove it from the gap list.

### Icons and Heroes

Icons have no club or league, so they use a modified link table (FIFA 16 changed this specifically
so Icon-heavy squads weren't punished):

| Value | Condition |
|---|---|
| 3 | Icon ↔ another Icon of the same nationality |
| 2 | Icon ↔ another Icon of a different nationality, **or** Icon ↔ non-Icon of the same nationality |
| 1 | Icon ↔ non-Icon of a different nationality |
| 0 | **Never.** Icons have no dead links |

Heroes (a modern FC item with no FUT 16 equivalent) get: same-nation → 2, same-league → 2
(league-wide green club link), otherwise 1. Flag this in a comment as a deliberate modern addition,
and expose it as `HERO_LINK_MODE` so it can be switched to "treat as Icon" if it feels wrong.

Managers also have a `Legends`/`Icons` league option that grants MB to Icons — include it as one of
the five manager choices.

### Position relationship table

`src/engine/config/positionTable.ts`. Rows = slot on the pitch, columns = category for an item
whose primary position is X.

```
GK    green: GK                            | everything else: red
CB    green: CB    | yellow: LB,RB         | orange: LWB,RWB,CDM      | red: rest
LB    green: LB    | yellow: LWB,CB        | orange: RB,RWB,LM        | red: rest
RB    green: RB    | yellow: RWB,CB        | orange: LB,LWB,RM        | red: rest
LWB   green: LWB   | yellow: LB,LM         | orange: CB,RWB,LW        | red: rest
RWB   green: RWB   | yellow: RB,RM         | orange: CB,LWB,RW        | red: rest
CDM   green: CDM   | yellow: CM,CB         | orange: CAM,LWB,RWB      | red: rest
CM    green: CM    | yellow: CDM,CAM       | orange: LM,RM,ST         | red: rest
CAM   green: CAM   | yellow: CM,CF         | orange: CDM,LM,RM,ST     | red: rest
LM    green: LM    | yellow: LW,LWB        | orange: CM,CAM,RM,LB     | red: rest
RM    green: RM    | yellow: RW,RWB        | orange: CM,CAM,LM,RB     | red: rest
LW    green: LW    | yellow: LM,CF         | orange: ST,CAM,RW        | red: rest
RW    green: RW    | yellow: RM,CF         | orange: ST,CAM,LW        | red: rest
CF    green: CF    | yellow: ST,CAM        | orange: LW,RW,CM         | red: rest
ST    green: ST    | yellow: CF            | orange: LW,RW,CAM        | red: rest
```

An item's `altPositions` upgrade the category by one step (red→orange, orange→yellow, yellow→green)
if the alt matches the slot. This stands in for FUT position-change cards, which Draft doesn't have.

### Formation link maps

`src/engine/config/formations.ts`, one adjacency list per formation. Constraints (assert these in
tests for all 26 formations):

- Every slot has **2–7** links.
- Links are symmetric.
- GK links only to the centre-back(s) and, in back-4/5 shapes, the full-backs — never to midfield
  or attack.
- No link crosses the pitch laterally (LB never links RB).
- No link spans more than one vertical band (a CB never links a striker).
- The graph is connected.

Rendering: green line for value 3 and 2, orange for 1, red for 0. Draw lines *under* the cards with
`stroke-linecap: round`, 2 px, 55% opacity, and a 240 ms colour tween when a swap changes them.

### API

```ts
export interface ChemResult {
  perPlayer: Record<SlotId, { plc: number; mb: 0|1; lb: 0|1; ic: number; links: LinkView[] }>;
  teamChemistry: number;      // 0-100
  inMatch: Record<SlotId, number>;  // 0-10, the sim's input
}
export function computeChemistry(squad: Squad, formation: Formation, manager: Manager): ChemResult
```

Pure, synchronous, no React, memoised on `(squadHash, formationId, managerId)`.

---

## Part B — Squad Rating (this is currently wrong, and fixing it changes the game)

Real FUT does **not** use a plain XI average. It rates **18 players (XI + 7 subs)** with a
correction factor that overweights players above the squad average and half-weights the bench.

```
Given the 18 ratings IR₁…IR₁₈  (1–11 = starting XI, 12–18 = subs)

AR  = (ΣIR) / 18                                   // do NOT round
CF  = Σ over XI     of max(0, IRᵢ − AR)
    + Σ over subs   of max(0, IRᵢ − AR) / 2
SR  = floor( round(ΣIR + CF) / 18 )
```

Worked check (from the published FIFA 17/18-era formula): 14 players at 80 and 5 at 85 over an
18-man calculation yields AR ≈ 81.39, CF from the above-average players, and a squad rating a point
or two above the naive mean.

### Why this matters more than it looks

Right now the bench is cosmetic — seven of the twenty-three picks have zero consequence. Under the
real formula, bench picks move the Draft Score, so the last third of the draft stops being a
clickthrough. That is the single highest-value gameplay change in this document and it costs about
thirty lines.

The five reserves stay excluded, matching FUT.

Expect displayed ratings to drop ~1–2 points versus today (the current 89 is an XI mean). That is
correct. Update the tier thresholds accordingly:

| Draft Score (chem + rating) | Tier |
|---|---|
| 185+ | World Class |
| 172–184 | Elite |
| 158–171 | Strong |
| 140–157 | Good |
| < 140 | Scrappy |

### Tests

- The published worked example reproduces exactly.
- 11×99 + 7×99 → 99. All-equal squads → that rating (CF = 0).
- Swapping a 92 from bench to XI raises SR (CF weight doubles).
- SR is monotone: replacing any player with a higher-rated one never lowers SR.
- SR ∈ [40, 99] for every one of 10,000 simulated drafts.
