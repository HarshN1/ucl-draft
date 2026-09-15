---
name: handoff
description: Write or refresh the project handoff so another tool or session can resume cold. Use when a usage limit is near, when switching between Cursor and Claude Code, when a night run ends, or when the user says "handoff", "wrap up", "I'm out of usage", or "write down where we are".
---

# Handoff

Produce three artefacts so the next session — possibly a different tool — can resume without
rediscovering the repo. Budget for this is small by design: if `docs/STATE.md` has been kept
current after each task, this is a consolidation, not an investigation.

**Do not re-read the codebase to write this.** Use what you already know from this session plus the
existing `STATE.md` and `PROGRESS.md`. If something is genuinely unknown, write "unknown — verify"
rather than going and finding out. The next session can check one file cheaply; you cannot afford
to re-scan the repo on an empty tank.

## 1. `docs/STATE.md`

Overwrite it. Exactly this shape, nothing extra:

```markdown
# STATE — <ISO timestamp>

## Broken right now
<Anything red, with the exact failing command and error. "Nothing — pnpm verify green at <sha>" if clean.>

## Where the work is
Branch: <name> @ <sha>   Pushed: yes/no   CI: green/red/unknown
Production: <matches main? / behind by N commits / unknown>

## Phase status
| Phase | Status | Notes |
|---|---|---|
| 0 Repo hygiene | done / partial / not started | <one line> |
| 1 Determinism + resume | | |
| 2 Chemistry + rating | | |
| 3 Draw engine | | |
| 4 Data pipeline | | |
| 5 Match sim | | |
| 6 Tournament | | |
| 7 Visual system | | |
| 8 Cards | | |
| 9 Reveal + audio | | |
| 10 Economy | | |
| 11 Daily + share + LB | | |
| 12 Polish | | |

## Architecture as it actually is
<10–20 lines. The files that matter and what each owns. Where the spec and the code still diverge.
This is the section that saves the next session the most money — be concrete, name files.>

## In flight / half-done
<Anything started and not finished, and whether it's committed. If nothing, say so.>

## Known issues and surprises
<Things discovered this session that aren't in the specs. Spec errors found. Gotchas.>

## Next three tasks
1. <id> — <title> — files: <list>
2. <id> — <title> — files: <list>
3. <id> — <title> — files: <list>

## Decisions still open for the human
<List, or "none".>
```

## 2. `docs/PROGRESS.md`

Append a session summary:

```markdown
## Session <timestamp> — <tool> — summary
Completed: <ids>
Blocked:   <ids + one-line reasons>
Skipped:   <ids + why (EYES / HUMAN / gate)>
Branch: <name> @ <sha>   CI: <state>
```

## 3. `docs/NEXT-PROMPT.md`

Overwrite. This is the literal message the human pastes into the next tool. Write it addressed to
the agent, not to the human. Template:

```markdown
You're resuming work on the UCL/FUT Draft app.

Read, in this order: `CLAUDE.md`, `docs/STATE.md`, then task <ID> in `docs/07-BACKLOG.md` and the
one spec doc it cites (`docs/<NN>-<name>.md`). Do not read the other spec docs.

Branch: <name> @ <sha>. <Green, or: this is broken — see "Broken right now" in STATE.md and fix
that first.>

Start with task <ID>: <title>. Files: <list>. Acceptance: <criterion, quoted>.

Work one task, run `pnpm verify 2>&1 | tail -40`, commit with the message in the backlog, tick the
box, append to PROGRESS.md, update the "Next three tasks" list in STATE.md. Then stop and tell me
what you did before starting the next one.
```

## Before finishing

1. `pnpm verify 2>&1 | tail -40` — or, if you're out of room, skip it and write "verify not re-run
   this session" in STATE.md rather than claiming green.
2. `git add docs && git commit -m "docs: handoff <timestamp>" && git push`.
3. Reply to the human with: branch and sha, what got done, what's broken if anything, the next task
   id, and the one-line instruction to paste `docs/NEXT-PROMPT.md` into the next tool. Six lines
   maximum. They are about to switch tools; they don't need prose.
