import type {
  Squad,
  BracketTeam,
  MatchEvent,
  MatchEventType,
  MatchResult,
  PlayerRating,
  DraftedPlayer,
} from '@/types';

// ─── Poisson sampling ────────────────────────────────────────────────────────

function samplePoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// ─── Squad stat extraction ───────────────────────────────────────────────────

interface SquadStats {
  attack: number;   // 0–100
  midfield: number; // 0–100
  defense: number;  // 0–100
  chemMult: number; // 0.85–1.15
}

function extractUserStats(squad: Squad): SquadStats {
  const starters = squad.starters;

  const gk = starters.find((s) => s.slot === 'GK');
  const defenders = starters.filter((s) =>
    ['LB', 'RB', 'LCB', 'RCB', 'CB', 'LWB', 'RWB'].includes(s.slot)
  );
  const midfielders = starters.filter((s) =>
    ['CM', 'LCM', 'RCM', 'CDM', 'LCDM', 'RCDM', 'CAM', 'LAM', 'RAM'].includes(s.slot)
  );
  const forwards = starters.filter((s) =>
    ['LW', 'RW', 'ST', 'LST', 'RST', 'CF'].includes(s.slot)
  );

  const avg = (players: DraftedPlayer[], keys: (keyof DraftedPlayer['player'])[]) => {
    if (players.length === 0) return 75;
    const sum = players.reduce((acc, dp) => {
      const vals = keys.map((k) => dp.player[k] as number);
      return acc + vals.reduce((a, b) => a + b, 0) / vals.length;
    }, 0);
    return sum / players.length;
  };

  const attack = avg(
    forwards.length > 0 ? forwards : starters.slice(-3),
    ['sho', 'pac']
  );
  const midfield = avg(
    midfielders.length > 0 ? midfielders : starters.slice(4, 7),
    ['pas', 'dri']
  );
  const gkStat = gk ? (gk.player.def + gk.player.phy) / 2 : 70;
  const defAvg = avg(
    defenders.length > 0 ? defenders : starters.slice(1, 5),
    ['def', 'phy']
  );
  const defense = (defAvg * 2 + gkStat) / 3;

  const chemMult = 0.85 + (squad.chemistry / 100) * 0.3;

  return { attack, midfield, defense, chemMult };
}

function deriveOpponentStats(ovr: number): SquadStats {
  return {
    attack: ovr - 3,
    midfield: ovr - 5,
    defense: ovr - 3,
    chemMult: 1.0,
  };
}

// ─── xG calculation ──────────────────────────────────────────────────────────

function computeXg(
  attackerStats: number,
  chemMult: number,
  defenderStats: number,
  defChemMult: number,
  bonus = 0
): number {
  const raw =
    ((attackerStats * chemMult) / (defenderStats * defChemMult)) * 1.8 + bonus;
  // Add ±0.3 variance
  const variance = (Math.random() - 0.5) * 0.6;
  return Math.max(0.1, raw + variance);
}

// ─── Event generation ────────────────────────────────────────────────────────

const GOAL_TEMPLATES = [
  (name: string) => `${name} drives inside the box and fires low into the corner. GOAL!`,
  (name: string) => `${name} gets on the end of the cross and heads it home. GOAL!`,
  (name: string) => `${name} curls a beautiful effort into the top corner. GOAL!`,
  (name: string) => `${name} slots past the keeper from close range. GOAL!`,
  (name: string) => `${name} breaks the offside trap and finishes clinically. GOAL!`,
  (name: string) => `${name} latches onto the through ball and doesn't miss. GOAL!`,
];

const NON_GOAL_TEMPLATES: { type: MatchEventType; text: (name: string) => string }[] = [
  { type: 'SAVE', text: (n) => `Brilliant save! The keeper gets down to deny ${n}.` },
  { type: 'YELLOW_CARD', text: (n) => `${n} is booked for a late tackle. Yellow card.` },
  { type: 'CHANCE', text: (n) => `${n} shoots wide! So close to breaking the deadlock.` },
  { type: 'KEY_PASS', text: (n) => `Incisive pass from ${n} splits the defence — chance on!` },
  { type: 'SUBSTITUTION', text: (n) => `Tactical change — ${n} is brought on to change the game.` },
  { type: 'FOUL', text: (n) => `${n} brings down the attacker. Free kick awarded.` },
  { type: 'CHANCE', text: (n) => `${n} hits the post! Agonisingly close.` },
  { type: 'SAVE', text: (n) => `The keeper tips it over — ${n} can't believe it.` },
];

