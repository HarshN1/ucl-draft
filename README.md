# FUT Draft — UCL Edition

A free, nostalgic FIFA 16 FUT Draft experience with today's players, clubs, and leagues. Build a 23-man squad, chase a 194 Draft Score, and battle through a chaotic 16-team UCL knockout bracket.

**No coins. No paywalls. Just draft.**

## Features

- **Formation pick** — 5 random formations from 8 real layouts (FIFA 16 style)
- **Captain pick** — weighted draw from 85+ OVR players
- **23-man draft** — 11 starters + 7 subs + 5 reserve wildcards, position-by-position
- **Live chemistry** — green/yellow/red links on the pitch, manager boost, FUT Legends
- **Draft Score** — Squad OVR + Chemistry (max 200). Chase 190+ for World Class
- **Random UCL bracket** — you can draw Real Madrid in the Round of 16. Chaos is the point.
- **Match simulation** — xG engine, animated events, ratings, MOTM, ET + penalties
- **Global leaderboard** — Upstash Redis on Vercel (falls back to localStorage offline)

## Tech Stack

- **Next.js 14** (App Router) · TypeScript · Tailwind CSS · Vitest
- Player data from FC 26 Kaggle CSV → `players.json`
- `/api/img` proxy for sofifa CDN assets
- `/api/leaderboard` for global scores (Vercel KV / Upstash)

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Player data is already generated in `public/data/players.json` (5,250 players, OVR ≥ 70).

To regenerate from CSV:

```bash
# Place any *.csv in data/ (e.g. data/FC26_20250921.csv)
npm run generate
```

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo at [vercel.com](https://vercel.com) — Next.js auto-detected
3. Build command: `npm run build` (default)
4. **Optional — global leaderboard:** Install [Upstash Redis](https://vercel.com/marketplace/upstash) from Vercel Marketplace. Env vars `KV_REST_API_URL` and `KV_REST_API_TOKEN` are auto-set.
5. Deploy

Without KV, the game works fully — leaderboard saves locally in the browser.

---

## Tests

```bash
npm run test:run
```

37 unit tests cover chemistry, bracket, player draws, and match simulation engines.

---

## Draft Score Reference

| Score | Tier |
|-------|------|
| 190–200 | World Class Draft |
| 180–189 | Elite Draft |
| 170–179 | Strong Draft |
| < 170 | Good Draft |

The FUT Draft community considers 194 world-class. Can you beat it?
