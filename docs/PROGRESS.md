# PROGRESS

Append-only log. Newest at the bottom.

## 2026-09-15 — Kickoff / Phase 0–1

- Corrected `docs/STATE.md` against the repo (kickoff audit).
- **0.1** Landed dirty tree on `feat/ucl-draft-app` (docs, data scripts, UI polish); pushed; created `main` and set as GitHub default (PR empty — same tip).
- **0.2** Enabled `noUncheckedIndexedAccess` + `noImplicitOverride`; fixed fallout (tsc clean).
- **0.3** Added `pnpm verify` + `.github/workflows/verify.yml`.
- **0.4** Deferred ops: confirm Vercel Git → `main` and Upstash Preview/Production env (needs human/console).
- **0.5** `docs/PROGRESS.md` + README links to decisions/progress/state.
- **0.6** ESLint bans `Math.random` outside `rng.ts` (cosmetic LB/trophy/tests exempt) and hex outside tokens (UI migrate deferred to Phase 7).
- **1.1** `src/engine/rng.ts` + tests.
- **1.2** Seeded Rng threaded through playerUtils / matchSimulator / bracketEngine / draftMachine.
- **1.3** Pure `src/engine/draftMachine.ts`; thin `useDraft.ts`; headless draft test.
- **1.4** `src/lib/persist.ts` + zod schema; session + localStorage mirror.
- **1.5** Landing Resume / Start fresh.
- **1.6** Playwright `e2e/resume.spec.ts` + config (run via `pnpm test:e2e`).
