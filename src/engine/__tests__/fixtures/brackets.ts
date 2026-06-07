import type { BracketMatch, BracketRound, BracketTeam } from '@/types';

export const USER_TEAM: BracketTeam = {
  id: 'user',
  name: 'Test United',
  ovr: 86,
  isUser: true,
  seed: 0,
};

export const OPPONENT: BracketTeam = {
  id: 'real-madrid',
  name: 'Real Madrid',
  ovr: 88,
  isUser: false,
  seed: 1,
};

export function makeUserMatch(
  userWon: boolean,
  roundIndex = 0
): BracketMatch {
  const userScore = userWon ? 2 : 0;
  const oppScore = userWon ? 1 : 2;
  return {
    id: `r16-0`,
    teamA: USER_TEAM,
    teamB: OPPONENT,
    winner: userWon ? USER_TEAM : OPPONENT,
    scoreA: userScore,
    scoreB: oppScore,
    roundIndex,
    matchIndex: 0,
  };
}

/** Minimal bracket with one completed R16 user match. */
export function makeMinimalBracket(userWon = true): BracketRound[] {
  const userMatch = makeUserMatch(userWon, 0);
  const filler = (id: string, idx: number): BracketMatch => ({
    id,
    teamA: { id: `a-${idx}`, name: `Team A${idx}`, ovr: 80, isUser: false, seed: idx },
    teamB: { id: `b-${idx}`, name: `Team B${idx}`, ovr: 79, isUser: false, seed: idx + 1 },
    winner: { id: `a-${idx}`, name: `Team A${idx}`, ovr: 80, isUser: false, seed: idx },
    scoreA: 1,
    scoreB: 0,
    roundIndex: 0,
    matchIndex: idx,
  });

  return [
    {
      name: 'Round of 16',
      matches: [userMatch, ...Array.from({ length: 7 }, (_, i) => filler(`r16-${i + 1}`, i + 1))],
    },
    {
      name: 'Quarter-Final',
      matches: Array.from({ length: 4 }, (_, i) => ({
        id: `qf-${i}`,
        teamA: null as unknown as BracketTeam,
        teamB: null as unknown as BracketTeam,
        winner: null,
        scoreA: null,
        scoreB: null,
        roundIndex: 1,
        matchIndex: i,
      })),
    },
    {
      name: 'Semi-Final',
      matches: Array.from({ length: 2 }, (_, i) => ({
        id: `sf-${i}`,
        teamA: null as unknown as BracketTeam,
        teamB: null as unknown as BracketTeam,
        winner: null,
        scoreA: null,
        scoreB: null,
        roundIndex: 2,
        matchIndex: i,
      })),
    },
    {
      name: 'Final',
      matches: [
        {
          id: 'final',
          teamA: null as unknown as BracketTeam,
          teamB: null as unknown as BracketTeam,
          winner: null,
          scoreA: null,
          scoreB: null,
          roundIndex: 3,
          matchIndex: 0,
        },
      ],
    },
  ];
}
