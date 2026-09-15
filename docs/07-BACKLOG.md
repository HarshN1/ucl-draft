# 07 — Backlog

The agent works this file top to bottom. One task = one commit. Check the box, append a line to
`docs/PROGRESS.md`, move on. Never skip a `[GATE]`.

Task format: `- [ ] ID — what | files | acceptance | commit`

## Budget legend

No paid overage is available on this project. Model choice is a budget decision, so each phase is
tagged:

| Tag | Meaning | Run it on |
|---|---|---|
| `[CHEAP]` | Mechanical, fully specified, hard to get wrong | Cursor Composer, or Claude Code on the cheaper model |
| `[THINK]` | Correctness-critical: formulas, distributions, state machines | The best model you have quota for. Narrow context, one doc |
| `[EYES]` | Needs a human looking at the screen to judge | Do it awake, not in a night run |

Phase tags: 0 `[CHEAP]` · 1 `[THINK]` · 2 `[THINK]` · 3 `[THINK]` · 4 `[CHEAP]` · 5 `[THINK]` ·
6 `[CHEAP]` · 7 `[CHEAP]`+`[EYES]` · 8 `[CHEAP]`+`[EYES]` · 9 `[EYES]` · 10 `[CHEAP]` ·
11 `[THINK]` for 11.4, rest `[CHEAP]` · 12 `[CHEAP]` · R `[CHEAP]`

**Phase R is not optional and never gets skipped for lack of budget** — it is the phase that makes
the remaining budget someone else's problem instead of lost work. See the bottom of this file.

---

## Phase 0 — Repo hygiene `[GATE]`

