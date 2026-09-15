import type {
  Squad,
  BracketTeam,
  MatchEvent,
  MatchResult,
  PlayerRating,
  DraftedPlayer,
} from '@/types';
import type { Rng } from '@/engine/rng';

// ─── Small math helpers ────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Roughly-normal noise in [-1.5, 1.5] (sum of three uniforms, centred). */
const gauss = (rng: Rng) => rng.next() + rng.next() + rng.next() - 1.5;

// ─── Slot → line buckets ───────────────────────────────────────────────────────

const DEF_SLOTS = new Set(['GK', 'LB', 'RB', 'LCB', 'RCB', 'CB', 'LWB', 'RWB']);
const ATT_SLOTS = new Set(['ST', 'LS', 'RS', 'CF', 'LF', 'RF', 'LW', 'RW']);
// everything else (CDM/CM/CAM variants, LM, RM) is treated as midfield.

interface SquadStats {
  attack: number;
  midfield: number;
  defense: number; // outfield defensive line
  gk: number;
  chemMult: number; // 0.80–1.20
}

function avgStat(players: DraftedPlayer[], fn: (p: DraftedPlayer['player']) => number, fallback: number) {
  if (!players.length) return fallback;
  return players.reduce((a, dp) => a + fn(dp.player), 0) / players.length;
}

function extractUserStats(squad: Squad): SquadStats {
  const starters = squad.starters;
  const gk = starters.find((s) => s.slot === 'GK');
  const defenders = starters.filter((s) => DEF_SLOTS.has(s.slot) && s.slot !== 'GK');
  const forwards = starters.filter((s) => ATT_SLOTS.has(s.slot));
  const mids = starters.filter((s) => !DEF_SLOTS.has(s.slot) && !ATT_SLOTS.has(s.slot));

  const attack = avgStat(
    forwards.length ? forwards : mids,
    (p) => p.sho * 0.45 + p.pac * 0.25 + p.dri * 0.3,
    74
  );
  const midfield = avgStat(
    mids.length ? mids : starters,
    (p) => p.pas * 0.4 + p.dri * 0.3 + p.phy * 0.3,
    74
  );
  const defense = avgStat(
    defenders.length ? defenders : starters,
    (p) => p.def * 0.55 + p.phy * 0.3 + p.pac * 0.15,
    72
  );
  const gkRating = gk ? gk.player.overall : 72;

  // Chemistry swings effective performance from ×0.80 (broken) to ×1.20 (perfect).
  const chemMult = 0.8 + (squad.chemistry / 100) * 0.4;

  return { attack, midfield, defense, gk: gkRating, chemMult };
}

// Brutal opponents: real UCL clubs perform at (around) their full overall.
function opponentStats(ovr: number): SquadStats {
  return { attack: ovr + 1, midfield: ovr - 1, defense: ovr, gk: ovr, chemMult: 1.0 };
}

// ─── Shot-by-shot side simulation ──────────────────────────────────────────────

interface SideResult {
  shots: number;
  sot: number;
  xg: number;
  bigChances: number;
  corners: number;
  goals: number;
  goalMinutes: number[];
}

/**
 * Simulate one team's attacking output over a period: derive a realistic number
 * of shots from attacking power + possession, then resolve each shot into
 * on-target / big-chance / goal using the chance quality vs the opposing keeper.
 */
function simulateSide(
  rng: Rng,
  attackPower: number,
  defResist: number,
  possession: number,
  homeBonus: number,
  minuteLo: number,
  minuteHi: number,
  scale = 1
): SideResult {
  const shotBase = 3 + attackPower / 14;
  let shots = Math.round((shotBase * (0.55 + possession / 100) * (1 + homeBonus) + gauss(rng) * 1.6) * scale);
  shots = clamp(shots, scale < 1 ? 0 : 1, 22);

  let xg = 0;
  let sot = 0;
  let bigChances = 0;
  let corners = Math.max(0, Math.round(shots * 0.5 + gauss(rng)));
  let goals = 0;
  const goalMinutes: number[] = [];

  for (let i = 0; i < shots; i++) {
    // Each shot's quality IS its xG — so a shot converts with that probability.
    const quality = clamp(0.085 + (attackPower - defResist) / 400 + (rng.next() - 0.5) * 0.13, 0.02, 0.85);
    xg += quality;
    if (quality > 0.3) bigChances++;
    if (rng.next() < quality) {
      goals++;
      sot++; // goals are on target
      goalMinutes.push(minuteLo + rng.int(Math.max(1, minuteHi - minuteLo)));
    } else if (rng.next() < clamp(0.33 + attackPower / 300, 0.2, 0.62)) {
      sot++;
    }
  }
  corners = clamp(corners, 0, 14);
  goalMinutes.sort((a, b) => a - b);
  return { shots, sot, xg, bigChances, corners, goals, goalMinutes };
}

