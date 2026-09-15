# CLAUDE.md

Conventions for this repo. Read this first, every session. Claude Code loads it automatically;
Cursor loads it via `.cursor/rules/ucl-draft.mdc`.

## What this is

A browser recreation of FIFA 16's FUT Draft using current EA FC player items, with a simulated
four-match Champions League knockout in place of playable football. Next.js 14 App Router,
React 18, TypeScript, Tailwind, Vitest, Vercel, Upstash Redis.

Thesis, for resolving ambiguity without asking: **FUT 16 rules, FC 26/27 content, FIFA 17 visual
language.** The nostalgia is the ritual — draw of five, formation locked, chemistry puzzle, four
matches and you're out — not 2016 ratings.

## Orientation, in order

1. `docs/STATE.md` — where the project actually is right now. **Always read this first.**
2. `docs/07-BACKLOG.md` — the task queue. Work top to bottom. Check boxes as you go.
3. `docs/00-DECISIONS.md` — locked product decisions. Do not re-open them.
4. The one spec doc for the task you're on. **Do not read all of them** — that's the single
   biggest waste of context in this repo:
   - `01-DATA.md` player pipeline, schema, images
   - `02-DRAFT-ENGINE.md` state machine, seeded RNG, draw algorithm
   - `03-CHEMISTRY.md` FUT 16 chemistry math, squad rating formula
   - `04-MATCH-AND-TOURNAMENT.md` sim model, AI clubs, bracket
   - `05-VISUAL-AND-CARDS.md` design tokens, layout, card geometry
   - `06-PERSISTENCE-SHARE-LB.md` resume, daily seed, share, leaderboard

If code and a spec disagree, the spec wins — unless the spec is wrong about this codebase, in
which case say so instead of silently working around it.

## Architecture

- Game logic lives in `src/engine/` and **must not import React**. It runs in plain Node. A test
  that plays 10,000 full drafts headlessly is the acceptance bar.
- `src/hooks/useDraft.ts` is a thin binding over `src/engine/draftMachine.ts`. No rules there.
- Balance constants (draw bands, special rates, chemistry tables, sim coefficients) live in
  `src/engine/config/*.ts`. Never inline one in logic.
- Derived values (chemistry, ratings, stats) are computed, never persisted.
- Storage access only in `src/lib/persist.ts`, always inside try/catch (Safari private mode throws).

## Hard rules

- `Math.random()` is forbidden outside `src/engine/rng.ts`. All randomness flows through the seeded
  `Rng` in state, and every draw advances a persisted cursor.
- No hardcoded colours, fonts, spacing or durations outside `src/app/globals.css`. Use the tokens.
- No new dependency without a one-line justification in the commit body. Specifically: no
  animation library, no state library, no audio library. CSS, WAAPI, a reducer, WebAudio.
- Border radius never exceeds 4px. No glows, bevels, glass, neon.
- `--gold` is only for draft moments: pack band, walkouts, primary CTA, trophy.
- Every interactive element gets a visible `:focus-visible` state and a ≥44px touch target.
- `prefers-reduced-motion` has a working path through every animated flow.
- Never commit `.env`, API keys, or the baked `public/players/` image directory.
- Never ship EA logos, club badges or kit art.

## Definition of done

1. `pnpm verify` passes (typecheck + vitest + build).
2. New behaviour has a test. Engine changes get a deterministic test; distribution changes get a
   statistical test over ≥10,000 samples with asserted bounds.
3. No new `any`, no new eslint-disable without a reason comment.
4. One logical change per commit, conventional message, subject under 72 chars.
5. Backlog checkbox ticked, one line appended to `docs/PROGRESS.md`, and the relevant line in
   `docs/STATE.md` updated. All three, every time.

## Budget discipline

This project has no paid overage. Context is the cost, so:

- **One task per conversation.** Start a fresh chat/session per backlog task. A long thread resends
  its whole history every turn; that is where budget disappears, not in the work.
- Never ask for a whole-codebase scan. Name the files. `docs/STATE.md` exists so you don't have to
  rediscover the repo.
- Pipe long command output: `pnpm verify 2>&1 | tail -40`. Never paste a full build log or a
  passing test list into the conversation. Report failures only.
- Don't read a spec doc you aren't currently implementing.
- Don't re-read a file you just wrote.
- No opportunistic refactoring of adjacent code. The smallest change that meets the acceptance
  criterion, then stop.
- Prefer `str_replace`-style edits over rewriting whole files.

## When stuck

Two failed attempts on one task is the limit. Then `git reset --hard` to the last green commit,
write a `BLOCKED:` entry in `docs/PROGRESS.md` saying what you tried and what you'd need, update
`docs/STATE.md`, and move to the next task that doesn't depend on it. Never leave a broken tree.
Never loosen a test to make it pass.

## Handing off

Run the `handoff` skill (`/handoff`) whenever work is stopping — limit reached, tool switch, night
run ending, or two hours elapsed. See Phase R in the backlog. Keeping `docs/STATE.md` current
after every task is what makes that cheap.
