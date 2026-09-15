# 06 — Resume, Daily Draft, Share, Leaderboard

## A. Mid-draft resume (Phase 1, top priority)

A refresh currently destroys a run. On mobile that happens by accident constantly — background the
tab, come back, gone.

### What to persist

```ts
const RUN_SCHEMA = 3;   // bump on any shape change

interface PersistedRun {
  schema: number;
  runId: string;         // uuid
  createdAt: number;
  dataVersion: 'fc26' | 'fc27';
  mode: 'free' | 'daily';
  dailyKey?: string;     // 'YYYY-MM-DD'
  seed: number;
  cursor: number;        // RNG position — critical, without it draws diverge
  phase: Phase;
  difficulty: 0|1|2|3|4;
  formationId: string;
  managerId: string | null;
  // ids only; the pool is re-derivable from the shards
  slots: Record<SlotId, string | null>;   // itemId
  bench: (string | null)[];
  reserves: (string | null)[];
  pendingDraw: string[] | null;           // the 5 currently on screen
  captainId: string | null;
  bracket: BracketState | null;
  results: MatchResultSummary[];          // seed + score per round, not full event lists
  coins: number;
}
```

Store **ids, seeds and cursors only**. Never serialise player objects — they are large, they go
stale across data versions, and you already have them locally.

### Where

- `sessionStorage` key `ucl-draft:run` as primary (survives reload, dies with the tab — matches
  "one run at a time").
- Mirror to `localStorage` key `ucl-draft:run-backup` so closing the tab is recoverable. On mount,
  if a backup exists and is < 6 hours old, offer **Resume run** / **Start fresh** in a small
  inline card on the landing screen (not a modal).
- Write on every phase transition and every pick, debounced 250 ms, wrapped in try/catch
  (Safari private mode throws on write).
- `schema` mismatch or `dataVersion` mismatch → discard silently, no error to the user.

### Restore procedure

1. Parse + validate with zod. Any failure → discard.
2. Re-hydrate items from the shards by id. Any missing id → discard the run (data changed under it).
3. Rebuild the RNG at `(seed, cursor)`.
4. If `pendingDraw` exists, show exactly those five cards again.
5. Recompute chemistry and rating from scratch — never persist derived values.

### Tests

- Round-trip: serialise → clear memory → restore → state deep-equals, and the next draw is
  identical to what it would have been.
- Playwright: start a draft, make 6 picks, reload, assert 6 picks present and the same five
  candidates on screen.

## B. Daily seeded draft

```
dailyKey  = UTC YYYY-MM-DD
runSeed   = hashSeed('daily', dailyKey, DATA_VERSION)
drawSeed(slotId, k) = hashSeed('daily', dailyKey, slotId, k)
```

In daily mode: affinity seeding **off**, per-draw independent streams (02), Quick Sim **allowed**
but flagged on the leaderboard entry, one submission per day per browser
(`localStorage: daily:<key>:done`).

The daily draft is what makes a leaderboard mean anything — without it you're comparing people who
got different pools. Ship a countdown to the next daily on the landing screen and the LB.

## C. Share links

Current base64 JSON snapshot produces long URLs. Compact it:

```
payload = [ version(1B) | formationIdx(1B) | managerIdx(1B) | 23 × varint(eaItemIdx) | score(2B) ]
encode  = base64url(payload)   →  ~46–56 chars
```

`eaItemIdx` is the item's index in a sorted, version-pinned id list emitted at build time
(`pool-index.json`), so ids compress to 2-byte varints instead of full strings. Include a 1-byte
checksum; reject on mismatch rather than rendering a garbage squad.

`/?s=…` renders the read-only viewer (already built) plus a `Start your own draft` CTA.

### OG image

`app/api/og/route.tsx` using `ImageResponse`:

- 1200×630, page background `--s-000`, pitch crosshatch.
- Left: club name, draft score in `--t-hero`, tier ribbon, chem/rating split.
- Right: the top 3 cards rendered at `lg` from the baked `public/players` images (they must be
  absolute URLs — `ImageResponse` can't read relative paths).
- `export const runtime = 'edge'`, cache `public, max-age=31536000, immutable` keyed on `s`.
- Wire `openGraph` and `twitter` metadata in `generateMetadata` for the `?s=` route.

Validate with the Twitter/X card validator and Facebook debugger before calling it done. A share
image that doesn't render is worse than none.

## D. Leaderboard

### Storage (Upstash Redis)

```
ZADD lb:daily:<YYYY-MM-DD>  <score>  <entryId>
ZADD lb:alltime             <score>  <entryId>
HSET lb:entry:<entryId>     club, score, chem, rating, tier, squad(b64), wins, quickSim, ts
EXPIRE lb:daily:<key>       60 days
```

### Anti-cheat: verify server-side

The current design trusts a client-posted score, which means the leaderboard is decoration. Fix:

```
POST /api/leaderboard
body: { club, squad: base64url, mode, dailyKey?, wins }
server:
  1. rate limit: 5 writes / hour / IP (Upstash Ratelimit), 1 per dailyKey per IP for daily mode
  2. decode + checksum the squad payload
  3. load the server-side pool for that dataVersion
  4. RECOMPUTE chemistry + squad rating + draft score from the ids
  5. reject if the client-claimed score differs (it isn't sent — the server's number is the score)
  6. for daily mode: replay the seeded draw and assert every submitted item was actually
     offered for its slot. This makes the daily leaderboard tamper-proof.
  7. store, return rank
```

Step 6 is the whole point of determinism. It is ~40 lines once the engine is pure and seeded.

### Env and fallback

Verify `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` exist in Vercel for **Production and
Preview**. Add a `/api/health` route returning `{ redis: 'ok' | 'missing' }` and surface a quiet
"local scores only" note in the LB UI when it's missing, so a silent localStorage fallback never
masquerades as a global board again.

## E. Preferences (localStorage, small and separate from the run)

```
ucl-draft:prefs = { muted, matchSpeed, rulesSeen, lastClubName, theme }
ucl-draft:wallet = { coins }
ucl-draft:stats  = { drafts, completed, seriesWon, bestScore }
```

`stats` doubles as the Q14 funnel instrumentation until there's real analytics.