// ─── Event narration ───────────────────────────────────────────────────────────

const GOAL_TEMPLATES = [
  (n: string) => `${n} drives into the box and fires low into the corner. GOAL!`,
  (n: string) => `${n} rises highest and heads it home. GOAL!`,
  (n: string) => `${n} curls a beauty into the top corner. GOAL!`,
  (n: string) => `${n} slots past the keeper from close range. GOAL!`,
  (n: string) => `${n} beats the offside trap and finishes clinically. GOAL!`,
  (n: string) => `${n} smashes it in off the underside of the bar. GOAL!`,
  (n: string) => `${n} converts the rebound after a parried shot. GOAL!`,
];
const SAVE_TEMPLATES = [
  (n: string) => `Huge save to deny ${n} from range!`,
  (n: string) => `The keeper tips ${n}'s effort onto the post!`,
  (n: string) => `Point-blank stop keeps ${n} out!`,
];
const CHANCE_TEMPLATES = [
  (n: string) => `${n} drags it just wide of the far post.`,
  (n: string) => `${n} rattles the crossbar — so close!`,
  (n: string) => `${n} blazes over from the edge of the box.`,
];
const CARD_TEMPLATES = [(n: string) => `${n} goes into the book for a cynical foul.`];

function pickScorer(rng: Rng, squad: Squad): DraftedPlayer {
  const fwd = squad.starters.filter(
    (s) => ATT_SLOTS.has(s.slot) || ['CAM', 'LCAM', 'RCAM', 'CCAM'].includes(s.slot)
  );
  const pool = fwd.length ? fwd : squad.starters;
  const total = pool.reduce((a, p) => a + p.player.sho, 0) || 1;
  let r = rng.next() * total;
  for (const p of pool) {
    r -= p.player.sho;
    if (r <= 0) return p;
  }
  return pool[pool.length - 1]!;
}

// ─── Player ratings ──────────────────────────────────────────────────────────

function generateRatings(
  rng: Rng,
  starters: DraftedPlayer[],
  scorerIds: Map<number, number>,
  oppGoals: number,
  possession: number,
  userWon: boolean
): PlayerRating[] {
  return starters.map((dp) => {
    let r = 6.1;
    const goals = scorerIds.get(dp.player.id) ?? 0;
    r += goals * 1.0;
    if (userWon) r += 0.4;
    const isDef = DEF_SLOTS.has(dp.slot);
    if (isDef) {
      if (oppGoals === 0) r += 0.7; // clean sheet
      else r -= 0.18 * oppGoals; // shipped goals
    }
    const isMid = !isDef && !ATT_SLOTS.has(dp.slot);
    if (isMid && possession > 55) r += 0.3;
    r += gauss(rng) * 0.5;
    return { player: dp, rating: clamp(Math.round(r * 10) / 10, 4.5, 9.8) };
  });
}

// ─── Penalty shootout (GK-influenced) ──────────────────────────────────────────

function simulatePenalties(
  rng: Rng,
  userGk: number,
  oppGk: number
): { userWon: boolean; userPens: number; oppPens: number } {
  // Higher opposing keeper rating lowers your conversion.
  const userConv = clamp(0.82 - oppGk / 600, 0.6, 0.85);
  const oppConv = clamp(0.82 - userGk / 600, 0.6, 0.85);
  let u = 0;
  let o = 0;
  for (let i = 0; i < 5; i++) {
    if (rng.next() < userConv) u++;
    if (rng.next() < oppConv) o++;
  }
  let sd = 0;
  while (u === o && sd < 12) {
    sd++;
    const uu = rng.next() < userConv;
    const oo = rng.next() < oppConv;
    if (uu) u++;
    if (oo) o++;
  }
  if (u === o) {
    if (rng.next() < 0.5) u++;
    else o++;
  }
  return { userWon: u > o, userPens: u, oppPens: o };
}

// ─── Main simulate ─────────────────────────────────────────────────────────────

