# 04 — Match Simulation & Tournament

## What's wrong with the current sim

From the screenshots: 13 shots / **9 on target** (real rate is 33–40%), **Big Chances 0–0** while
2.0 xG was generated (contradictory by definition), xG shown as integers, the **goalkeeper booked
for a cynical foul**, and all seven events are either "keeper tips it onto the post" or a card —
one goal in eight events. It reads as a random event picker rather than a match.

Fix: model the *chances*, then derive every displayed stat from the same chance list. Never
generate a stat independently of the events.

## Architecture

```
strength(squad, chem)  →  matchShape(home, away)  →  chanceList  →  events + stats + ratings
```

Everything downstream of `chanceList` is derived. One seed, one list, total internal consistency.

### 1. Team strength

Per unit, from attributes weighted by the player's slot in the formation, scaled by the player's
in-match chemistry `C` from 03:

```ts
const chemMult = 0.88 + 0.12 * (C / 10);   // IC 0 → 0.88, IC 10 → 1.00
```

That range is deliberate: chemistry should be worth roughly a 12% swing in effectiveness, enough
to matter, not enough to make a 100-chem 82-rated squad beat an 89-rated one reliably.

```
ATT = Σ over attacking-weighted slots of  w_slot × (0.35·finishing + 0.20·shotPower
      + 0.15·positioning(dri) + 0.15·pace + 0.15·composure) × chemMult
MID = Σ  w_slot × (0.30·shortPassing + 0.20·vision + 0.20·ballControl
      + 0.15·stamina + 0.15·interceptions) × chemMult
DEF = Σ  w_slot × (0.30·defAwareness + 0.25·standingTackle + 0.20·strength
      + 0.15·heading + 0.10·pace) × chemMult
GK  = (0.30·ref + 0.25·div + 0.20·han + 0.15·pos + 0.10·kic) × chemMult
```

Normalise each to a 0–100 index. Slot weights live in `formations.ts` (a CDM contributes 0.8 to MID
and 0.4 to DEF, etc.).

### 2. Match shape

```
dominance  = logistic((MID_h - MID_a) / 12)              // 0..1
possession = round(38 + 24 * dominance)                  // 38–62%, realistic band

xg_h = BASE_XG * exp(0.045*(ATT_h - DEF_a)/1) * tempo
xg_a = BASE_XG * exp(0.045*(ATT_a - DEF_h)/1) * tempo
BASE_XG = 1.35            // neutral-venue UCL knockout baseline
tempo   ~ N(1.0, 0.12)    // per-match variance, clamped [0.7, 1.4]
```

**No home advantage.** These are neutral-venue knockout ties; a 1.35 home multiplier would be wrong
and would also make the bracket unfair depending on which side the user is drawn on.

Total goals across 10,000 sims should land at **2.5–3.0 mean** with a **~26% draw rate before ET**.
Calibrate `BASE_XG` and the 0.045 coefficient to hit that, and assert it in tests.

### 3. Chance list

```
n_shots_h ~ Poisson(8 + 9 * dominance)         // ~8–17
per shot:  quality ~ Beta(1.6, 6.4) scaled     // mean xG/shot ≈ 0.11, long tail
           then rescaled so Σquality == xg_h
```

For each shot:
- **Minute**: sample from a distribution weighted to the second half, with small spikes at 43–45'
  and 88–90' (`weights = [0.9,0.95,1.0,1.05,1.1,1.15]` over six 15-minute blocks).
- **Shooter**: weighted by slot (ST 0.30, W 0.18 each, CAM 0.12, CM 0.06, FB 0.02, CB 0.03 on set
  pieces, GK 0) × finishing × chemMult.
- **Assister**: a linked teammate (use the chemistry link map — nice touch, the chem graph doubles
  as a passing network), weighted by vision + shortPassing. 70% of goals get an assist.
- **Outcome**: `goal` if `rng() < quality × gkFactor`, where
  `gkFactor = 1 - 0.25*(GK_opp - 75)/25` clamped to [0.80, 1.20].
  Else: `saved` (weighted by GK), `off_target`, `blocked`, `woodwork` (3% of non-goals).
- **Big chance**: `quality ≥ 0.30`. Report the count. This automatically fixes the 0–0 big-chances
  contradiction.
- **On target** = goals + saved + woodwork. Assert the ratio lands in 0.30–0.45 across sims.
- **Corners**: `Poisson(2 + 4*dominance)`, 3–9 typical. ~4% convert into an existing chance rather
  than adding a new one.

### 4. Discipline

```
fouls ~ Poisson(9 + 5*(1 - dominance))
foul committer weighted by:  aggression × slotFoulWeight
  slotFoulWeight: CB 1.25, CDM 1.30, FB 1.15, CM 1.00, W 0.75, ST 0.70, GK 0.05
p(yellow | foul) = 0.11 + 0.04 * (aggression - 70)/30
p(second yellow) = 0.03 per already-booked player per subsequent foul
p(straight red) = 0.012 per match
```

