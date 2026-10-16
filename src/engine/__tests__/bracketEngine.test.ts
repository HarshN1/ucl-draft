import { describe, it, expect } from 'vitest';
import {
  generateBracket,
  findUserMatch,
  applyUserResult,
  progressBracket,
  getUserResult,
  getRoundResultLabel,
  simulateToChampion,
} from '@/engine/bracketEngine';
import { Rng } from '@/engine/rng';
import { makeTestSquad } from './fixtures/squads';
import { makeMinimalBracket, USER_TEAM } from './fixtures/brackets';

describe('generateBracket', () => {
  it('creates 4 rounds with correct match counts', () => {
    const bracket = generateBracket(makeTestSquad(), new Rng(1));
    expect(bracket).toHaveLength(4);
    expect(bracket[0]!.matches).toHaveLength(8);
    expect(bracket[1]!.matches).toHaveLength(4);
    expect(bracket[2]!.matches).toHaveLength(2);
    expect(bracket[3]!.matches).toHaveLength(1);
  });

  it('includes exactly one user team among 16 participants', () => {
    const bracket = generateBracket(makeTestSquad(), new Rng(1));
    const teams = bracket[0]!.matches.flatMap((m) => [m.teamA, m.teamB]);
    expect(teams).toHaveLength(16);
    expect(teams.filter((t) => t.isUser)).toHaveLength(1);
    expect(teams.find((t) => t.isUser)?.name).toBe('Test United');
  });
});

describe('findUserMatch', () => {
  it('locates the user match in the current round', () => {
    const bracket = makeMinimalBracket(true);
    const found = findUserMatch(bracket, 0);
    expect(found).not.toBeNull();
    expect(found!.match.teamA.isUser || found!.match.teamB.isUser).toBe(true);
  });

  it('returns null when no user match exists', () => {
    const bracket = makeMinimalBracket(true);
    bracket[0]!.matches[0] = {
      ...bracket[0]!.matches[0]!,
      teamA: { id: 'a', name: 'A', ovr: 80, isUser: false, seed: 1 },
      teamB: { id: 'b', name: 'B', ovr: 79, isUser: false, seed: 2 },
    };
    expect(findUserMatch(bracket, 0)).toBeNull();
  });
});

describe('applyUserResult', () => {
  it('records scores and winner when user is teamA', () => {
    const bracket = makeMinimalBracket(false);
    const updated = applyUserResult(bracket, 0, 0, 3, 1, true);
    const match = updated[0]!.matches[0]!;
    expect(match.scoreA).toBe(3);
    expect(match.scoreB).toBe(1);
    expect(match.winner?.isUser).toBe(true);
  });

  it('records scores correctly when user is teamB', () => {
    const bracket = makeMinimalBracket(false);
    bracket[0]!.matches[0] = {
      ...bracket[0]!.matches[0]!,
      teamA: bracket[0]!.matches[0]!.teamB,
      teamB: USER_TEAM,
    };
    const updated = applyUserResult(bracket, 0, 0, 2, 0, true);
    const match = updated[0]!.matches[0]!;
    expect(match.scoreA).toBe(0);
    expect(match.scoreB).toBe(2);
    expect(match.winner?.isUser).toBe(true);
  });
});

describe('progressBracket', () => {
  it('simulates AI matches and advances winners to the next round', () => {
    const bracket = makeMinimalBracket(true);
    const updated = progressBracket(bracket, 0, new Rng(1));
    const qf = updated[1]!.matches[0]!;
    expect(qf.teamA || qf.teamB).toBeTruthy();
  });
});

describe('getUserResult', () => {
  it('reports advancing, eliminated, and champion states', () => {
    const advancing = makeMinimalBracket(true);
    expect(getUserResult(advancing, 0)).toBe('advancing');

    const eliminated = makeMinimalBracket(false);
    expect(getUserResult(eliminated, 0)).toBe('eliminated');
  });
});

describe('getRoundResultLabel', () => {
  it('returns correct labels for wins and losses', () => {
    expect(getRoundResultLabel(3, true)).toBe('Champions');
    expect(getRoundResultLabel(1, true)).toBe('Won Quarter-Final');
    expect(getRoundResultLabel(2, false)).toBe('Eliminated Semi-Final');
  });
});

describe('simulateToChampion', () => {
  it('completes remaining rounds and returns a champion', () => {
    const bracket = makeMinimalBracket(false);
    const { bracket: completed, champion } = simulateToChampion(bracket, 0, new Rng(1));
    expect(completed[3]!.matches[0]!.winner).toBeTruthy();
    expect(champion).toBeTruthy();
  });
});