export function simulateMatch(
  rng: Rng,
  userSquad: Squad,
  opponent: BracketTeam,
  roundIndex: number // 0=R16 … 3=Final
): MatchResult {
  const u = extractUserStats(userSquad);
  const o = opponentStats(opponent.ovr);
  const home = roundIndex <= 2 ? 0.08 : 0;

  // Possession from the midfield battle (chemistry-boosted for the user).
  const um = u.midfield * u.chemMult;
  const possession = clamp(Math.round(50 + ((um - o.midfield) / (um + o.midfield)) * 40), 28, 72);

  const userDefResist = o.defense * 0.7 + o.gk * 0.3;
  const oppDefResist = (u.defense * 0.7 + u.gk * 0.3) * u.chemMult;

  const userSide = simulateSide(rng, u.attack * u.chemMult, userDefResist, possession, home, 6, 90);
  const oppSide = simulateSide(rng, o.attack, oppDefResist, 100 - possession, 0, 6, 90);

  let userScore = Math.min(userSide.goals, 7);
  let oppScore = Math.min(oppSide.goals, 7);

  // Build the event timeline.
  const events: MatchEvent[] = [];
  const scorerIds = new Map<number, number>();

  const addGoals = (count: number, minutes: number[], isUser: boolean) => {
    for (let i = 0; i < count; i++) {
      const minute = minutes[i] ?? 6 + rng.int(84);
      if (isUser) {
        const scorer = pickScorer(rng, userSquad);
        scorerIds.set(scorer.player.id, (scorerIds.get(scorer.player.id) ?? 0) + 1);
        events.push({ minute, type: 'GOAL', description: `${minute}' — ${rng.pick(GOAL_TEMPLATES)(scorer.player.name)}`, isUserTeam: true, isGoal: true });
      } else {
        events.push({ minute, type: 'GOAL', description: `${minute}' — ${rng.pick(GOAL_TEMPLATES)(opponent.name)}`, isUserTeam: false, isGoal: true });
      }
    }
  };
  addGoals(userScore, userSide.goalMinutes, true);
  addGoals(oppScore, oppSide.goalMinutes, false);

  // Flavour: a couple of saves (shots on target that weren't goals) and chances.
  const flavour = (side: SideResult, isUser: boolean) => {
    const saves = clamp(side.sot - side.goals, 0, 2);
    for (let i = 0; i < saves; i++) {
      const minute = 5 + rng.int(85);
      const name = isUser ? pickScorer(rng, userSquad).player.name : opponent.name;
      events.push({ minute, type: 'SAVE', description: `${minute}' — ${rng.pick(SAVE_TEMPLATES)(name)}`, isUserTeam: isUser, isGoal: false });
    }
    if (side.shots - side.sot > 1 && rng.next() < 0.7) {
      const minute = 5 + rng.int(85);
      const name = isUser ? pickScorer(rng, userSquad).player.name : opponent.name;
      events.push({ minute, type: 'CHANCE', description: `${minute}' — ${rng.pick(CHANCE_TEMPLATES)(name)}`, isUserTeam: isUser, isGoal: false });
    }
  };
  flavour(userSide, true);
  flavour(oppSide, false);

  // 0–2 bookings.
  const cards = rng.int(3);
  for (let i = 0; i < cards; i++) {
    const isUser = rng.next() < 0.5;
    const minute = 10 + rng.int(80);
    const name = isUser ? rng.pick(userSquad.starters).player.name : opponent.name;
    events.push({ minute, type: 'YELLOW_CARD', description: `${minute}' — ${rng.pick(CARD_TEMPLATES)(name)}`, isUserTeam: isUser, isGoal: false });
  }

  // Extra time + penalties on a draw.
  let wentToET = false;
  let wentToPenalties = false;
  let userPenScore: number | undefined;
  let oppPenScore: number | undefined;
  let userWon: boolean;

  if (userScore === oppScore) {
    wentToET = true;
    const etUser = simulateSide(rng, u.attack * u.chemMult, userDefResist, possession, home, 91, 120, 0.33);
    const etOpp = simulateSide(rng, o.attack, oppDefResist, 100 - possession, 0, 91, 120, 0.33);
    addGoals(etUser.goals, etUser.goalMinutes, true);
    addGoals(etOpp.goals, etOpp.goalMinutes, false);
    userScore += etUser.goals;
    oppScore += etOpp.goals;
    if (userScore === oppScore) {
      wentToPenalties = true;
      const pens = simulatePenalties(rng, u.gk, o.gk);
      userPenScore = pens.userPens;
      oppPenScore = pens.oppPens;
      userWon = pens.userWon;
    } else {
      userWon = userScore > oppScore;
    }
  } else {
    userWon = userScore > oppScore;
  }

  events.sort((a, b) => a.minute - b.minute);

  const ratings = generateRatings(rng, userSquad.starters, scorerIds, oppScore, possession, userWon);
  const motm = ratings.reduce((best, r) => (r.rating > best.rating ? r : best));

  return {
    userScore,
    opponentScore: oppScore,
    events,
    possession,
    userShots: userSide.shots,
    opponentShots: oppSide.shots,
    userShotsOnTarget: userSide.sot,
    opponentShotsOnTarget: oppSide.sot,
    userXg: Math.round(userSide.xg * 10) / 10,
    opponentXg: Math.round(oppSide.xg * 10) / 10,
    userBigChances: userSide.bigChances,
    opponentBigChances: oppSide.bigChances,
    userCorners: userSide.corners,
    opponentCorners: oppSide.corners,
    playerRatings: ratings,
    motm: motm.player,
    wentToET,
    wentToPenalties,
    userPenScore,
    oppPenScore,
    userWon,
  };
}