The `GK 0.05` weight is the fix for Buffon getting booked. A sent-off player reduces that team's
`xg` by 22% for the remaining minutes and raises the opponent's by 18%.

### 5. Extra time and penalties

- Draw after 90 → 30 minutes of ET with `xg` scaled by `30/90 × 0.85` (tired, cagey).
- Still level → shootout: 5 kicks each then sudden death.
  `p(score) = 0.76 + 0.004*(composure - 70) - 0.003*(GK_ref - 70)`, clamp [0.55, 0.92].
  Real shootout conversion is ~75%; assert the sim's aggregate lands 0.70–0.80.
- Emit shootout kicks as events so the UI can render the classic kick-by-kick grid.

### 6. Player match ratings and MOTM

```
base        = 6.0   (GK 6.3)
+ 1.10 per goal        + 0.65 per assist
+ 0.35 per big chance created
+ 0.20 per save (GK)   + 0.60 clean sheet (GK and defenders, if the team kept one)
+ 0.30 if team won     − 0.20 if team lost
+ 0.25 * (xG overperformance)   − 0.30 per big chance missed
− 0.40 yellow          − 1.50 red         − 0.50 penalty missed
+ N(0, 0.25) jitter
clamp [4.0, 10.0], round to 1 dp
MOTM = argmax, ties broken by goals then rating then OVR
```

Goals must dominate: a 1–0 where the scorer isn't in the top two ratings is a model bug.

### 7. Presentation (this is where the "cinematic" budget goes — no 11v11)

- **Clock**: real ticking minute counter, 90 minutes in ~35 seconds default, with speeds ×1 / ×2 /
  ×4 and a **Skip to result**. Speed persists in localStorage.
- **Scorebug**: fixed top bar, broadcast style — crest, abbreviation, score, minute. Not a card.
- **Event feed**: newest at the bottom, auto-scrolling, icons per type, goals get a 400 ms
  highlight flash and a crowd sting. Commentary strings are templated from the event object
  (`{scorer} {verb} {qualifier}`) with 6–10 variants per event type so it doesn't repeat inside one
  match.
- **Momentum bar**: a rolling 10-minute xG differential, drawn as a two-sided bar. Cheap, and it
  makes a sim feel like a match.
- **HT / FT beats**: a 1.2 s interstitial with the score and a one-line summary.
- **Stats panel**: possession, shots, on target, big chances, corners, xG to 2 dp, fouls, cards.
  All derived from the chance list.

### 8. Determinism

`simulateMatch({ home, away, seed })` where `seed = hashSeed(runId, roundIndex)`. Same inputs →
identical match, so a shared result link replays exactly and the leaderboard can be verified
server-side.

---

## Tournament

### AI clubs built from the real dataset (replaces hardcoded clubs)

Do not hardcode opponent strength. For each of the 16 clubs, build a real squad at data-build time:

1. Filter the item pool to `clubId === club.id`, base items only (no specials) so the AI isn't
   powered by promos.
2. Pick the best XI for a club-appropriate formation by `rating × positionFit`.
3. Bench = next 7. Compute ATT/MID/DEF with `chemMult = 1.0` (club squads have perfect chemistry by
   definition — nice detail, and true to FUT).
4. Emit `public/data/<version>/clubs-ai.json` with the squad ids, so the sim can name real scorers.

This kills three problems at once: opponent balance becomes data-driven, event feeds name real
players ("Wirtz rises highest" instead of "RB Leipzig goes into the book"), and the FC 27 refresh
updates the AI automatically.

Cap AI squad strength at the 96th percentile of user draft strength so a great draft can actually
win the trophy; apply the difficulty multiplier from 02 on top.

### Bracket

- 16 teams: the user + 15 clubs. Four rounds — R16, QF, SF, Final. **This is exactly the four-match
  FUT Draft series.**
- **Seeded draw**, not pure random: seed the user by draft-score tier, seed clubs by computed
  strength, then pair 1v16, 2v15, … within the standard bracket tree. Avoids the current situation
  where a 189 draft meets Real Madrid in the R16 by coin flip.
- Render a "draw ceremony": slots fill one at a time, 220 ms apart, the user's tie last.
- AI-vs-AI ties sim silently and instantly; only the user's tie is presented.
- Bracket fits the viewport with no horizontal scroll (already true — keep it) and highlights the
  user's path through the tree as rounds resolve.

### Rewards ladder (cosmetic, Q4)

| Wins | Reward shown |
|---|---|
| 0 | Bronze Pack + 8,000 coins |
| 1 | Premium Gold Pack + 15,000 |
| 2 | Prime Gold Pack + 25,000 |
| 3 | Mega Pack + 40,000 |
| 4 (champion) | Jumbo Rare Players Pack + 75,000 + trophy |

Entry fee 15,000. Losing round one roughly refunds the entry, which is what FUT 16 did. Wallet in
localStorage, shown in the header, no purchases, no effect on leaderboard rank.