function pickGoalScorer(squad: Squad): string {
  const forwards = squad.starters.filter((s) =>
    ['LW', 'RW', 'ST', 'LST', 'RST', 'CF', 'CAM', 'LAM', 'RAM'].includes(s.slot)
  );
  const pool = forwards.length > 0 ? forwards : squad.starters;
  // Weight by SHO stat
  const total = pool.reduce((s, p) => s + p.player.sho, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.player.sho;
    if (r <= 0) return p.player.name;
  }
  return pool[pool.length - 1].player.name;
}

function pickRandomName(squad: Squad): string {
  const idx = Math.floor(Math.random() * squad.starters.length);
  return squad.starters[idx].player.name;
}

function pickRandomOpponentName(team: BracketTeam): string {
  return team.name; // We don't have individual players for AI teams
}

function generateEvents(
  userGoals: number,
  oppGoals: number,
  userSquad: Squad,
  opponent: BracketTeam,
  startMinute = 1,
  endMinute = 90
): MatchEvent[] {
  const events: MatchEvent[] = [];

  // Generate goal events first
  const userGoalMinutes: number[] = [];
  const oppGoalMinutes: number[] = [];

  for (let i = 0; i < userGoals; i++) {
    userGoalMinutes.push(
      Math.floor(Math.random() * (endMinute - startMinute - 5)) + startMinute + 5
    );
  }
  for (let i = 0; i < oppGoals; i++) {
    oppGoalMinutes.push(
      Math.floor(Math.random() * (endMinute - startMinute - 5)) + startMinute + 5
    );
  }

  for (const min of userGoalMinutes) {
    const scorer = pickGoalScorer(userSquad);
    const template = GOAL_TEMPLATES[Math.floor(Math.random() * GOAL_TEMPLATES.length)];
    events.push({
      minute: min,
      type: 'GOAL',
      description: `${min}' — ${template(scorer)}`,
      isUserTeam: true,
      isGoal: true,
    });
  }

  for (const min of oppGoalMinutes) {
    const template = GOAL_TEMPLATES[Math.floor(Math.random() * GOAL_TEMPLATES.length)];
    events.push({
      minute: min,
      type: 'GOAL',
      description: `${min}' — ${template(opponent.name)}`,
      isUserTeam: false,
      isGoal: true,
    });
  }

  // Pad with 3–5 non-goal events
  const targetCount = 5 + Math.floor(Math.random() * 4); // 5–8 total
  const padding = Math.max(0, targetCount - events.length);

  for (let i = 0; i < padding; i++) {
    const isUser = Math.random() > 0.5;
    const name = isUser
      ? pickRandomName(userSquad)
      : pickRandomOpponentName(opponent);
    const minute =
      Math.floor(Math.random() * (endMinute - startMinute)) + startMinute;
    const tpl =
      NON_GOAL_TEMPLATES[Math.floor(Math.random() * NON_GOAL_TEMPLATES.length)];

    // Avoid substitution before 45'
    const type: MatchEventType =
      tpl.type === 'SUBSTITUTION' && minute < 45 ? 'CHANCE' : tpl.type;

    events.push({
      minute,
      type,
      description: `${minute}' — ${tpl.text(name)}`,
      isUserTeam: isUser,
      isGoal: false,
    });
  }

  return events.sort((a, b) => a.minute - b.minute);
}

// ─── Player ratings ──────────────────────────────────────────────────────────

function generateRatings(
  starters: DraftedPlayer[],
  userGoals: number,
  userWon: boolean
): PlayerRating[] {
  return starters.map((dp) => {
    let base = 6.0;
    // Bonus for win/goals
    if (userWon) base += 0.3;
    if (userGoals > 0 && ['LW', 'RW', 'ST', 'LST', 'RST', 'CF'].includes(dp.slot)) {
      base += 0.2 * Math.min(userGoals, 2);
    }
    if (['GK', 'LCB', 'RCB', 'CB'].includes(dp.slot) && userWon) base += 0.2;
    // Random performance variance
    const variance = (Math.random() - 0.5) * 1.2;
    const rating = Math.min(9.0, Math.max(5.0, base + variance));
    return { player: dp, rating: Math.round(rating * 10) / 10 };
  });
}

