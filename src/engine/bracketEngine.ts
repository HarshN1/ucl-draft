import type { BracketTeam, BracketMatch, BracketRound, Squad } from '@/types';
import type { Rng } from '@/engine/rng';

// ─── Real UCL clubs ──────────────────────────────────────────────────────────

const badge = (teamId: number) => `https://cdn.sofifa.net/teams/${teamId}/60.png`;

const UCL_CLUBS: Omit<BracketTeam, 'seed'>[] = [
  { id: 'real-madrid', name: 'Real Madrid', ovr: 88, isUser: false, badgeUrl: badge(243) },
  { id: 'man-city', name: 'Manchester City', ovr: 87, isUser: false, badgeUrl: badge(10) },
  { id: 'bayern', name: 'Bayern Munich', ovr: 86, isUser: false, badgeUrl: badge(21) },
  { id: 'psg', name: 'Paris Saint-Germain', ovr: 85, isUser: false, badgeUrl: badge(73) },
  { id: 'barcelona', name: 'Barcelona', ovr: 85, isUser: false, badgeUrl: badge(241) },
  { id: 'arsenal', name: 'Arsenal', ovr: 84, isUser: false, badgeUrl: badge(1) },
  { id: 'leverkusen', name: 'Bayer Leverkusen', ovr: 83, isUser: false, badgeUrl: badge(32) },
  { id: 'atletico', name: 'Atlético Madrid', ovr: 83, isUser: false, badgeUrl: badge(240) },
  { id: 'inter', name: 'Inter Milan', ovr: 83, isUser: false, badgeUrl: badge(44) },
  { id: 'dortmund', name: 'Borussia Dortmund', ovr: 82, isUser: false, badgeUrl: badge(22) },
  { id: 'leipzig', name: 'RB Leipzig', ovr: 81, isUser: false, badgeUrl: badge(112172) },
  { id: 'juventus', name: 'Juventus', ovr: 81, isUser: false, badgeUrl: badge(45) },
  { id: 'porto', name: 'Porto', ovr: 80, isUser: false, badgeUrl: badge(236) },
  { id: 'benfica', name: 'Benfica', ovr: 80, isUser: false, badgeUrl: badge(234) },
  { id: 'liverpool', name: 'Liverpool', ovr: 86, isUser: false, badgeUrl: badge(9) },
  { id: 'monaco', name: 'Monaco', ovr: 79, isUser: false, badgeUrl: badge(69) },
];

// ─── Bracket generation ───────────────────────────────────────────────────────

export function generateBracket(squad: Squad, rng: Rng): BracketRound[] {
  // Random open draw: all 16 teams (user + 15 UCL clubs) shuffled into the
  // bracket with no seeding — you can draw anyone, anytime.
  const userTeam: BracketTeam = {
    id: 'user',
    name: squad.teamName,
    ovr: squad.ovrAvg,
    isUser: true,
    seed: 0,
    badgeUrl: badge(918), // FK Bodø/Glimt crest
  };

  const allTeams: BracketTeam[] = rng.shuffle([
    userTeam,
    ...UCL_CLUBS.map((club, i) => ({ ...club, seed: i + 1 })),
  ]);

  // Pair consecutive teams into the 8 Round-of-16 matches
  const r16Matches: BracketMatch[] = Array.from({ length: 8 }, (_, idx) => ({
    id: `r16-${idx}`,
    teamA: allTeams[idx * 2]!,
    teamB: allTeams[idx * 2 + 1]!,
    winner: null,
    scoreA: null,
    scoreB: null,
    roundIndex: 0,
    matchIndex: idx,
  }));

  // Placeholder QF/SF/F matches (populated as bracket progresses)
  const qfMatches: BracketMatch[] = Array.from({ length: 4 }, (_, i) => ({
    id: `qf-${i}`,
    teamA: null as unknown as BracketTeam,
    teamB: null as unknown as BracketTeam,
    winner: null,
    scoreA: null,
    scoreB: null,
    roundIndex: 1,
    matchIndex: i,
  }));

  const sfMatches: BracketMatch[] = Array.from({ length: 2 }, (_, i) => ({
    id: `sf-${i}`,
    teamA: null as unknown as BracketTeam,
    teamB: null as unknown as BracketTeam,
    winner: null,
    scoreA: null,
    scoreB: null,
    roundIndex: 2,
    matchIndex: i,
  }));

  const finalMatch: BracketMatch = {
    id: 'final',
    teamA: null as unknown as BracketTeam,
    teamB: null as unknown as BracketTeam,
    winner: null,
    scoreA: null,
    scoreB: null,
    roundIndex: 3,
    matchIndex: 0,
  };

  return [
    { name: 'Round of 16', matches: r16Matches },
    { name: 'Quarter-Final', matches: qfMatches },
    { name: 'Semi-Final', matches: sfMatches },
    { name: 'Final', matches: [finalMatch] },
  ];
}

// ─── Find user match ──────────────────────────────────────────────────────────

export function findUserMatch(
  rounds: BracketRound[],
  currentRound: number
): { match: BracketMatch; matchIndex: number } | null {
  const round = rounds[currentRound];
  if (!round) return null;
  const matchIndex = round.matches.findIndex(
    (m) => m.teamA?.isUser || m.teamB?.isUser
  );
  if (matchIndex === -1) return null;
  const match = round.matches[matchIndex];
  if (!match) return null;
  return { match, matchIndex };
}

