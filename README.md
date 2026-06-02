# UCL Draft

A FIFA FUT Draft-inspired web game themed around the UEFA Champions League knockout stages. Build your ultimate squad, earn a Draft Score (OVR + Chemistry, max 200), enter a 16-team bracket, and simulate your way to European glory.

## Features

- **Formation pick** — choose from 8 real formations (5 shown randomly per run)
- **Captain pick** — select any 85+ OVR player as captain
- **Position-by-position draft** — 11 starters + 5 subs, each from 5 weighted random card choices
- **Live chemistry preview** — see how each candidate affects team chemistry before picking
- **Draft Score** — Squad OVR (0–100) + Chemistry (0–100) = up to 200. Chase 190+ for "World Class"
- **16-team UCL bracket** — seeded by your Draft Score; face Real Madrid, Man City, Bayern and more
- **Match simulation** — Poisson xG engine, 5–8 animated match events, player ratings, MOTM
- **Leaderboard** — top scores saved to localStorage

## Tech Stack

- **Next.js 14** (App Router) · TypeScript · Tailwind CSS
- Client-side only — no backend, no database
- Deploys to Vercel free tier

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Add player data

Download one of these Kaggle datasets and place the CSV at `data/players.csv`:

- [FC 26 / FIFA 26 Player Data](https://www.kaggle.com/datasets/rovnez/fc-26-fifa-26-player-data)
- [EA FC 26 Player Database](https://www.kaggle.com/datasets/flynn28/eafc26-player-database)

Then process it:

```bash
npm run generate
```

This creates `public/data/players.json` (~600 KB, players OVR ≥ 70).

> **Without the CSV**, the app ships with 29 mock players so you can test the full game flow immediately.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

### Option A — players.json committed

If you've already run `npm run generate` locally:

1. Commit `public/data/players.json` to git
2. Push to GitHub
3. Connect the repo to [vercel.com](https://vercel.com) — framework auto-detected as Next.js
4. Deploy

### Option B — generate at build time

If you commit `data/players.csv` to git (check file size — Kaggle CSVs can be ~10 MB):

1. In Vercel project settings → Build Command: `npm run generate && npm run build`
2. Or add to `package.json`:
   ```json
   "prebuild": "node scripts/process-players.js"
   ```
3. Deploy normally — Vercel runs the generate step before building

### Environment variables

None required. The app is fully static.

---

## Project Structure

```
ucl-draft/
├── data/               ← DROP players.csv HERE
│   └── players.csv
├── public/
│   └── data/
│       └── players.json   ← generated output
├── scripts/
│   └── process-players.js ← CSV → JSON pipeline
└── src/
    ├── app/               ← Next.js App Router shell
    ├── components/
    │   ├── draft/         ← PlayerCard, DraftPicker, FormationPicker...
    │   ├── bracket/       ← UCLBracket, BracketMatchCard
    │   ├── match/         ← EventFeed, MatchStats, PostMatchModal
    │   └── ui/            ← Button, Modal, Leaderboard
    ├── data/
    │   ├── formations.ts  ← 8 formation definitions with pitch coords
    │   └── mockPlayers.ts ← 29 development fixtures
    ├── engine/
    │   ├── chemistryEngine.ts  ← link scoring, adjacency graph
    │   ├── matchSimulator.ts   ← Poisson xG, event generation
    │   ├── bracketEngine.ts    ← 16-team seeded bracket
    │   └── playerUtils.ts      ← weighted draw, captain selection
    ├── hooks/
    │   ├── useDraft.ts         ← central game state machine
    │   ├── useLeaderboard.ts   ← localStorage persistence
    │   └── useSound.ts         ← Web Audio API wrapper
    ├── screens/           ← full-page screen components
    └── types/
        └── index.ts       ← all TypeScript interfaces
```

---

## Draft Score Reference

| Score | Tier |
|-------|------|
| 190–200 | 🏆 World Class Draft |
| 180–189 | ⭐⭐⭐ Elite Draft |
| 170–179 | ⭐⭐ Strong Draft |
| < 170 | ⭐ Good Draft |

The YouTube FUT Draft community considers 194 to be world-class. Can you beat it?
