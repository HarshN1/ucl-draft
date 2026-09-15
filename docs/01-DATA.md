# 01 — Player Data Pipeline

## The problem with what exists

Current: ~5250 base players (OVR ≥ 70) from an FC 26 Kaggle dataset + hardcoded specials/legends,
one large `players.json`, images proxied at runtime from a third-party CDN, display names patched
by a separate `apply-names` step that isn't in the pipeline.

Four failure modes in that: (a) career-mode-style datasets don't contain FUT *items*, so specials
have to be hand-faked; (b) a single fat JSON blocks first paint; (c) runtime image proxying is the
single most likely thing to break the whole app; (d) the name-fixing step being manual means prod
and data drift.

## Two-layer data model

Keep these strictly separate. They are different things and conflating them is why specials are
hardcoded today.

1. **Ratings layer** (`data/raw/ratings.<version>.csv|json`) — one row per real footballer.
   Broad coverage, ~18k rows, ~110 attributes. This is what Kaggle/SoFIFA-derived datasets give you.
2. **Item layer** (`data/raw/items.<version>.json`) — one row per *card*. A player can have many
   items (base gold, TOTW, Icon Debut, Icon Champion, promo). Has `rarity`, `version`, revised
   attributes, PlayStyles, `isSpecial`. This is what makes the draw feel like FUT.

The draft pool is built **from the item layer**, with the ratings layer as the fallback source for
any item missing attributes.

## Sources, ranked

