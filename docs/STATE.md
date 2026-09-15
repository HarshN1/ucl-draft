# STATE

Last corrected: 2026-09-15 (Phase 0–1 landed).

## Broken right now

- **0.4 open:** Confirm Vercel is wired to GitHub/`main` and Upstash env exists on Preview + Production (human/console).
- Playwright browsers may still need `pnpm exec playwright install` before `pnpm test:e2e` locally/CI.
- Hex colour ban exempts UI + `cardStyles.ts` until Phase 7 token migration.

## Where the work is

Branch: `feat/ucl-draft-app` (and `main` at same tip after 0.1) · CI: `.github/workflows/verify.yml` ·
Production: `ucl-draft-lemon.vercel.app`

## Phase status

| Phase | Status | Notes |
|---|---|---|
| 0 Repo hygiene | almost done | 0.1–0.3, 0.5–0.6 done. **0.4** Vercel Git/env confirmation remains. |
| 1 Determinism + resume | done | Seeded Rng, draftMachine, persist, resume UI, Playwright spec. |
| 2 Chemistry + rating | partial | Still approximate chem; weighted rating not FUT 18-player CF. |
| 3 Draw engine | partial | Rng-threaded; still inline bands/affinity (not config tables). |
| 4–12 | unchanged | See prior audit; next work starts at Phase 2. |

## Architecture as it actually is

```
src/engine/rng.ts                  seeded mulberry32 + Rng cursor
src/engine/draftMachine.ts         pure reducer (no React)
src/hooks/useDraft.ts              thin binding + persist/resume
src/lib/persist.ts                 zod schema, session + localStorage
src/engine/chemistryEngine.ts      chem preview + formation link maps
src/engine/playerUtils.ts          pack draw (takes Rng)
src/engine/bracketEngine.ts        bracket + AI sims (takes Rng)
src/engine/matchSimulator.ts       user match sim (takes Rng)
src/screens/LandingScreen.tsx      Resume / Start fresh
e2e/resume.spec.ts                 Playwright mid-draft resume
```

## In flight / half-done

None beyond **0.4** (Vercel ops).

## Known issues and surprises

- Match sim uses session Rng via `SIMULATE_MATCH` in the machine; MatchScreen no longer rolls its own stream for the result.
- `docs/03-CHEMISTRY.md` Part B still says “XI average” — code was weighted; real CF formula is Phase 2.5.
- FC 27 launches 25 Sep 2026 — keep data version-switchable (4.6/4.7).

## Next three tasks

1. **0.4** — Vercel Git integration on `main`; confirm Upstash Preview+Production.
2. **2.1** — `config/positionTable.ts` per 03.
3. **2.2** — Exact FUT16 chemistry model.

## Decisions still open for the human

Ops only: 0.4. Product: none. 4.7 stays `[HUMAN]` for FC 27 source.
