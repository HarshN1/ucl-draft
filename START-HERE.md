# Start here — budget mode

No overage, no on-demand, no upgrade. The plan is built around that: Cursor until its buckets run
dry, a forced handoff before they do, then Claude Code.

## Install

```bash
cd <repo>
cp -r /path/to/bundle/docs .
cp -r /path/to/bundle/.cursor .
cp -r /path/to/bundle/.claude .
cp /path/to/bundle/CLAUDE.md .
touch docs/PROGRESS.md
git add docs .cursor .claude CLAUDE.md && git commit -m "docs: spec set and agent config"
```

Skills live in `.claude/skills/` on purpose — **Cursor reads that directory too**, so one copy
serves both tools and nothing drifts. If Cursor doesn't list them under Customize → Skills after a
restart, mirror them:

```bash
mkdir -p .cursor/skills && cp -r .claude/skills/* .cursor/skills/
```

Restart Cursor, open a fresh Agent chat in **Plan mode**, paste `KICKOFF.md`.

## What's in the bundle

```
KICKOFF.md                        paste into Cursor first
CLAUDE.md                         conventions + budget rules. Read by both tools. Single source of truth
docs/STATE.md                     where the project is. Read first, every session. Kept current after every task
docs/00-DECISIONS.md              the 15 questions, answered and locked
docs/01..06                       per-phase specs: data, draft, chemistry, sim, visual, persistence
docs/07-BACKLOG.md                ~65 tasks in 13 phases, with [CHEAP]/[THINK]/[EYES] tags and Phase R
.cursor/rules/ucl-draft.mdc       always-on Cursor rule, points at CLAUDE.md
.claude/skills/night-run/         the unattended loop, now with a task budget and a forced handoff
.claude/skills/handoff/           writes STATE.md + NEXT-PROMPT.md so the next tool starts cold
```

Changed from the last version: `CLAUDE.md` and `STATE.md` are new, the backlog gained model tags
and Phase R, and both skills now assume you can run out of money mid-task.

## The real fix for "leave enough usage at the end"

Reserving quota for a handoff doesn't work — you can't see the wall coming and the agent can't
either. So the handoff is written **continuously instead of at the end**. Every task updates two
lines of `docs/STATE.md`. When the tank empties, `/handoff` is a five-minute consolidation of
notes that already exist, not a fresh repo investigation. That's the whole mechanism, and it's why
`CLAUDE.md`'s definition of done has three bookkeeping steps instead of one.

Belt and braces on top: the night-run skill now demands a **task budget** up front (default 8) and
hands off when it's spent, rather than running until something breaks.

## Cursor: the ladder

You have ~24% of Cursor Models and ~63% of Other Models left, resetting Oct 6. Spend it in this
order and stop where it says stop.

| Step | Work | Model | Why |
|---|---|---|---|
| 1 | The kickoff turn (correcting STATE.md, spec review) | Best model you have | One or two turns, mostly reading and writing markdown. Highest leverage per token in the whole project |
| 2 | Phase 0 — git, strict mode, CI, lint rules | Composer | Pure mechanics. Don't spend a frontier model on a tsconfig |
| 3 | Phase 1 — seeded RNG, pure state machine, resume | Best model you have | `[THINK]`. Everything downstream depends on this being right, and a subtle bug here is invisible until Phase 11 |
| 4 | Phase 2 — chemistry + squad rating | Best model you have | `[THINK]`. It's arithmetic with six pinned test cases; a good model one-shots it |
| 5 | Phase 3 — draw engine | Best model you have | `[THINK]`. Distribution tests are the acceptance bar |
| 6 | Phase 4 — data pipeline scripts | Composer | Long, mechanical, well-specified. Ideal Composer work |
| — | **Cursor Models bucket near 95%** | — | **Stop using Composer.** Its overflow silently eats the Other Models bucket, which is the one you need for `[THINK]` work |
| 7 | Whatever `[THINK]` phase is next, until Other Models nears its end | Best model you have | |
| — | **Anything warns, or a model gets slow/queued** | — | `/handoff`, commit, push, switch to Claude Code |

Two Cursor settings worth changing for this: turn **Auto off** for Phases 1/2/3/5 (its routing is
fine for CSS and unhelpful when the task is "implement this formula exactly"), and don't run more
than one agent — parallel agents multiply spend and this repo has one critical path.

## Token discipline that actually moves the needle

Most budget doesn't go into work, it goes into resending conversation history.

- **New chat per backlog task.** A 30-message thread pays for all 30 messages on turn 31. This is
  by far the biggest lever; everything else on this list is rounding error next to it.
- Never `@codebase` or ask for a full scan. `docs/STATE.md` exists so nothing has to rediscover
  the repo. Name files.
- `@`-mention exactly one spec doc — the one for the current task.
- `pnpm verify 2>&1 | tail -40`. A passing 400-line vitest log in context is pure waste.
- Reject "while I was in there I also refactored…". Smallest change that meets the criterion.
- If a task's context balloons, it's too big: split it rather than pushing through.
- Don't ask the agent to re-read files it just wrote.

## Realistic expectation

Phases 0–3 plus part of 4, on what you have left. That's determinism, resume, correct chemistry,
correct squad rating, and a real draw engine — the part that makes it *feel* like FUT Draft.
Phases 7–9 are the part that makes it *look* like FIFA 17, and those want you awake anyway; "does
this feel right" isn't something a test asserts.

## Claude Code: the switchover

Claude Code is included on Pro. Two things to know before you lean on it:

- Usage meters against **a rolling five-hour session plus a weekly limit** that resets at a fixed
  time assigned to your account. Check Settings → Usage on claude.ai for your exact reset.
- **Claude Code and the Claude apps draw from the same pool.** This chat counts. So loop me in
  deliberately — paste `docs/STATE.md` and ask a specific question — rather than narrating progress
  at me. Every message here is a message Claude Code doesn't get.

Model choice is the biggest lever there too: run Sonnet by default and save the heavier model for
the `[THINK]` phases, same as in Cursor.

Switchover, in order:

```bash
# in Cursor, before you run out:
/handoff

# then, in the repo:
claude
```

1. `CLAUDE.md` loads automatically — you don't need `/init`, and running it would just burn tokens
   rewriting a file that's already better than what it would generate.
2. Paste the contents of `docs/NEXT-PROMPT.md` as your first message. It names the branch, the sha,
   the next task and the one spec doc to read.
3. Set permissions once with `/permissions` so it isn't asking every command: allow `pnpm`, `npx`,
   `node`, `tsc`, `vitest`, `playwright`, `git add|commit|status|diff|log|branch|checkout`. Deny
   `rm -rf`, `git push --force`, `vercel`, `curl`.
4. Use plan mode (shift+tab) for `[THINK]` tasks, straight through for `[CHEAP]` ones.
5. The `night-run` and `handoff` skills work identically there — `/night-run`, `/handoff`.
6. Five-hour sessions make Claude Code better at this than it sounds: one session is roughly one
   phase. Start a session, spend it on a phase, `/handoff`, walk away.

Then when the Cursor buckets reset on Oct 6, `/handoff` out of Claude Code and back in. The point
of `STATE.md` + `NEXT-PROMPT.md` is that the direction of the switch stops mattering.

## When you loop me back in

Paste `docs/STATE.md` and `docs/PROGRESS.md` and tell me what's stuck. Useful things to ask for
that don't burn your coding quota: reviewing a diff, deciding a balance number, judging whether a
screen actually looks like FIFA 17, rewriting a task's acceptance criterion when the agent keeps
failing it, or adding a spec doc for something the backlog doesn't cover yet.