**Item layer (pick one primary, write an adapter interface so it's swappable):**

| Source | Form | Notes |
|---|---|---|
| `futdb.app` REST API | JSON, free API key; some fields premium-gated | Cleanest programmatic option. Players, clubs, nations, leagues, card types |
| `futdatabase.com` | JSON REST, paid tiers | Same shape, alternative vendor |
| FUT.GG / FUTBIN | HTML | Community sites, have FC 27 pages live already. Scrape politely, cache hard, never at runtime. Check robots/ToS before adding |
| Kaggle `flynn28/complete-ea-fc26-rating-cards-database` | webp card images named per player | Useful as an *image* source and cross-check |

**Ratings layer:**

| Source | Notes |
|---|---|
| Kaggle `rovnez/fc-26-fifa-26-player-data` | ~18k rows, 110+ attributes, clean |
| Kaggle `justdhia/ea-sports-fc-26-player-ratings` | 16k+, 3 CSVs |
| Kaggle `flynn28/eafc26-player-database` | men / women / combined splits |

Write the fetchers behind one interface so FC 27 is a new adapter, not a new pipeline:

```ts
// scripts/adapters/types.ts
export interface ItemSource {
  id: string;                       // 'futdb' | 'futgg' | 'local-json'
  version: DataVersion;             // 'fc26' | 'fc27'
  fetchAll(): AsyncIterable<RawItem>;
}
```

## Canonical schema

This is the only shape the app is allowed to know about. Everything upstream normalises into it.
Zod schema lives in `src/data/schema.ts` and the build fails on any violation.

```ts
export type DataVersion = 'fc26' | 'fc27';

export type Position =
  | 'GK'
  | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB'
  | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM'
  | 'LW' | 'RW' | 'CF' | 'ST';

export type Rarity =
  | 'bronze' | 'bronze_rare'
  | 'silver' | 'silver_rare'
  | 'gold'   | 'gold_rare'
  | 'totw' | 'icon' | 'hero' | 'promo';

export interface PlayerItem {
  id: string;                  // stable: `${version}:${eaItemId}`
  eaId: number;                // player-level EA id, for image lookup + dedupe across items
  name: string;                // display name, already resolved. NEVER null
  shortName: string;           // surname or common name, <= 14 chars, for card plates
  rating: number;              // 40-99
  position: Position;          // primary
  altPositions: Position[];    // may be empty
  rarity: Rarity;
  isSpecial: boolean;          // rarity in {totw, icon, hero, promo}
  specialFamily?: string;      // 'TOTW 12' | 'ICON — Champion' | 'Winter Wildcards'
  // chemistry identity — all three required, nulls are a build error
  clubId: number | null;       // null ONLY for icon/hero (they have no club)
  clubName: string | null;
  leagueId: number | null;
  leagueName: string | null;
  nationId: number;
  nationName: string;
  // face stats (outfield) — 6 values shown on the card
  pac: number; sho: number; pas: number; dri: number; def: number; phy: number;
  // GK stats — present iff position === 'GK'
  gk?: { div: number; han: number; kic: number; ref: number; spd: number; pos: number };
  // deeper attributes used by the match sim (subset is fine, document which)
  attrs: {
    finishing: number; shotPower: number; longShots: number; volleys: number; penalties: number;
    vision: number; crossing: number; shortPassing: number; longPassing: number; curve: number;
    acceleration: number; sprintSpeed: number; agility: number; balance: number; reactions: number;
    ballControl: number; dribbling: number; composure: number;
    interceptions: number; headingAccuracy: number; defAwareness: number;
    standingTackle: number; slidingTackle: number;
    jumping: number; stamina: number; strength: number; aggression: number;
  };
  playStyles: string[];        // names
  playStylesPlus: string[];
  skillMoves: 1|2|3|4|5;
  weakFoot: 1|2|3|4|5;
  foot: 'L' | 'R';
  height: number;              // cm
  image: { hash: string; w: number; h: number }; // resolves to /players/{hash}-{size}.webp
}
```

### Normalisation rules (write these as pure functions, unit-tested)

1. **Name resolution**, in order: `commonName` → `${firstInitial}. ${lastName}` → `lastName` →
   `${firstName} ${lastName}`. `shortName` = common name if ≤ 14 chars, else last name, else
   truncate on a word boundary. **A `null` name is a build failure, not a runtime `"Unknown"`.**
   This removes `apply-names` as a separate step — it becomes part of `normalize`.
2. **Position mapping**: source strings → the closed `Position` enum. Any unmapped string fails
   the build with the offending value printed. No silent `'CM'` default.
3. **IDs**: build dictionaries `clubs.json`, `leagues.json`, `nations.json` with `{id, name, code,
   image}`. Every item's ids must resolve or the build fails.
4. **Icons and Heroes**: `clubId = null`, `leagueId = null` for Icons. Heroes keep a `leagueId`
   (their chemistry is league-bound) with `clubId = null`. This matters for chemistry — see 03.
5. **Dedupe**: one item per `(eaId, version, specialFamily)`. Keep the highest-rated when the
   source has duplicates.
6. **Women's players**: include them. They are in FC 26/27, they were in the current build's
   screenshots (Stanway, Lavelle, Prinz, Miyama), and excluding them now means a migration later.
   Tag `gender` if the source has it, use it only for image fallbacks.

## Sharding and loading

Do not ship one blob. Emit:

```
public/data/<version>/
  index.json              # { version, builtAt, counts, bands, checksums }
  clubs.json leagues.json nations.json
  pool/gk-85.json         # position-group + rating-band shards
  pool/def-85.json
  pool/mid-85.json
  pool/att-85.json
  pool/gk-80.json ...     # bands: 90+, 85-89, 80-84, 75-79, 70-74
  specials.json           # all icon/hero/totw/promo items (small, always loaded)
```

- Position groups: `gk | def | mid | att` (by primary position).
- Client loads `index.json` + `specials.json` + the shards the current draw actually needs.
- Target: **< 250 KB transferred before the first pack opens.**
- Cache shards in IndexedDB keyed by `version + checksum`; bust on mismatch. `localStorage` is too
  small for this; don't try.

## Images: bake them, don't proxy them

Replace the runtime proxy entirely.

```
pnpm data:images
```

1. For every item in the final pool, fetch the portrait once.
2. Resize to 3 widths — 64 (bench), 128 (pitch/draw), 256 (reveal/OG) — encode webp q=82.
3. Name by content hash: `public/players/{hash}-128.webp`. Content-hash naming means immutable
   caching and no cache-busting logic.
4. Write `image.hash` back into the item JSON.
5. Any fetch failure → record in `data/reports/missing-images.json` and assign a generated
   silhouette placeholder (position-tinted, initials). **Never** render a broken `img`.
6. Do not commit the image directory (gitignore `public/players/`). Either run `data:images` in CI
   before build, or push to Vercel Blob and store absolute URLs. Prefer Blob: it keeps the repo
   small and avoids shipping third-party assets in git history.

`<Image>` / `<img>` must always have explicit width/height or a fixed aspect box so cards don't
shift on load.

## Build orchestration

```json
// package.json
"scripts": {
  "data:fetch":     "tsx scripts/data/fetch.ts",
  "data:normalize": "tsx scripts/data/normalize.ts",
  "data:shard":     "tsx scripts/data/shard.ts",
  "data:images":    "tsx scripts/data/images.ts",
  "data:validate":  "tsx scripts/data/validate.ts",
  "data:build":     "pnpm data:fetch && pnpm data:normalize && pnpm data:shard && pnpm data:images && pnpm data:validate"
}
```

`DATA_VERSION=fc27 pnpm data:build` is the entire FC 27 migration path. Keep `fc26` artifacts on
disk so you can diff pools across versions and A/B the draw feel.

## Validation gates (`data:validate` — fails the build)

- No `null` in: `name`, `shortName`, `rating`, `position`, `rarity`, `nationId`, the six face stats.
- Every `clubId`/`leagueId`/`nationId` resolves in its dictionary.
- Every `position` is in the enum.
- Minimum counts per position-group × band. Fail if, say, fewer than 40 GKs at 85+, because that
  silently degrades the GK draw into repeats.
- `rating` distribution sanity: no band should be empty; 90+ should be < 1.5% of the pool.
- Every item's image resolves, or is explicitly in the placeholder report.
- Prints a one-page report to `data/reports/build-<version>.md`: counts by band, by league, by
  rarity, missing images, and a diff against the previous build. Commit the report, not the data.

## Legal / hygiene

Non-commercial fan project. Don't ship EA club badges, kits or logos in the repo; render crests
from the dictionaries at runtime or use generic shapes. Put an "unofficial, not affiliated with
EA" line in the footer and README. No ads, no payments — that's also Q4/Q13.