// ─── Penalty shootout ────────────────────────────────────────────────────────

function simulatePenalties(
  userDefense: number,
  oppDefense: number
): { userWon: boolean; userPens: number; oppPens: number } {
  const userConversionBase = 0.72 + (userDefense / 100) * 0.05;
  const oppConversionBase = 0.72 + (oppDefense / 100) * 0.05;

  let userPens = 0;
  let oppPens = 0;

  for (let round = 1; round <= 5; round++) {
    if (Math.random() < userConversionBase) userPens++;
    if (Math.random() < oppConversionBase) oppPens++;
  }

  // Sudden death
  let sdRound = 0;
  while (userPens === oppPens && sdRound < 10) {
    sdRound++;
    if (Math.random() < userConversionBase) userPens++;
    if (Math.random() < oppConversionBase) oppPens++;
  }

  // Ultimate fallback
  if (userPens === oppPens) {
    userPens += Math.random() > 0.5 ? 1 : 0;
    oppPens += userPens > oppPens ? 0 : 1;
  }

  return { userWon: userPens > oppPens, userPens, oppPens };
}

// ─── Main simulate function ──────────────────────────────────────────────────

export function simulateMatch(
  userSquad: Squad,
  opponent: BracketTeam,
  roundIndex: number // 0=R16, 1=QF, 2=SF, 3=Final
): MatchResult {
  const userStats = extractUserStats(userSquad);
  const oppStats = deriveOpponentStats(opponent.ovr);

  // Home advantage in QF/SF
  const userBonus = roundIndex <= 2 ? 0.15 : 0;

  const userXg = computeXg(
    userStats.attack,
    userStats.chemMult,
    oppStats.defense,
    oppStats.chemMult,
    userBonus
  );
  const oppXg = computeXg(
    oppStats.attack,
    oppStats.chemMult,
    userStats.defense,
    userStats.chemMult
  );

  const userGoals = samplePoisson(userXg);
  const oppGoals = samplePoisson(oppXg);

  let events = generateEvents(userGoals, oppGoals, userSquad, opponent);
  let wentToET = false;
  let wentToPenalties = false;
  let userWon: boolean;
  let finalUserScore = userGoals;
  let finalOppScore = oppGoals;

  if (userGoals === oppGoals) {
    wentToET = true;
    // Extra time: 2 × 15min periods at reduced xG
    const etUserXg = userXg * 0.3;
    const etOppXg = oppXg * 0.3;
    const etUserGoals = samplePoisson(etUserXg);
    const etOppGoals = samplePoisson(etOppXg);

    const etEvents = generateEvents(etUserGoals, etOppGoals, userSquad, opponent, 91, 120);
    events = [...events, ...etEvents];

    finalUserScore += etUserGoals;
    finalOppScore += etOppGoals;

    if (finalUserScore === finalOppScore) {
      wentToPenalties = true;
      const penResult = simulatePenalties(userStats.defense, oppStats.defense);
      userWon = penResult.userWon;
    } else {
      userWon = finalUserScore > finalOppScore;
    }
  } else {
    userWon = userGoals > oppGoals;
  }

  const possession = Math.round(
    50 + ((userStats.midfield - oppStats.midfield) / 100) * 30
  );

  const userShots = Math.max(userGoals, Math.round(userXg * 3.5));
  const oppShots = Math.max(oppGoals, Math.round(oppXg * 3.5));

  const ratings = generateRatings(userSquad.starters, finalUserScore, userWon);
  const motmRating = ratings.reduce((best, r) =>
    r.rating > best.rating ? r : best
  );

  return {
    userScore: finalUserScore,
    opponentScore: finalOppScore,
    events,
    possession: Math.min(70, Math.max(30, possession)),
    userShots,
    opponentShots: oppShots,
    userShotsOnTarget: Math.ceil(userShots * 0.45),
    opponentShotsOnTarget: Math.ceil(oppShots * 0.45),
    userXg: Math.round(userXg * 10) / 10,
    opponentXg: Math.round(oppXg * 10) / 10,
    playerRatings: ratings,
    motm: motmRating.player,
    wentToET,
    wentToPenalties,
    userWon,
  };
}
