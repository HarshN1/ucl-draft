# 05 — Visual System & Card Design

## Direction

FIFA 17 was the year EA replaced FUT's skeuomorphic chrome with flat Swiss-style layout while
keeping a sporty, high-energy feel — that is the target. Not FIFA 16's gold-plated bevels, not the
current stadium-neon hybrid.

Three rules that decide most arguments:

1. **Flat.** No bevels, no glows, no glass. Depth comes from value contrast and a single hairline.
2. **Gold is a currency, not a colour.** Gold appears only on draft moments: the pack band, walkout
   reveals, the trophy, the primary CTA. Everywhere else is navy/ink/white/cyan. The current build
   spends gold on the landing hero, the buttons, the pods, the bench frame and the banner — so it
   means nothing.
3. **The pitch is the hero.** Every other element gets out of its way.

---

## Tokens

`src/app/globals.css` — replace ad-hoc values with these. Nothing in a component file hardcodes a
hex again.

```css
:root {
  /* surfaces: cool near-black to deep navy, 5 steps */
  --s-000: #070A0E;   /* page */
  --s-100: #0C1119;   /* panel */
  --s-200: #131A24;   /* raised panel */
  --s-300: #1C2533;   /* hover / input */
  --s-400: #2A3648;   /* border-strong */
  --hairline: rgba(255,255,255,0.08);

  /* ink */
  --ink-000: #FFFFFF;
  --ink-100: #C9D3E0;
  --ink-200: #8492A6;   /* labels */
  --ink-300: #55637A;   /* disabled */

  /* accents */
  --cyan:  #16C8E8;     /* system / navigation / data */
  --gold:  #E8B53C;     /* draft moments ONLY */
  --green: #1FC076;     /* good chem, wins */
  --amber: #E9A13B;     /* weak chem */
  --red:   #E5484D;     /* dead chem, losses, cards */
  --pitch: #0E2A1C;     /* pitch base */
  --pitch-line: rgba(255,255,255,0.10);

  /* type */
  --font-display: 'Archivo', system-ui, sans-serif;        /* 700/800, tight tracking */
  --font-cond: 'Archivo Narrow', 'Barlow Condensed', sans-serif;  /* cards, stats, labels */
  --font-ui: 'Inter', system-ui, sans-serif;               /* body, 400/500/600 */

  /* type scale — 1.25 ratio, clamped for mobile */
  --t-hero:  clamp(2.75rem, 7vw, 5rem);
  --t-h1:    clamp(1.75rem, 3.5vw, 2.5rem);
  --t-h2:    clamp(1.25rem, 2.2vw, 1.5rem);
  --t-body:  1rem;
  --t-sm:    0.875rem;
  --t-label: 0.6875rem;   /* uppercase, 0.14em tracking */

  /* space — 4px base */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

  /* geometry */
  --r-0: 0px; --r-1: 2px; --r-2: 4px;   /* flat: 4px is the maximum radius anywhere */
  --skew: -10deg;                        /* EA tile slant */

  /* motion */
  --e-out: cubic-bezier(0.16, 1, 0.3, 1);
  --e-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --d-fast: 120ms; --d-base: 180ms; --d-slow: 280ms; --d-reveal: 420ms;
}
@media (prefers-reduced-motion: reduce) {
  :root { --d-fast: 0ms; --d-base: 0ms; --d-slow: 0ms; --d-reveal: 0ms; }
}
```

Fonts: Archivo + Archivo Narrow + Inter via `next/font` with `display: swap` and subsetting. They
are the closest freely licensed match to EA Sans's squarish grotesque without pretending to be it.
Oswald/Barlow Condensed currently in use are fine as fallbacks but Archivo Narrow's numerals read
better at card size.

### The EA slant, done properly

```css
.tile { transform: skewX(var(--skew)); }
.tile > * { transform: skewX(calc(var(--skew) * -1)); }  /* un-skew content */
```

Slant belongs on: primary CTAs, phase tabs, the reward ladder, the scorebug edges. Not on cards,
not on panels, not on the pitch. Two slanted things per screen maximum.

---

## Layout: fix the dead-space problem

The screenshots show a ~700 px column centred in 2560 px. Replace the centred stage with a
three-zone grid that actually uses the width.

```
Desktop ≥ 1200px                              Tablet 900–1199        Mobile < 900
┌─────────┬──────────────────────┬─────────┐  ┌────────────────────┐  ┌──────────┐
│ SQUAD   │        PITCH         │ ACTIONS │  │ pods (row)         │  │ pods     │
│ rail    │                      │ rail    │  ├────────────────────┤  ├──────────┤
│ 280px   │   1fr, max 760px     │ 280px   │  │ PITCH              │  │ PITCH    │
│         │                      │         │  ├────────────────────┤  ├──────────┤
│ rating  │   chem lines         │ Quick   │  │ bench strip        │  │ bench    │
│ chem    │   12-slot bench      │ Sim /   │  ├────────────────────┤  ├──────────┤
│ picked  │                      │ Submit  │  │ actions (row)      │  │ sticky   │
│ list    │                      │         │  │                    │  │ action   │
└─────────┴──────────────────────┴─────────┘  └────────────────────┘  └──────────┘
   max-width 1440px, centred, 24px gutters
```

