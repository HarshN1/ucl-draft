---
name: night-run
description: Work the UCL Draft backlog continuously and unattended. Use when the user says "night run", "work the backlog", "keep going", "run until blocked", or asks for autonomous progress on docs/07-BACKLOG.md. Works in both Cursor and Claude Code.
---

# Night run

An unattended loop over `docs/07-BACKLOG.md`, built for two constraints: the human is asleep, and
there is **no paid overage** if a usage limit is hit. Every stopping point must leave the repo
green and the next tool able to pick up cold.

## Before the first task

1. `git status` — dirty tree? Stop and report. Never build on top of uncommitted work.
2. Not on a night branch? `git checkout -b night/<YYYY-MM-DD>`.
3. `pnpm verify 2>&1 | tail -40`. Red on arrival means tonight's only job is making it green.
4. Read `docs/STATE.md`, then `docs/07-BACKLOG.md`. Read **one** spec doc, for the first task only.
5. Ask the human for a **task budget** if they haven't given one ("work 6 tasks", "stop at 2am",
   "go until Phase 3"). If they've already gone to bed, default to **8 tasks**, then stop and hand
   off. A bounded run that ends with a clean handoff beats an unbounded one that dies mid-edit.
6. Append to `docs/PROGRESS.md`: `## Night run <ISO timestamp> — budget <N tasks> — starting <task id>`.

## The loop

For each unchecked task, in file order:

1. Log `- [start] <id> <title>` in `docs/PROGRESS.md`.
2. **Gates.** A `[GATE]` task unchecked above you → stop and report. `[HUMAN]` → skip with a note.
   `[EYES]` → skip in a night run; those need someone looking at the screen.
3. Read the acceptance criterion and the cited spec section. Quote the criterion into your plan.
4. Implement the smallest change that satisfies it. No opportunistic refactoring of nearby code.
5. Write the test the criterion names. Engine work runs in Node, no DOM.
6. `pnpm verify 2>&1 | tail -40`.
   - Green → next step.
   - Red → fix, re-verify. **Two attempts maximum.** On the second failure:
     `git reset --hard HEAD`, log
     `- [BLOCKED] <id> — <what failed, what you tried, what you'd need>`,
     and jump to the next task with no dependency on it (dependency notes are at the bottom of the
     backlog).
7. Commit with the message the task gives. Stage only this task's files.
8. Tick the backlog checkbox.
9. **Update `docs/STATE.md`** — two lines, not a rewrite: move the phase status, and replace the
   "next three tasks" list. This is what makes the final handoff nearly free.
10. Log `- [done] <id> — <one line> — <sha>`. Next task.

## Every 4 tasks

- `rm -rf .next && pnpm verify 2>&1 | tail -40` to catch stale-cache passes.
- `git push`.
- Three-line rollup in `PROGRESS.md`: done / blocked / anything needing a human.

## Budget guard

Cheap habits, applied throughout:

- Never print a full test list or build log. Failures only.
- Never re-read a file you wrote this session.
- Never read a spec doc for a phase you aren't in.
- Prefer targeted edits to whole-file rewrites.
- If a task's context keeps growing past what you can hold, that's a sign the task is too big:
  log it as BLOCKED with a suggested split rather than pushing through.

**Reserve.** When you reach the task budget, or any signal that a limit is close, or three
consecutive BLOCKED tasks — stop implementing and run the `handoff` skill immediately. Do not
start a task you can't finish and hand off. If the human ever warns that a limit is near, drop
whatever you're doing, `git reset --hard HEAD` if mid-edit, and hand off.

## Stop conditions

- Task budget reached.
- A `[GATE]` above you is unchecked.
- Three consecutive BLOCKED.
- A task needs a credential, paid signup, or authed download. Log exactly what and skip.
- A task would contradict `docs/00-DECISIONS.md`.
- Phase 12 complete.

Then: run `handoff`.

## Never

- `git push --force`, rebase a shared branch, rewrite published history.
- Touch `data/raw/` or `public/data/` without a task saying so.
- Run `vercel deploy`. CI deploys.
- Edit `docs/00-DECISIONS.md`.
- Loosen a test to make it pass. If a bound is genuinely wrong, log the measured numbers, `.skip`
  the test, and file it BLOCKED.
- Commit `.env`, keys, or `public/players/`.
- Leave the branch red overnight.
