import type {
  Squad,
  BracketTeam,
  MatchEvent,
  MatchResult,
  PlayerRating,
  DraftedPlayer,
} from '@/types';
import type { Rng } from '@/engine/rng';
import { playerPositionGroup } from '@/engine/chemistryEngine';

// ─── Small math helpers ────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Roughly-normal noise in [-1.5, 1.5] (sum of three uniforms, centred). */
const gauss = (rng: Rng) => rng.next() + rng.next() + rng.next() - 1.5;

// ─── Slot → line buckets ───────────────────────────────────────────────────────

const DEF_SLOTS = new Set(['GK', 'LB', 'RB', 'LCB', 'RCB', 'CB', 'LWB', 'RWB']);
const ATT_SLOTS = new Set(['ST', 'LS', 'RS', 'CF', 'LF', 'RF', 'LW', 'RW']);

/**
 * Real 2026/27 UCL Club Star Rosters for authentic AI scorer/booking narration.
 */
const AI_CLUB_ROSTERS: Record<string, { attackers: string[]; defenders: string[] }> = {
  'real-madrid': {
    attackers: ['Mbappé', 'Vini Jr', 'Bellingham', 'Rodrygo', 'Valverde'],
    defenders: ['Rüdiger', 'Militão', 'Tchouaméni', 'Carvajal', 'Camavinga'],
  },
  'man-city': {
    attackers: ['Haaland', 'Foden', 'De Bruyne', 'Savinho', 'Doku'],
    defenders: ['Rúben Dias', 'Rodri', 'Gvardiol', 'Akanji', 'Walker'],
  },
  bayern: {
    attackers: ['Kane', 'Musiala', 'Olise', 'Sané', 'Gnabry'],
    defenders: ['Upamecano', 'Kim Min-jae', 'Kimmich', 'Davies', 'Palhinha'],
  },
  liverpool: {
    attackers: ['Salah', 'Luis Díaz', 'Gakpo', 'Szoboszlai', 'Darwin Núñez'],
    defenders: ['van Dijk', 'Konaté', 'Gravenberch', 'Mac Allister', 'Robertson'],
  },
  psg: {
    attackers: ['Dembélé', 'Barcola', 'Doué', 'Vitinha', 'Gonçalo Ramos'],
    defenders: ['Marquinhos', 'Hakimi', 'Pacho', 'João Neves', 'Nuno Mendes'],
  },
  barcelona: {
    attackers: ['Lewandowski', 'Lamine Yamal', 'Raphinha', 'Dani Olmo', 'Pedri'],
    defenders: ['Koundé', 'Cubarsí', 'Araujo', 'de Jong', 'Balde'],
  },
  arsenal: {
    attackers: ['Saka', 'Ødegaard', 'Havertz', 'Martinelli', 'Trossard'],
    defenders: ['Saliba', 'Gabriel', 'Declan Rice', 'Timber', 'Calafiori'],
  },
  leverkusen: {
    attackers: ['Wirtz', 'Boniface', 'Schick', 'Grimaldo', 'Frimpong'],
    defenders: ['Tah', 'Tapsoba', 'Xhaka', 'Hincapié', 'Andrich'],
  },
  atletico: {
    attackers: ['Julián Alvarez', 'Griezmann', 'Sørloth', 'Giuliano Simeone', 'De Paul'],
    defenders: ['Giménez', 'Le Normand', 'Koke', 'Marcos Llorente', 'Barrios'],
  },
  inter: {
    attackers: ['Lautaro Martínez', 'Thuram', 'Barella', 'Çalhanoğlu', 'Dimarco'],
    defenders: ['Bastoni', 'Pavard', 'Dumfries', 'Acerbi', 'Mkhitaryan'],
  },
  dortmund: {
    attackers: ['Guirassy', 'Adeyemi', 'Brandt', 'Gittens', 'Beier'],
    defenders: ['Schlotterbeck', 'Emre Can', 'Sabitzer', 'Ryerson', 'Anton'],
  },
  leipzig: {
    attackers: ['Openda', 'Šeško', 'Xavi Simons', 'Nusa', 'Baumgartner'],
    defenders: ['Orbán', 'Lukeba', 'Raum', 'Haidara', 'Henrichs'],
  },
  juventus: {
    attackers: ['Vlahović', 'Yıldız', 'Koopmeiners', 'Conceição', 'Nico González'],
    defenders: ['Bremer', 'Cambiaso', 'Locatelli', 'Gatti', 'Thuram'],
  },
  porto: {
    attackers: ['Samu Aghehowa', 'Pepê', 'Galeno', 'Fábio Vieira', 'Nico González'],
    defenders: ['Diogo Costa', 'Alan Varela', 'Nehuén Pérez', 'Martim Fernandes', 'Moura'],
  },
  benfica: {
    attackers: ['Di María', 'Pavlidis', 'Aktürkoğlu', 'Kökçü', 'Aursnes'],
    defenders: ['Otamendi', 'António Silva', 'Florentino', 'Bah', 'Carreras'],
  },
  monaco: {
    attackers: ['Akliouche', 'Ben Seghir', 'Embolo', 'Minamino', 'Golovin'],
    defenders: ['Zakaria', 'Vanderson', 'Kehrer', 'Singa', 'Camara'],
  },
};

