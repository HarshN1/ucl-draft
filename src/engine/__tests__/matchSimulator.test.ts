import { describe, it, expect } from 'vitest';
import { simulateMatch } from '@/engine/matchSimulator';
import { Rng } from '@/engine/rng';
import { makeTestSquad } from './fixtures/squads';
import { OPPONENT } from './fixtures/brackets';

describe('simulateMatch', () => {
  it('returns a complete MatchResult shape', () => {
    const result = simulateMatch(new Rng(1), makeTestSquad(), OPPONENT, 0);

    expect(result.userScore).toBeGreaterThanOrEqual(0);
    expect(result.opponentScore).toBeGreaterThanOrEqual(0);
    expect(result.possession).toBeGreaterThanOrEqual(28);
    expect(result.possession).toBeLessThanOrEqual(72);
    expect(result.playerRatings).toHaveLength(11);
    expect(result.motm).toBeDefined();
    expect(result.events.length).toBeGreaterThan(0);
    expect(typeof result.userWon).toBe('boolean');
  });

  it('produces goal events matching the final scoreline', () => {
    const result = simulateMatch(new Rng(1), makeTestSquad(), OPPONENT, 0);
    const userGoals = result.events.filter((e) => e.isGoal && e.isUserTeam).length;
    const oppGoals = result.events.filter((e) => e.isGoal && !e.isUserTeam).length;
    expect(userGoals).toBe(result.userScore);
    expect(oppGoals).toBe(result.opponentScore);
  });

  it('can resolve drawn matches via extra time or penalties', () => {
    const result = simulateMatch(new Rng(42), makeTestSquad(), OPPONENT, 3);
    if (result.wentToPenalties) {
      expect(result.userPenScore).toBeDefined();
      expect(result.oppPenScore).toBeDefined();
    }
    expect(result.userWon === result.userScore > result.opponentScore || result.wentToPenalties).toBe(
      true
    );
  });
});
