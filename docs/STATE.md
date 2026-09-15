# STATE

Last corrected: 2026-09-15 (kickoff audit against repo).

## Broken right now

- `pnpm verify` does not exist yet.
- `pnpm exec tsc --noEmit` fails (2 errors): duplicate `overall`/`position` in
  `src/engine/__tests__/fixtures/players.ts` (`makePlayer` sets them then spreads `...overrides`).
- Vitest is green: `pnpm test:run` → 40/40.
- Large dirty working tree on `feat/ucl-draft-app` (app polish + whole `docs/` + agent config)
  not committed. Last pushed commit `c4894cb` claimed "auto-save"; draft state is still not
  persisted — refresh loses the run.
- GitHub default branch is `feat/ucl-draft-app`, not `main`. Local `master` is the Create Next
  App stub only. Phase 0.1 must establish `main` before "merge to main" means anything.
- No CI. Vercel Git integration / Upstash env confirmation still open (0.4).

## Where the work is

Branch: `feat/ucl-draft-app` (dirty) · Pushed tip: `origin/feat/ucl-draft-app` @ `c4894cb` ·
CI: none · Production: `ucl-draft-lemon.vercel.app` (CLI deploys; may lag or lead git).

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 0 Repo hygiene | not started | Gate. Land dirty tree, fix tsc fixture, add verify+CI, fix default-branch. `strict: true` already on; still need `noUncheckedIndexedAccess` + `noImplicitOverride` (0.2). |
| 1 Determinism + resume | not started | No `rng.ts`, no `draftMachine.ts`, no `persist.ts`. `Math.random()` throughout engines. Refresh loses run. |
| 2 Chemistry + rating | partial | 26 formations with curated `links`; loyalty always +1 (correct). Formula approximate, not exact FUT16 PLC/MB/LB. Rating weighted 5/1/0, not 18-player CF. |
| 3 Draw engine | partial | Bands + affinity + taper `0.5^n` inline. No config tables, no distribution tests, no mode-gated affinity. |
| 4 Data pipeline | partial | ~5250 players JSON + special-cards + hardcoded legends. Runtime `/api/img` proxy. `apply-names` manual. |
| 5 Match sim | partial | User: shot/xG + chem + ET/pens + MOTM. AI bracket: Poisson. Stats/flavour still loose. |
| 6 Tournament | partial | 16 teams, 15 hardcoded clubs, shuffle, scale-to-fit. No real AI squads. |
| 7 Visual system | partial | Oswald + Barlow Condensed, bounded stage. Desktop SquadTab peek + right Quick Sim — not three-zone squad rail. |
| 8 Cards | partial | Shield + rarity. Surname truncate remains. |
| 9 Reveal + audio | partial | Scrim + gold pick band + CSS flip. Mute persists. No full pack/sound design. |
| 10 Economy | not started | Free play. |
| 11 Daily + share + LB | partial | `/?s=` share, Upstash LB + local fallback. Client-trusted scores. No daily seed, no OG image, no draw replay. |
| 12 Polish | not started | |

## Architecture as it actually is

src/hooks/useDraft.ts              fat reducer (React): flow, draws, rating, quick-sim
src/engine/chemistryEngine.ts      chem preview + formation link maps
src/engine/playerUtils.ts          pool helpers, pack draw, affinity, specials
src/engine/bracketEngine.ts        16-team bracket + AI Poisson sims
src/engine/matchSimulator.ts       user match sim (shots/xG)
src/screens/DraftScreen.tsx        pitch, peek tab, pick band, side actions
src/lib/squadShare.ts              /?s= encode/decode
src/lib/leaderboardStore.ts        Upstash + validation (no score recompute)
src/app/api/img/route.ts           runtime image proxy
src/app/globals.css                theme (hardcoded values still in components)

Missing vs CLAUDE.md target: src/engine/rng.ts, draftMachine.ts, engine/config/*, src/lib/persist.ts, zod.

## In flight / half-done

Uncommitted: SquadTab/SquadViewer/share/sound/RulesModal, premiumCards, display names, legend Sofifa scripts/data, special-cards.json, screen/engine edits; plus CLAUDE.md, docs/00–07, screenshots, .claude/skills, KICKOFF, START-HERE. docs/PROGRESS.md exists empty/new.

## Known issues and surprises

- docs/03-CHEMISTRY.md Part B says plain XI average — wrong; code uses weights (still not FUT CF).
- Commit message auto-save ≠ draft persistence.
- FC 27 launches 25 Sep 2026 — version-switch data before deep FC 26 investment (4.6/4.7).
- Loyalty / locked formation / auto-captain are authentic FUT 16 (see docs/00-DECISIONS.md).

## Next three tasks

1. 0.1 — Land dirty tree; establish main; PR/merge.
2. 0.2 — noUncheckedIndexedAccess + noImplicitOverride; fix fallout (incl. fixture TS2783).
3. 0.3 — pnpm verify + GitHub Actions.

## Decisions still open for the human

None on product. Ops: Vercel tracks main; Upstash on Preview+Production (0.4). 4.7 stays [HUMAN] for FC 27 source.