function pickOpponentAttacker(rng: Rng, opponent: BracketTeam): string {
  const roster = AI_CLUB_ROSTERS[opponent.id];
  if (roster && roster.attackers.length > 0) {
    return `${rng.pick(roster.attackers)} (${opponent.name})`;
  }
  return opponent.name;
}

function pickOpponentFoulPlayer(rng: Rng, opponent: BracketTeam): string {
  const roster = AI_CLUB_ROSTERS[opponent.id];
  if (roster && roster.defenders.length > 0) {
    return `${rng.pick(roster.defenders)} (${opponent.name})`;
  }
  return opponent.name;
}

interface SquadStats {
  attack: number;
  midfield: number;
  defense: number;
  gk: number;
  chemMult: number;
}

function avgStat(
  players: DraftedPlayer[],
  fn: (p: DraftedPlayer['player']) => number,
  fallback: number
) {
  if (!players.length) return fallback;
  return players.reduce((a, dp) => a + fn(dp.player), 0) / players.length;
}

function extractUserStats(starters: DraftedPlayer[], chemistry: number): SquadStats {
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
  const chemMult = 0.8 + (chemistry / 100) * 0.4;

  return { attack, midfield, defense, gk: gkRating, chemMult };
}

function opponentStats(ovr: number): SquadStats {
  return { attack: ovr + 1, midfield: ovr - 1, defense: ovr, gk: ovr, chemMult: 1.0 };
}

// ─── AI "Manager" Automatic Substitutions ────────────────────────────────────

interface ManagerSubPlan {
  minute: number;
  subOn: DraftedPlayer;
  starterOff: DraftedPlayer;
}

/**
 * Around 60'–76', the user's drafted Manager automatically brings on up to 3
 * bench substitutes (from the 7-man bench) to replace fatigued or lower-rated
 * outfield starters in compatible lines.
 */