- [ ] **0.1** Commit the existing uncommitted work on `feat/ucl-draft-app` in logical chunks, push, open a PR to `main`, merge. Nothing else starts until git matches production. | `commit: chore: land in-flight draft app work`
- [ ] **0.2** `tsconfig`: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`. Fix all resulting errors. Acceptance: `pnpm typecheck` clean. | `commit: chore(ts): enable strict mode`
- [ ] **0.3** Add `pnpm verify` = `typecheck && vitest run && next build`. Add GitHub Actions running it on push + PR. Acceptance: green CI badge. | `commit: ci: add verify pipeline`
- [ ] **0.4** Connect the Vercel project to the GitHub repo; disable CLI deploys from local. Confirm Preview + Production env vars incl. Upstash. Acceptance: a push to `main` deploys. | `commit: chore: git-based deploys`
- [ ] **0.5** Add `docs/PROGRESS.md` (append-only log) and `docs/DECISIONS.md` link in README. | `commit: docs: progress log`
- [ ] **0.6** ESLint: ban `Math.random` outside `src/engine/rng.ts`; ban hardcoded hex colours outside `globals.css`. Acceptance: lint fails on a deliberate violation. | `commit: chore(lint): ban raw random and hex`

## Phase 1 — Determinism + resume

- [ ] **1.1** `src/engine/rng.ts` — `mulberry32`, `hashSeed`, a `Rng` class tracking `cursor`. Unit tests: same seed → same sequence; cursor restore reproduces. | `commit: feat(engine): seeded rng`
- [ ] **1.2** Thread `{seed, cursor}` through draft state; route every existing random call through it. Acceptance: two runs with the same seed produce identical formations, captain draw and all 22 draws. | `commit: feat(engine): seed all draft randomness`
- [ ] **1.3** Extract the flow into `src/engine/draftMachine.ts` as a pure reducer. `useDraft.ts` becomes a binding with no logic. Acceptance: a Node test plays a full draft with zero React imports. | `commit: refactor(engine): pure draft state machine`
- [ ] **1.4** Persistence per 06.A: schema, zod validation, session + localStorage mirror, debounced writes. | `commit: feat: persist run state`
- [ ] **1.5** Restore UI: inline Resume / Start fresh card on landing; discard on schema or dataVersion mismatch. | `commit: feat: resume an interrupted draft`
- [ ] **1.6** Playwright: 6 picks → reload → same 6 picks and same pending draw. | `commit: test(e2e): mid-draft resume`

## Phase 2 — Chemistry + rating correctness

- [ ] **2.1** `config/positionTable.ts` per 03, with alt-position upgrade rule + tests for all 15 slots. | `commit: feat(chem): position relationship table`
- [ ] **2.2** `config/plcTable.ts` + `chemistry.ts` implementing `IC = PLC + MB + LB`, `L = Σ/n`, link values 3/2/1/0, Icon and Hero rules, bench flat 5, `TC` cap 100, `inMatch = IC*0.75 + TC*0.025`. | `commit: feat(chem): exact FUT16 chemistry model`
- [ ] **2.3** Tests: the six locked anchor cases in 03, plus monotonicity properties over 1000 random squads. | `commit: test(chem): anchor and monotonicity cases`
- [ ] **2.4** Audit all 26 formation link maps against the six structural invariants in 03; fix violations. | `commit: fix(chem): validate formation link maps`
- [ ] **2.5** `rating.ts` — 18-player squad rating with the correction factor per 03.B. Tests include the published worked example. | `commit: feat(engine): real FUT squad rating`
- [ ] **2.6** Retune Draft Score tiers to the new rating distribution; update the score screen copy. | `commit: feat: rebalance draft score tiers`

## Phase 3 — Draw engine

- [ ] **3.1** `config/drawTables.ts` — band tables, special rates, affinity probability, fit weights. | `commit: feat(draw): externalise draw tables`
- [ ] **3.2** `draw.ts` — `drawFive` per 02 steps 1–5, including widening fallback and shuffle. | `commit: feat(draw): banded affinity-seeded draw`
- [ ] **3.3** Statistical test harness: simulate 10,000 drafts, assert every invariant in 02's table, write `data/reports/draw-distribution.md`. | `commit: test(draw): distribution invariants`
- [ ] **3.4** Captain draw: 88+ floor, line diversity, ≥1 special guaranteed. | `commit: feat(draw): captain draw rules`
- [ ] **3.5** Bench draw order GK→DEF→DEF→MID→MID→ATT→ATT; reserves wildcard. | `commit: feat(draw): fifa bench draw order`
- [ ] **3.6** `autoPick.ts` Quick Sim with the chem-aware objective; must consume the same RNG stream. | `commit: feat: chemistry-aware quick sim`

## Phase 4 — Data pipeline v2

- [ ] **4.1** `src/data/schema.ts` zod + TS types per 01. | `commit: feat(data): canonical item schema`
- [ ] **4.2** `scripts/data/*` — fetch adapter interface, normalize (incl. name resolution, folding in `apply-names`), shard, validate. | `commit: feat(data): versioned build pipeline`
- [ ] **4.3** `scripts/data/images.ts` — download, resize to 64/128/256 webp, content-hash names, placeholder generation, missing-image report. Gitignore the output. | `commit: feat(data): bake player images`
- [ ] **4.4** Remove the runtime image proxy; point the card component at baked paths with fixed aspect boxes. | `commit: perf: drop runtime image proxy`
- [ ] **4.5** IndexedDB shard cache keyed by version+checksum, with a memory LRU in front. Acceptance: < 250 KB transferred before the first pack. | `commit: perf: indexeddb pool cache`
- [ ] **4.6** `DATA_VERSION` env switch; run a full `fc26` build and commit only the report. | `commit: feat(data): DATA_VERSION switch`
- [ ] **4.7** `[HUMAN]` FC 27 launches 25 Sep 2026 — once a usable FC 27 item source exists, add the adapter and run `DATA_VERSION=fc27 pnpm data:build`. Keep fc26 available behind a toggle. | `commit: feat(data): fc27 adapter`

## Phase 5 — Match sim v2

- [ ] **5.1** `strength.ts` — ATT/MID/DEF/GK composites with slot weights and `chemMult` per 04.1. | `commit: feat(sim): chemistry-weighted team strength`
- [ ] **5.2** `matchSim.ts` rewrite: match shape → chance list → events, all stats derived from the chance list. Seeded by `(runId, round)`. | `commit: feat(sim): shot-level chance model`
- [ ] **5.3** Discipline model with position-weighted fouls (GK weight 0.05) and red-card effects. | `commit: fix(sim): keepers stop committing cynical fouls`
- [ ] **5.4** ET + penalty shootout with per-kick events. | `commit: feat(sim): extra time and shootouts`
- [ ] **5.5** Player ratings + MOTM per 04.6. | `commit: feat(sim): player ratings and motm`
- [ ] **5.6** Calibration test over 10,000 matches: mean goals 2.5–3.0, on-target ratio 0.30–0.45, draw rate ~26% at 90', shootout conversion 0.70–0.80, big chances > 0 whenever xG > 1.0. Write `data/reports/sim-calibration.md`. | `commit: test(sim): calibration suite`
- [ ] **5.7** Match presentation: ticking clock, speed ×1/×2/×4, skip, scorebug, momentum bar, HT/FT beats, templated commentary with 6+ variants per event type. | `commit: feat: broadcast match presentation`

## Phase 6 — Tournament

- [ ] **6.1** Build `clubs-ai.json` at data-build time: best XI + 7 subs per club from base items, with precomputed strengths. | `commit: feat(data): generate ai club squads`
- [ ] **6.2** Sim AI ties using those squads so event feeds name real players. | `commit: feat(sim): real names for ai opponents`
- [ ] **6.3** Seeded bracket by draft-score tier and club strength; difficulty multiplier applied. | `commit: feat: seeded bracket draw`
- [ ] **6.4** Draw ceremony animation + user path highlight. | `commit: feat: bracket draw ceremony`

## Phase 7 — Visual system

- [ ] **7.1** Replace `globals.css` with the token set in 05; migrate all components off hardcoded values. Acceptance: lint rule from 0.6 passes. | `commit: feat(ui): flat swiss token system`
- [ ] **7.2** `next/font` Archivo + Archivo Narrow + Inter; remove old font loads. | `commit: feat(ui): typography system`
- [ ] **7.3** App shell: bounded 1440 stage, three-zone desktop grid, `dvh`, responsive collapse per 05. | `commit: feat(ui): three-zone responsive shell`
- [ ] **7.4** Squad rail on desktop; peek sheet retained mobile-only with tap toggle. Remove the scrim over the board. | `commit: feat(ui): persistent squad rail`
- [ ] **7.5** Redesign screens 1, 2, 3 per 05. Pick band gets fit badges and chem-delta previews. | `commit: feat(ui): landing, formation, pick band`
- [ ] **7.6** Redesign screens 5, 6, 7 per 05, incl. AUTO-FIX CHEM. | `commit: feat(ui): review, score, bracket`
- [ ] **7.7** Redesign screens 8, 9 per 05. | `commit: feat(ui): match and post-match`
- [ ] **7.8** Keyboard nav across every screen; `:focus-visible` rings; 44px targets. | `commit: feat(a11y): keyboard and focus`

## Phase 8 — Cards

- [ ] **8.1** `PlayerCard` rewrite: single component, 4 sizes, SVG shield geometry per 05, `data-rarity` variants. | `commit: feat(ui): player card v2`
- [ ] **8.2** Fit-text hook with memoisation; test the 200 longest names at all sizes with no ellipsis. | `commit: fix(ui): no more truncated surnames`
- [ ] **8.3** GK stat variant; playstyle icons; chem pip with numeric value. | `commit: feat(ui): gk and playstyle card variants`
- [ ] **8.4** Skeleton state with fixed aspect; zero CLS on image load. | `commit: perf(ui): zero-shift card images`

## Phase 9 — Reveal + audio

- [ ] **9.1** Pack reveal: deal-in, 3D flip, walkout for 88+/specials, FLIP fly-to-slot. Reduced-motion path. | `commit: feat: pack reveal sequence`
- [ ] **9.2** Audio sprite + WebAudio manager, muted default, gesture unlock, persisted preference, ducking. | `commit: feat: sound design`

## Phase 10 — Economy

- [ ] **10.1** `ENTRY` phase: 15,000 fee, difficulty select, wallet in localStorage. | `commit: feat: draft entry fee and difficulty`
- [ ] **10.2** Reward ladder per 04, shown after each round and at series end. | `commit: feat: reward ladder`

## Phase 11 — Daily + share + leaderboard

- [ ] **11.1** Daily mode per 06.B: UTC key, independent draw streams, affinity off, one entry/day, countdown. | `commit: feat: daily seeded draft`
- [ ] **11.2** Compact share payload + checksum + `pool-index.json`. | `commit: feat: compact share links`
- [ ] **11.3** `/api/og` ImageResponse card; metadata wiring; validate with both card debuggers. | `commit: feat: og share images`
- [ ] **11.4** `/api/leaderboard` with server-side score recomputation and, for daily mode, draw replay verification. Rate limiting. | `commit: feat: verified leaderboard`
- [ ] **11.5** `/api/health` + honest "local scores only" state when Redis is absent. | `commit: feat: leaderboard health and fallback`

## Phase 12 — Polish

- [ ] **12.1** Funnel counters in `ucl-draft:stats` (drafts started, submitted, series completed, shares). | `commit: feat: local funnel metrics`
- [ ] **12.2** Perf pass: LCP < 2.0s on a throttled 4G profile, route-level code splitting, preload the first shard. | `commit: perf: loading budget`
- [ ] **12.3** Playwright suite: full-flow smoke, resume, share render, mobile 390×844 no horizontal scroll, reduced-motion path. | `commit: test(e2e): full suite`
- [ ] **12.4** README: what it is, how to run, how to rebuild data, the unofficial/EA disclaimer. | `commit: docs: readme`

---

## Dependency notes for parallel work

- Phase 1 blocks 3, 6, 11. Do it first, no exceptions.
- Phase 2 blocks 3.6 and 5.1.
- Phase 4 blocks 6.1 and is independent of 7/8/9 — this is the natural split for a second agent in
  a separate worktree.
- Phases 7, 8, 9 touch only UI and can run in parallel with 5/6 if the two agents use separate
  worktrees and don't both edit `globals.css`.

---

## Phase R — Handoff `[CHEAP]` — runs whenever work stops

Not a phase you reach. A phase you trigger. Run `/handoff` when any of these is true:

- A usage limit is close (the human says so, or a tool warns).
- You're switching tools (Cursor → Claude Code, or back).
- A night run is ending for any reason, including BLOCKED.
- Two hours of wall-clock work have happened without a handoff refresh.

- [ ] **R.1** `docs/STATE.md` refreshed and accurate: architecture map, per-phase status, in-flight
      work, known issues, next three tasks with file names. | `commit: docs: refresh state`
- [ ] **R.2** `docs/PROGRESS.md` has an entry for every task attempted this session, including
      BLOCKED ones with what was tried. | `commit: docs: session log`
- [ ] **R.3** Branch pushed. `pnpm verify` green, or its failure documented at the top of
      `STATE.md` under "Broken right now". | —
- [ ] **R.4** `docs/NEXT-PROMPT.md` written: the exact message to paste into the next tool to
      resume, naming the next task id and the files it touches. | `commit: docs: next prompt`

R.1 through R.4 cost almost nothing **if STATE.md has been kept current as you go**. That is the
point of the two-line update after every task. If you let it rot, this phase turns into a full
repo re-read, which is exactly the expensive thing you can't afford at the end of a budget.