- The Squad rail replaces the hover-peek tab entirely on desktop: the board is *always* visible
  beside the pitch, so there is nothing to peek at and no scrim to dim. Keep the tab only on
  mobile, and give it a tap-to-toggle (not hover) with a visible close.
- App shell is `min-height: 100dvh` with `display: grid; grid-template-rows: auto 1fr auto`.
  Use `dvh`, not `vh` — `vh` is why mobile Safari clips the action bar.
- Nothing scrolls horizontally at 390 px. Add a Playwright assertion for it.

---

## Screen-by-screen

**1. Landing.** The current version is a gold word floating in empty navy. Replace with: pitch
crosshatch at 4% opacity, left-aligned block at the optical third — small cyan eyebrow `DRAFT` /
hero `BUILD IT. WIN FOUR.` / one line of body / slanted gold `Start Draft` + ghost `Leaderboard`.
Right side: a slow drift of three sample cards at 8% opacity, `prefers-reduced-motion` aware.
Below the fold: the four-match ladder graphic and today's top three daily scores. One bold thing
(the hero), everything else quiet.

**2. Formation pick.** Two columns: list of five on the left (already good), big live pitch preview
right with slot dots that pulse in once on selection. Add a one-line shape note per formation
("Five at the back, two out wide — counter-attack shape"). The `SELECT 5-2-2-1 →` CTA loses the
arrow; the label is enough.

**3. Draft pick band.** Currently five small cards in a very wide gold band. Fix:
- Band height `min(46vh, 420px)`, cards at `lg` size (220 px tall), centred with `gap: var(--sp-5)`.
- Gold border becomes a 2 px top rule + a gold-to-transparent gradient wash, not a full frame.
- Above the cards: `PICK — LEFT CENTRE BACK` in condensed uppercase, and `PICK 7 OF 23`.
- Under each card a compact fit badge: green/amber/red dot + `NATURAL` / `RELATED` / `OUT OF POSITION`
  and a `+Δ CHEM` preview. This is the biggest UX win available — it turns the draw from a
  rating comparison into the actual chemistry decision.
- Blur the pitch at 8 px and drop it to 45% brightness (not the current near-black).
- Keyboard: ←/→ to move, Enter to pick, 1–5 to pick directly.

**4. Squad peek.** Delete on desktop (the rail replaces it). On mobile: full-height sheet, no
scrim over the board itself, `Done` button, swipe-down to dismiss.