// ─── AI vs AI simulation ─────────────────────────────────────────────────────

function simulateAiMatch(rng: Rng, teamA: BracketTeam, teamB: BracketTeam): {
  winner: BracketTeam;
  scoreA: number;
  scoreB: number;
} {
  // Logistic win probability from the rating gap — favourites usually win, but
  // upsets are very much on the table (a 5-OVR gap ≈ 64/36).
  const diff = teamA.ovr - teamB.ovr;
  const probA = 1 / (1 + Math.pow(10, -diff / 12));

  // Expected goals scale with each side's attack vs the other's defence.
  const lambda = (att: number, def: number) => Math.max(0.25, 0.9 + (att - def) / 12);
  const poisson = (l: number) => {
    const L = Math.exp(-l);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng.next();
    } while (p > L);
    return k - 1;
  };
  let scoreA = Math.min(6, poisson(lambda(teamA.ovr + 1, teamB.ovr)));
  let scoreB = Math.min(6, poisson(lambda(teamB.ovr + 1, teamA.ovr)));

  // On a draw, decide by the logistic probability (extra time / pens).
  if (scoreA === scoreB) {
    if (rng.next() < probA) scoreA++;
    else scoreB++;
  }
  return { winner: scoreA > scoreB ? teamA : teamB, scoreA, scoreB };
}

// ─── Progress bracket after a round ──────────────────────────────────────────

/**
 * Simulate all AI-vs-AI matches in a completed round, then populate next round slots.
 * User match result must be applied before calling this (via applyUserResult).
 */
export function progressBracket(
  rounds: BracketRound[],
  completedRoundIndex: number,
  rng: Rng
): BracketRound[] {
  const updated = rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m })),
  }));

  const completedRound = updated[completedRoundIndex];
  if (!completedRound) return updated;

  // Simulate AI vs AI matches that don't have a winner yet
  for (const match of completedRound.matches) {
    if (!match.winner && match.teamA && match.teamB) {
      if (!match.teamA.isUser && !match.teamB.isUser) {
        const result = simulateAiMatch(rng, match.teamA, match.teamB);
        match.winner = result.winner;
        match.scoreA = result.scoreA;
        match.scoreB = result.scoreB;
      }
    }
  }

  // Populate next round
  const nextRound = updated[completedRoundIndex + 1];
  if (!nextRound) return updated;

  for (let i = 0; i < completedRound.matches.length; i += 2) {
    const matchA = completedRound.matches[i];
    const matchB = completedRound.matches[i + 1];
    const nextMatchIdx = Math.floor(i / 2);
    const nextMatch = nextRound.matches[nextMatchIdx];

    if (nextMatch && matchA?.winner) {
      nextMatch.teamA = matchA.winner;
    }
    if (nextMatch && matchB?.winner) {
      nextMatch.teamB = matchB.winner;
    }
  }

  return updated;
}

/**
 * Apply the user's match result to the bracket.
 * `userWon` is authoritative (handles penalty-shootout wins where scores are level)
 * and correctly assigns the winner whether the user is teamA or teamB.
 */
export function applyUserResult(
  rounds: BracketRound[],
  roundIndex: number,
  matchIndex: number,
  userScore: number,
  oppScore: number,
  userWon: boolean
): BracketRound[] {
  const updated = rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m })),
  }));

  const match = updated[roundIndex]?.matches[matchIndex];
  if (!match) return updated;

  const userIsA = match.teamA.isUser;
  match.scoreA = userIsA ? userScore : oppScore;
  match.scoreB = userIsA ? oppScore : userScore;
  // winner is the user's side iff the user won
  match.winner = userWon === userIsA ? match.teamA : match.teamB;

  return updated;
}

/**
 * Simulate every remaining round (AI vs AI) from `fromRoundIndex` through the
 * final, returning the completed bracket and the tournament champion.
 * Used when the user is eliminated, to show who lifts the trophy.
 */
export function simulateToChampion(
  rounds: BracketRound[],
  fromRoundIndex: number,
  rng: Rng
): { bracket: BracketRound[]; champion: BracketTeam | null } {
  let b = rounds;
  for (let r = fromRoundIndex; r <= 3; r++) {
    b = progressBracket(b, r, rng);
  }
  const champion = b[3]?.matches[0]?.winner ?? null;
  return { bracket: b, champion };
}

/**
 * Check if the user has been eliminated or has won the final.
 */
export function getUserResult(
  rounds: BracketRound[],
  roundIndex: number
): 'advancing' | 'eliminated' | 'champion' {
  const round = rounds[roundIndex];
  if (!round) return 'champion';

  const userMatch = round.matches.find(
    (m) => m.teamA?.isUser || m.teamB?.isUser
  );

  if (!userMatch || !userMatch.winner) return 'advancing';
  if (userMatch.winner.isUser) {
    if (roundIndex === 3) return 'champion';
    return 'advancing';
  }
  return 'eliminated';
}

/**
 * Get the round result label for the leaderboard.
 */
export function getRoundResultLabel(roundIndex: number, won: boolean): string {
  const roundNames = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final'];
  if (won && roundIndex === 3) return 'Champions';
  if (won) return `Won ${roundNames[roundIndex] ?? 'round'}`;
  return `Eliminated ${roundNames[roundIndex] ?? 'round'}`;
}
