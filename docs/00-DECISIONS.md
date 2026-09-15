# 00 — Locked Decisions

These are answers, not options. The agent must not re-litigate them. If a decision needs to
change, the human changes this file first, then the code.

## The one-line thesis

**FUT 16 rules and ritual. FC 26/27 content and card art. FIFA 17 flat-Swiss interface.**

The nostalgia lives in the *ritual* — draw of five, formation locked, the chemistry puzzle, a
four-match knockout you can lose — not in 2016 player ratings. So the rules layer is a faithful
FUT 16 reimplementation, the content layer is current, and the UI takes FIFA 17's design language
because it was the year EA dropped skeuomorphic chrome for flat Swiss layout (per the FIFA 17 UT
interface designer's own description of the shift), which is both the better-looking era and the
one that actually translates to CSS.

---

## Answers to the 15 questions

**Q1 — Target era: exact FIFA 15/16 fidelity, or FUT spirit + modern cards?**
Split by layer, explicitly:

| Layer | Era | Why |
|---|---|---|
| Draft rules (squad size, draw of 5, formation lock, 4 matches, manager pick) | FIFA 16 exact | This is the product |
| Chemistry math (0–10 individual, 0–100 team, link values 3/2/1/0) | FIFA 16 exact | Deeper and more solvable than FC's 0–3 system; it's the actual puzzle |
| Squad rating formula | FIFA 16/17 exact (18-player, correction factor) | Makes bench picks matter — see 03 |
| Player items, card art, rarities, PlayStyles | FC 26, switching to FC 27 | Recognisable players; the whole draw is "ooh, that card" |
| Menu/screen design language | FIFA 17 | Flat Swiss reads well on web; 16's chrome does not |

Also: **FC 27 launches 25 Sep 2026** (early access 18 Sep, web app mid-Sep). Build the data layer
with a `DATA_VERSION` switch now so the FC 27 refresh is a config change, not a rewrite.

**Q2 — Keep the UCL tournament or a classic Draft structure?**
Keep UCL. It is not a compromise — **R16 → QF → SF → Final is exactly four matches, which is
exactly the FUT Draft series length.** The structures are identical; UCL just gives it names,
crests and stakes. Internally call it `DraftSeries` with a UCL presentation skin so a "house
opponents" mode can be swapped in later without touching the engine.

**Q3 — Match depth: stay sim, or invest in cinematic presentation?**
Stay sim, invest in *presentation and statistical honesty* — not in playable football. Concretely:
a minute clock that ticks, a broadcast scorebug, HT/FT beats, a momentum bar, a skip button, and
stats that are internally consistent (see 04 — the current build shows 13 shots / 9 on target,
which is roughly double a real on-target rate and immediately reads as fake).

**Q4 — Coins / fake economy?**
Yes, cosmetic only. 15,000-coin entry fee, FUT 16's reward ladder shown after each round, a
localStorage wallet. No purchases, no real economy, no effect on the leaderboard. It costs half a
day and it is the difference between "a toy" and "a run that cost me something."

**Q5 — Captain: auto-slot or player-placed?**
Auto-slot. That is what FIFA 16 did: five superstars, pick one, he lands in his natural slot. The
player already chooses *which slot to fill next* for every other pick, which is the real agency.
Add one affordance: during Squad Review the captain can be moved like anyone else.

**Q6 — Specials: taper, hard caps, or classic rarity tables?**
Rarity tables at the draw level (explicit per-pick rating-band and rarity distributions), with the
existing taper kept as a soft safety net at a gentler `0.65^n` instead of `0.5^n`. No hard caps —
hard caps make the 6th pick feel rigged. Full tables in 02.

**Q7 — Bodø/Glimt or neutral branding?**
Neutral Draft branding as the default. Keep Bodø/Glimt as the placeholder text in the club-name
field (the joke survives, the stranger who opens a shared link isn't confused) and as one option
in a crest picker. A meme crest on a shared image kills the share loop.

**Q8 — First: resume, daily seed, or leaderboard?**
Resume. A lost run is the only bug in this product that makes someone never come back. Then daily
seed (it is what makes the leaderboard mean anything), then leaderboard verification.

**Q9 — Mobile-first or desktop?**
Mobile-first interaction (tap targets, no hover dependencies), desktop-first *layout work*,
because the screenshots show the real problem is desktop: at 2560px the formation, score and match
screens are a narrow centre column in a sea of empty navy. Fix: a bounded stage with a three-zone
desktop layout (squad rail / pitch / action rail) that collapses to a single column under 900px.
Hover peek must have a tap equivalent everywhere.

**Q10 — Art direction: FIFA 16 flat gold vs current stadium neon?**
FIFA 17 flat Swiss. Drop the neon entirely. Palette, type scale and motion tokens in 05. Gold is
reserved for *draft moments only* (pack band, walkouts, trophy) so it stays meaningful.

**Q11 — Chemistry accuracy: current maps or research exact link removals?**
Implement the exact FUT 16 formula (`IC = PLC + MB + LB`, `L = Σlinks / nLinks`) with a
hand-authored link map per formation, validated by invariant tests rather than by chasing EA's
binaries. The formula is public and exact; the per-formation adjacency is curated and only needs
to be *plausible and consistent*. Tests in 03 pin the known-true cases.

**Q12 — Custom OG image per shared squad?**
Yes, but after resume and daily seed. It's ~80 lines with Next's `ImageResponse` and it is the
entire top of the funnel. A shared link with no card art is a dead link.

**Q13 — Out of scope?**
Locked out: auth/accounts, real multiplayer, co-op draft, trading, market prices, playable
football, monetisation. Do not scaffold for them.

**Q14 — Success metric?**
Primary: **draft completion rate** (formation pick → squad submitted) and **series completion**
(submitted → trophy or eliminated). Secondary: share rate. Leaderboard engagement is a lagging
vanity metric until the daily seed exists. Instrument the two funnels with a tiny event logger
before building more features.

**Q15 — Git/deploy: commit + CI, or keep CLI deploys from a dirty tree?**
Commit and push to `main`, Vercel Git integration, CI running typecheck + vitest + build. This is
Phase 0 and it gates everything else. A production build that exists only in a dirty local tree is
not a project, it's a hostage situation.

---

## Gap list: rescored

The handoff's 12 "gaps vs FIFA 15/16" are not all gaps.

| # | Handoff gap | Verdict |
|---|---|---|
| 1 | No coins/entry/rewards | Real gap → Phase 10 |
| 2 | Custom affinity packs ≠ classic tables | Real gap → Phase 3 |
| 3 | Era mashup (FC specials + FUT-16 legends) | **Intentional.** Q1 |
| 4 | UCL AI clubs, not house opponents | **Intentional.** Q2 |
| 5 | Narrative sim only | **Intentional**, but presentation is a real gap → Phase 5 |
| 6 | No save/resume | Real gap, highest priority → Phase 1 |
| 7 | Loyalty always +1 | **Not a gap.** Draft players are all first-owner, so loyalty is always on in real FUT Draft too. Correct as built. |
| 8 | Formation locked after pick | **Not a gap.** FIFA 16 explicitly locked it for the whole series. Keep locked. |
| 9 | Captain auto-slotted | **Not a gap.** Q5 |
| 10 | No chem styles/consumables | **Correct** — Draft has no consumables. Don't add them. |
| 11 | Bodø/Glimt default | Real gap → Q7 |
| 12 | Curated chem maps | **Acceptable** → Q11 |

Genuine gaps the handoff missed:

- **Squad rating ignores the bench.** Real FUT rates 18 players with a correction factor, so the
  last seven picks currently have no consequence. Fixing this makes half the draft matter. (03)
- **Match stats are not internally consistent** (on-target rate, big chances always 0, integer xG). (04)
- **Goalkeepers commit fouls** in the event feed. Position-weight the foul model. (04)
- **No determinism.** Nothing is seeded, so no resume, no daily draft, no reproducible shares,
  no testable distributions. This is the structural blocker under three other features. (02)
- **Name overflow** ("CHARDON…") on cards. (05)
- **Runtime image proxying** from a third-party CDN — slow, fragile, and one CDN change from a
  blank pitch. Bake images at build time. (01)