**5. Squad review.** Add: an `AUTO-FIX CHEM` button (runs the greedy optimiser over swaps only —
it does not change who you drafted, so it's not a cheat), a per-player chem pip on hover/tap
showing `PLC + MB + LB`, and a `SUBMIT SQUAD` as the single gold CTA. Save/Share become ghost
buttons; they're secondary here.

**6. Draft score.** Keep the `CHEM + RATING = SCORE` equation, it's good. Add: a tier ribbon, the
18-man rating breakdown on tap (now that the bench counts, show it), ATT/MID/DEF rings sized 96 px
with the number in `--font-display`, and the club-name input with `FK Bodø/Glimt` as *placeholder*
text only.

**7. Bracket.** Add the draw ceremony, crest column for the user's path, and a `PLAY MATCH` that
shows the opponent's computed strength as three small bars — gives the tie stakes before kickoff.

**8. Match.** Scorebug top, event feed centre (not left), stats right, momentum bar under the
scorebug. Speed control and Skip top-right. Feed items animate in with a 10 px slide, 180 ms.

**9. Post-match.** Keep the MOTM card large. Replace the comparative bars' cyan with green/red per
who won each stat. Add `NEXT: QUARTER-FINAL vs …` to the continue button.

---

## Card component

One component, one CSS file, four sizes, driven by `data-rarity`.

```
Sizes:  xs 44×62 (bench)   sm 92×128 (pitch)   md 140×194 (draw grid)   lg 220×305 (reveal/MOTM)
Aspect: 1 : 1.39 — lock it with aspect-ratio so images never shift layout
```

### Geometry (SVG viewBox `0 0 160 222`, scaled by CSS)

```
Shield path: rounded top corners r=6, straight sides,
             bottom chamfer from (0,186) → (80,222) → (160,186)
Layers, bottom to top:
  1  frame        full shield, rarity gradient + 1px inner stroke at 18% white
  2  portrait     centred, 0.72 scale, bottom-anchored at y=150, masked to shield
  3  scrim        linear-gradient(transparent 40%, rgba(0,0,0,.55) 78%)
  4  ovr          x=16 y=34, 40px --font-display 800, tabular-nums
  5  position     x=16 y=52, 13px --font-cond uppercase, 0.08em tracking
  6  meta column  x=14 y=64→104: nation flag 18×12, league 16×16, club crest 16×16
  7  name plate   y=162, full width, centred, 15px --font-cond uppercase
  8  divider      y=170, 1px, 22% white, inset 18px
  9  stats        2 cols × 3 rows, y=180→214, value 14px bold + label 9px --ink-200
 10  playstyles   up to 3 icons, bottom-right, 12px
 11  chem pip     top-right, 20px circle, value 0–10, green/amber/red (pitch + review only)
```

GK cards swap the six stats for DIV/HAN/KIC/REF/SPD/POS. Hide the stat block entirely at `xs`.

### Rarity variants

```css
.card[data-rarity="gold_rare"]  { --c-a:#F2D385; --c-b:#B8892C; --c-txt:#2A1F06; }
.card[data-rarity="gold"]       { --c-a:#E3C77C; --c-b:#A8873F; --c-txt:#2A1F06; }
.card[data-rarity="silver_rare"]{ --c-a:#E7ECF1; --c-b:#98A3B0; --c-txt:#1B2027; }
.card[data-rarity="bronze_rare"]{ --c-a:#E0A97C; --c-b:#93613A; --c-txt:#2A1608; }
.card[data-rarity="totw"]       { --c-a:#1B1F27; --c-b:#05070A; --c-txt:#E9EEF5; --foil:cyan; }
.card[data-rarity="icon"]       { --c-a:#F6F1E4; --c-b:#C9B27A; --c-txt:#211C10; --foil:gold; }
.card[data-rarity="hero"]       { --c-a:#B06BE8; --c-b:#5A1E91; --c-txt:#FFFFFF; --foil:magenta; }
.card[data-rarity="promo"]      { /* per-family override via data-family */ }
```

`--foil` drives a 1.4 s diagonal light sweep that runs **once on reveal only**, never on hover.

### Text fitting (fixes "CHARDON…")

Truncation to an ellipsis mid-surname is the worst outcome. Use a fit-text step:

1. Prefer `shortName` (surname).
2. Measure with `canvas.measureText` at the size for that card size.
3. If it overflows, step the font-size down in 0.5 px increments to a floor of 9 px (`lg`) / 8 px
   (`md`) / 7 px (`sm`).
4. Only if it still overflows, drop to initials + surname, then ellipsis.
5. Memoise by `(name, size)` — this runs once per unique name per size, not per render.

Add a test that renders the 200 longest names in the pool at every size and asserts no ellipsis.

---

## Pack reveal

The single best-value polish item, and the thing that most says "FUT".

1. Five card **backs** deal in from the right, 70 ms stagger, `--e-out`, 280 ms each.
2. On each: `rotateY` flip, 420 ms, with a mid-flip swap of front/back faces. `perspective: 1200px`
   on the container, `transform-style: preserve-3d` on the card.
3. **Walkout** for rating ≥ 88 or any special: that card holds, scales to 1.12, runs the `--foil`
   sweep, the band background darkens 20%, and a gold sting plays. Others dim to 78%.
4. Hover/focus raises a card 6 px and shows the fit badge and chem delta.
5. Pick → the chosen card flies to its pitch slot (FLIP technique: measure both rects, animate a
   transform, 320 ms), others fade at 180 ms.

Total reveal ≈ 900 ms, skippable by clicking anywhere or pressing a number key. Under
`prefers-reduced-motion`, cards appear face-up with no animation.

## Audio

WebAudio, one sprite file, ~60 KB total, **muted by default**, unlocked on first user gesture,
preference persisted.

| Cue | Character |
|---|---|
| `ui.move` | 12 ms tick, very quiet (-24 dB) |
| `ui.select` | short click with a 2 kHz snap |
| `pack.deal` | paper whoosh per card |
| `pack.flip` | card flip |
| `pack.walkout` | gold sting, 1.2 s |
| `match.goal` | crowd surge, 1.8 s |
| `match.whistle` | HT/FT |
| `ambience.stadium` | 30 s loop, -30 dB, only on pitch screens |

Never more than two cues at once; duck ambience by 6 dB during stings.

## Accessibility floor

- Visible `:focus-visible` ring: 2 px `--cyan` offset 2 px, on everything interactive.
- All flows keyboard-completable; card grids are `role="radiogroup"`.
- `aria-live="polite"` on the match event feed, `assertive` on goals.
- 44×44 minimum touch targets. The current bench slots and mute toggle are under that.
- Chemistry is never communicated by colour alone — the chem pip always shows its number, and link
  lines get dash patterns (solid / dashed / dotted) alongside green / amber / red.
- Contrast: all `--ink-100` and `--ink-200` text on `--s-100`/`--s-200` must pass 4.5:1. Verify;
  `--ink-300` is for disabled states only.
