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
## 2026-10-16 — FIFA 16 Authenticity & 2026/27 Men's-Only Upgrade

- **Data & Men's-Only Pool**: Removed all Women's leagues (`Barclays WSL`, `D1 Arkema`, `Liga F`, `GPFBL`, `NWSL`, `Calcio A Femminile`) and Women's Icons from `public/data/special-cards.json`; disambiguated SoFIFA `league_id` collisions (`ROSHN Saudi League`, `1A Pro League`, `Ukrainian Premier League`); parsed secondary `altPositions`; synthesized 62 curated 2026/27 Men's `TOTY`, `TOTS`, `MOTM`, and `FUTTIES` cards (5,250 Men's base + 597 Men's specials); added `src/lib/playerNames.ts` (`formatCardName`) and `src/data/playerDisplayNames.json`.
- **Chemistry, 18-Player Rating & FIFA 16 Draw Engine**: Normalized cross-source league/nation names in `src/engine/chemistryEngine.ts`; fixed Hero (`+1` same-league, `+2` same-league+nation) and Icon (`+1` universal, `+2` same-nation) link intensity; added `altPositions` support; replaced weighted rating with FIFA 16's exact 18-player Squad Rating formula (`11 Starters + 7 Subs` + above-average CF, 5 Reserves excluded); updated `drawCardsForSlot()` to seed 2 pitch-neighbour chemistry picks, 2 position/rating-band base picks, and 1 marquee/special wildcard slot (~4–7 specials + ~16–19 base cards per 23-man draft) with `basePlayerId` deduplication.
- **FIFA 16 Card & Console Pitch UI**: Redesigned `PlayerCard.tsx` and `cardStyles.ts` with authentic FIFA 16 shield geometry, upper-hood sun-ray glow, left vertical info column (`OVR -> POS -> Club Badge -> Nation Flag`), full-width horizontal nameplate bar, and 2×3 attribute grid (`DIV/REF/HAN/SPD/KIC/POS` for `GK`); upgraded `SquadBoard.tsx`, `CardChooser.tsx`, and `DraftScreen.tsx` with 3D broadcast-tilted stadium turf, dual-layer glowing SVG chemistry link lines, 10-segment individual chemistry under-card pills, 5-star HUD pods, live hover link projection on the pitch during picks, "Fade Unaffected Players" (`dimmedStarterIndices`) during swaps, and an explicit bottom `Substitutes (7) | Reserves (5)` dock.
- **Fast-Forward Match Sim & Manager Auto-Subs**: Added `Liverpool` to `UCL_CLUBS` (15 AI clubs + user = 16 teams); added real 2026/27 `AI_CLUB_ROSTERS` scorers and outfield-only booking weights; added `planManagerSubstitutions()` so the user's Manager brings on up to 3 bench subs (`58'–82'`); upgraded `MatchScreen.tsx` and `EventFeed.tsx` with a live ticking clock (`1×`, `2×`, `Skip to FT`), unspoiled scorebug, and big-event slowdown + Broadcast Commentary Breakdown banner on `GOAL`, `SUBSTITUTION`, and `SAVE`.

