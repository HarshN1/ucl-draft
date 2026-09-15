# Paste this into Cursor first (Plan mode)

---

You're working on a Next.js 14 / React 18 / TypeScript / Tailwind app at
`ucl-draft-lemon.vercel.app` that recreates **FIFA 16's FUT Draft** using current EA FC player
items, with a simulated four-match Champions League knockout in place of playable football.

I've added `CLAUDE.md` and a spec set under `docs/`. Read, in this order, and nothing else:

1. `CLAUDE.md` — conventions, architecture rules, definition of done, budget discipline.
2. `docs/STATE.md` — a hand-written seed describing where I *think* the project is. It was written
   from a handoff doc and screenshots, not from reading the code, so parts of it are probably wrong.
3. `docs/00-DECISIONS.md` — fifteen previously-open product questions, now answered and locked.
4. `docs/07-BACKLOG.md` — the task queue.

**Do not read the other spec docs yet.** They're per-phase and you'll open the one you need when
you need it. I'm on a capped plan with no overage, so context is the budget.

The thesis, so you can resolve ambiguity without asking: **FUT 16 rules, FC 26/27 content, FIFA 17
visual language.**

## This turn only — no code

In Plan mode:

1. **Correct `docs/STATE.md` against reality.** Go file by file through the entry points it lists,
   confirm or fix every phase-status row and every line of the architecture section, and tell me
   what's different. Be concrete — this file is what every future session reads first instead of
   rediscovering the repo, so its accuracy is worth more than anything else you could do right now.

2. **Tell me what `pnpm verify` would fail on** and whether the uncommitted work on
   `feat/ucl-draft-app` can be landed cleanly. This is Phase 0 and it gates everything.

3. **Flag anything in the specs that's wrong about this codebase** — a file that doesn't exist, a
   structure that's different, a "fix" that's already done.

4. **Flag anything in the specs you think is a bad call**, with reasoning. Pressure test these four
   specifically:
   - Switching squad rating from an XI average to the real 18-player correction-factor formula
     (`docs/03-CHEMISTRY.md` Part B) — lowers displayed ratings 1–2 points and moves every tier.
   - Replacing the desktop hover "Squad peek" with an always-visible squad rail
     (`docs/05-VISUAL-AND-CARDS.md`).
   - Affinity-seeding the draw at P=0.55 in free play but 0 in daily mode
     (`docs/02-DRAFT-ENGINE.md` step 3).
   - Verifying leaderboard scores server-side by replaying the seeded draw
     (`docs/06-PERSISTENCE-SHARE-LB.md` D).

5. Then give me an ordered plan for **Phase 0 and Phase 1 only**, task by task, with files. Nothing
   beyond that — the backlog already plans the rest.

Keep the reply tight. No summaries of things I wrote, no restating the specs back to me. Write the
corrected `docs/STATE.md` as your one file edit this turn; everything else goes in the reply.
