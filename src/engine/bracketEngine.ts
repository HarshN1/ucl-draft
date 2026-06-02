import type { BracketTeam, BracketMatch, BracketRound, Squad } from '@/types';

// ─── Real UCL clubs ──────────────────────────────────────────────────────────

const UCL_CLUBS: Omit<BracketTeam, 'seed'>[] = [
  { id: 'real-madrid', name: 'Real Madrid', ovr: 88, isUser: false },
  { id: 'man-city', name: 'Manchester City', ovr: 87, isUser: false },
  { id: 'bayern', name: 'Bayern Munich', ovr: 86, isUser: false },
  { id: 'psg', name: 'Paris Saint-Germain', ovr: 85, isUser: false },
  { id: 'barcelona', name: 'Barcelona', ovr: 85, isUser: false },
  { id: 'arsenal', name: 'Arsenal', ovr: 84, isUser: false },
  { id: 'leverkusen', name: 'Bayer Leverkusen', ovr: 83, isUser: false },
  { id: 'atletico', name: 'Atlético Madrid', ovr: 83, isUser: false },
  { id: 'inter', name: 'Inter Milan', ovr: 83, isUser: false },
  { id: 'dortmund', name: 'Borussia Dortmund', ovr: 82, isUser: false },
  { id: 'leipzig', name: 'RB Leipzig', ovr: 81, isUser: false },
  { id: 'juventus', name: 'Juventus', ovr: 81, isUser: false },
  { id: 'porto', name: 'Porto', ovr: 80, isUser: false },
  { id: 'benfica', name: 'Benfica', ovr: 80, isUser: false },
  { id: 'monaco', name: 'Monaco', ovr: 79, isUser: false },
];

// Standard 16-team seeding bracket: [seedA, seedB]
const SEED_PAIRS: [number, number][] = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [3, 14],
  [6, 11],
  [7, 10],
  [2, 15],
];

// ─── Seeding ──────────────────────────────────────────────────────────────────

/**
 * Determine user's seed (1–16) based on draft score.
 * 190+ → seed 1–4, 180–189 → 5–8, 170–179 → 9–12, <170 → 13–16
 */
function getUserSeed(draftScore: number): number {
  if (draftScore >= 190) return 1 + Math.floor(Math.random() * 4);      // 1–4
  if (draftScore >= 180) return 5 + Math.floor(Math.random() * 4);      // 5–8
  if (draftScore >= 170) return 9 + Math.floor(Math.random() * 4);      // 9–12
  return 13 + Math.floor(Math.random() * 4);                            // 13–16
}

// ─── Bracket generation ───────────────────────────────────────────────────────

export function generateBracket(squad: Squad): BracketRound[] {
  const userSeed = getUserSeed(squad.draftScore);

  // Build seeded list of all 16 teams
  const userTeam: BracketTeam = {
    id: 'user',
    name: squad.teamName,
    ovr: squad.ovrAvg,
    isUser: true,
    seed: userSeed,
  };

  // Seed AI clubs by OVR descending
  const aiClubs = [...UCL_CLUBS]
    .sort((a, b) => b.ovr - a.ovr)
    .map((club, idx) => ({
      ...club,
      seed: idx + 1 < userSeed ? idx + 1 : idx + 2, // skip user's seed
    }));

  // Build ordered seed map: seed → team
  const seededTeams: Record<number, BracketTeam> = {};
  seededTeams[userSeed] = userTeam;
  let aiIdx = 0;
  for (let seed = 1; seed <= 16; seed++) {
    if (seed === userSeed) continue;
    seededTeams[seed] = { ...aiClubs[aiIdx], seed };
    aiIdx++;
  }

  // R16 matches from seed pairs
  const r16Matches: BracketMatch[] = SEED_PAIRS.map(([sA, sB], idx) => ({
    id: `r16-${idx}`,
    teamA: seededTeams[sA],
    teamB: seededTeams[sB],
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
  return { match: round.matches[matchIndex], matchIndex };
}

// ─── AI vs AI simulation ─────────────────────────────────────────────────────

function simulateAiMatch(teamA: BracketTeam, teamB: BracketTeam): {
  winner: BracketTeam;
  scoreA: number;
  scoreB: number;
} {
  const diff = (teamA.ovr - teamB.ovr) / 20; // -1 to 1
  const probA = 0.5 + diff * 0.25;
  const aWins = Math.random() < probA;
  const scoreA = Math.floor(Math.random() * 3) + (aWins ? 1 : 0);
  const scoreB = Math.floor(Math.random() * 3) + (aWins ? 0 : 1);
  return {
    winner: aWins ? teamA : teamB,
    scoreA,
    scoreB,
  };
}

// ─── Progress bracket after a round ──────────────────────────────────────────

/**
 * Simulate all AI-vs-AI matches in a completed round, then populate next round slots.
 * User match result must be applied before calling this (via applyUserResult).
 */
export function progressBracket(
  rounds: BracketRound[],
  completedRoundIndex: number
): BracketRound[] {
  const updated = rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m })),
  }));

  const completedRound = updated[completedRoundIndex];

  // Simulate AI vs AI matches that don't have a winner yet
  for (const match of completedRound.matches) {
    if (!match.winner && match.teamA && match.teamB) {
      if (!match.teamA.isUser && !match.teamB.isUser) {
        const result = simulateAiMatch(match.teamA, match.teamB);
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
 */
export function applyUserResult(
  rounds: BracketRound[],
  roundIndex: number,
  matchIndex: number,
  userScore: number,
  oppScore: number
): BracketRound[] {
  const updated = rounds.map((r) => ({
    ...r,
    matches: r.matches.map((m) => ({ ...m })),
  }));

  const match = updated[roundIndex].matches[matchIndex];
  if (!match) return updated;

  match.scoreA = match.teamA.isUser ? userScore : oppScore;
  match.scoreB = match.teamB.isUser ? userScore : oppScore;
  match.winner = userScore > oppScore ? match.teamA : match.teamB;

  return updated;
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
  if (won) return `Won ${roundNames[roundIndex]}`;
  return `Eliminated ${roundNames[roundIndex]}`;
}