function planManagerSubstitutions(rng: Rng, squad: Squad): ManagerSubPlan[] {
  if (!squad.subs || squad.subs.length === 0) return [];
  const usedStarterIndices = new Set<number>();
  const usedSubIds = new Set<number>();
  const plans: ManagerSubPlan[] = [];

  const outfieldStarters = squad.starters.filter((s) => s.slot !== 'GK');
  const outfieldSubs = squad.subs
    .filter((s) => s.player.position !== 'GK')
    .sort((a, b) => b.player.overall - a.player.overall);

  const subWindows: [number, number][] = [
    [58, 64],
    [66, 73],
    [75, 82],
  ];

  for (const sub of outfieldSubs) {
    if (plans.length >= 3) break;
    if (usedSubIds.has(sub.player.id)) continue;

    const subGroup = playerPositionGroup(sub.player.position);
    const candidates = outfieldStarters
      .filter((st) => !usedStarterIndices.has(st.slotIndex))
      .sort((a, b) => {
        const aMatch = playerPositionGroup(a.player.position) === subGroup ? 0 : 1;
        const bMatch = playerPositionGroup(b.player.position) === subGroup ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return a.player.overall - b.player.overall;
      });

    const target = candidates[0];
    if (!target) continue;

    // Manager makes the sub if the bench player is higher/similar OVR or brings fresh legs (within 3 OVR)
    if (sub.player.overall >= target.player.overall - 3 || plans.length < 2) {
      const win = subWindows[plans.length] ?? [65, 78];
      const minute = win[0] + rng.int(Math.max(1, win[1] - win[0]));
      usedStarterIndices.add(target.slotIndex);
      usedSubIds.add(sub.player.id);
      plans.push({
        minute,
        subOn: {
          ...sub,
          slot: target.slot,
          slotIndex: target.slotIndex,
          chemistry: 5, // FUT 16 bench sub chemistry
        },
        starterOff: target,
      });
    }
  }

  return plans.sort((a, b) => a.minute - b.minute);
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
  let shots = Math.round(
    (shotBase * (0.55 + possession / 100) * (1 + homeBonus) + gauss(rng) * 1.6) * scale
  );
  shots = clamp(shots, scale < 1 ? 0 : 1, 22);

  let xg = 0;
  let sot = 0;
  let bigChances = 0;
  let corners = Math.max(0, Math.round(shots * 0.5 + gauss(rng)));
  let goals = 0;
  const goalMinutes: number[] = [];

  for (let i = 0; i < shots; i++) {
    const quality = clamp(
      0.085 + (attackPower - defResist) / 400 + (rng.next() - 0.5) * 0.13,
      0.02,
      0.85
    );
    xg += quality;
    if (quality > 0.3) bigChances++;
    if (rng.next() < quality) {
      goals++;
      sot++;
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
  (n: string) => `Huge reflex save to deny ${n} from point-blank range!`,
  (n: string) => `The keeper fingertips ${n}'s curling effort onto the post!`,
  (n: string) => `Acrobatic diving stop keeps ${n} out!`,
];
const CHANCE_TEMPLATES = [
  (n: string) => `${n} drags a fierce strike just wide of the far post.`,
  (n: string) => `${n} rattles the crossbar from 22 yards — inches away!`,
  (n: string) => `${n} slices over the bar from the edge of the area.`,
];
const CARD_TEMPLATES = [
  (n: string) => `${n} goes into the referee's book for a tactical foul.`,
  (n: string) => `Yellow card shown to ${n} after a late sliding challenge.`,
];

function pickScorerAtMinute(
  rng: Rng,
  starters: DraftedPlayer[],
  subPlans: ManagerSubPlan[],
  minute: number
): DraftedPlayer {
  const activeLineup = starters.map((st) => {
    const activeSub = subPlans.find(
      (sp) => sp.starterOff.slotIndex === st.slotIndex && sp.minute <= minute
    );
    return activeSub ? activeSub.subOn : st;
  });

  const fwd = activeLineup.filter(
    (s) => ATT_SLOTS.has(s.slot) || ['CAM', 'LCAM', 'RCAM', 'CCAM'].includes(s.slot)
  );
  const pool = fwd.length ? fwd : activeLineup.filter((s) => s.slot !== 'GK');
  const safePool = pool.length ? pool : activeLineup;
  const total = safePool.reduce((a, p) => a + Math.max(40, p.player.sho), 0) || 1;
  let r = rng.next() * total;
  for (const p of safePool) {
    r -= Math.max(40, p.player.sho);
    if (r <= 0) return p;
  }
  return safePool[safePool.length - 1]!;
}

/** Pick an outfield player weighted toward defenders/CDMs for bookings (never GK). */
function pickUserBookedPlayer(rng: Rng, starters: DraftedPlayer[]): DraftedPlayer {
  const outfield = starters.filter((s) => s.slot !== 'GK');
  const pool = outfield.length ? outfield : starters;
  const weights = pool.map((s) => (DEF_SLOTS.has(s.slot) ? 3.0 : ATT_SLOTS.has(s.slot) ? 1.0 : 2.2));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let r = rng.next() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return pool[i]!;
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
      if (oppGoals === 0) r += 0.7;
      else r -= 0.18 * oppGoals;
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
  const subPlans = planManagerSubstitutions(rng, userSquad);
  const mgrName = userSquad.manager?.name ?? 'Manager';

  // Effective squad includes a fresh-legs boost in the final third of the match from bench subs
  const u = extractUserStats(userSquad.starters, userSquad.chemistry);
  const subBoost = subPlans.length * 0.65;
  const o = opponentStats(opponent.ovr);
  const home = roundIndex <= 2 ? 0.08 : 0;

  const um = (u.midfield + subBoost * 0.5) * u.chemMult;
  const possession = clamp(Math.round(50 + ((um - o.midfield) / (um + o.midfield)) * 40), 28, 72);

  const userDefResist = o.defense * 0.7 + o.gk * 0.3;
  const oppDefResist = ((u.defense + subBoost * 0.3) * 0.7 + u.gk * 0.3) * u.chemMult;

  const userSide = simulateSide(
    rng,
    (u.attack + subBoost) * u.chemMult,
    userDefResist,
    possession,
    home,
    6,
    90
  );
  const oppSide = simulateSide(rng, o.attack, oppDefResist, 100 - possession, 0, 6, 90);

  let userScore = Math.min(userSide.goals, 7);
  let oppScore = Math.min(oppSide.goals, 7);

  const events: MatchEvent[] = [];
  const scorerIds = new Map<number, number>();

  // Emit AI Manager Substitution events
  for (const plan of subPlans) {
    events.push({
      minute: plan.minute,
      type: 'SUBSTITUTION',
      description: `${plan.minute}' — Tactical Sub (${mgrName}): ${plan.subOn.player.name} (${plan.subOn.player.overall}) replaces ${plan.starterOff.player.name}`,
      isUserTeam: true,
      isGoal: false,
    });
  }

  const addGoals = (count: number, minutes: number[], isUser: boolean) => {
    for (let i = 0; i < count; i++) {
      const minute = minutes[i] ?? 6 + rng.int(84);
      if (isUser) {
        const scorer = pickScorerAtMinute(rng, userSquad.starters, subPlans, minute);
        scorerIds.set(scorer.player.id, (scorerIds.get(scorer.player.id) ?? 0) + 1);
        const isSubScorer = subPlans.some(
          (sp) => sp.subOn.player.id === scorer.player.id && sp.minute <= minute
        );
        const subTag = isSubScorer ? ' (Sub impact!)' : '';
        events.push({
          minute,
          type: 'GOAL',
          description: `${minute}' — ${rng.pick(GOAL_TEMPLATES)(scorer.player.name)}${subTag}`,
          isUserTeam: true,
          isGoal: true,
        });
      } else {
        const oppScorer = pickOpponentAttacker(rng, opponent);
        events.push({
          minute,
          type: 'GOAL',
          description: `${minute}' — ${rng.pick(GOAL_TEMPLATES)(oppScorer)}`,
          isUserTeam: false,
          isGoal: true,
        });
      }
    }
  };
  addGoals(userScore, userSide.goalMinutes, true);
  addGoals(oppScore, oppSide.goalMinutes, false);

  const flavour = (side: SideResult, isUser: boolean) => {
    const saves = clamp(side.sot - side.goals, 0, 2);
    for (let i = 0; i < saves; i++) {
      const minute = 5 + rng.int(85);
      const name = isUser
        ? pickScorerAtMinute(rng, userSquad.starters, subPlans, minute).player.name
        : pickOpponentAttacker(rng, opponent);
      events.push({
        minute,
        type: 'SAVE',
        description: `${minute}' — ${rng.pick(SAVE_TEMPLATES)(name)}`,
        isUserTeam: isUser,
        isGoal: false,
      });
    }
    if (side.shots - side.sot > 1 && rng.next() < 0.7) {
      const minute = 5 + rng.int(85);
      const name = isUser
        ? pickScorerAtMinute(rng, userSquad.starters, subPlans, minute).player.name
        : pickOpponentAttacker(rng, opponent);
      events.push({
        minute,
        type: 'CHANCE',
        description: `${minute}' — ${rng.pick(CHANCE_TEMPLATES)(name)}`,
        isUserTeam: isUser,
        isGoal: false,
      });
    }
  };
  flavour(userSide, true);
  flavour(oppSide, false);

  // 0–2 bookings (strictly outfield players, weighted toward defenders/midfielders).
  const cards = rng.int(3);
  for (let i = 0; i < cards; i++) {
    const isUser = rng.next() < 0.5;
    const minute = 12 + rng.int(76);
    const name = isUser
      ? pickUserBookedPlayer(rng, userSquad.starters).player.name
      : pickOpponentFoulPlayer(rng, opponent);
    events.push({
      minute,
      type: 'YELLOW_CARD',
      description: `${minute}' — ${rng.pick(CARD_TEMPLATES)(name)}`,
      isUserTeam: isUser,
      isGoal: false,
    });
  }

  let wentToET = false;
  let wentToPenalties = false;
  let userPenScore: number | undefined;
  let oppPenScore: number | undefined;
  let userWon: boolean;

  if (userScore === oppScore) {
    wentToET = true;
    const etUser = simulateSide(
      rng,
      (u.attack + subBoost) * u.chemMult,
      userDefResist,
      possession,
      home,
      91,
      120,
      0.33
    );
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

  const ratings = generateRatings(
    rng,
    userSquad.starters,
    scorerIds,
    oppScore,
    possession,
    userWon
  );
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
