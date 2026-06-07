import { describe, it, expect, afterEach } from 'vitest';
import { simulateMatch } from '@/engine/matchSimulator';
import { makeTestSquad } from './fixtures/squads';
import { OPPONENT } from './fixtures/brackets';
import { mockRandom } from './helpers/mockRandom';

describe('simulateMatch', () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
  });

  it('returns a complete MatchResult shape', () => {
    restore = mockRandom(Array.from({ length: 200 }, (_, i) => ((i * 17) % 100) / 100));
    const result = simulateMatch(makeTestSquad(), OPPONENT, 0);

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
    restore = mockRandom(Array.from({ length: 200 }, (_, i) => ((i * 13) % 100) / 100));
    const result = simulateMatch(makeTestSquad(), OPPONENT, 0);
    const userGoals = result.events.filter((e) => e.isGoal && e.isUserTeam).length;
    const oppGoals = result.events.filter((e) => e.isGoal && !e.isUserTeam).length;
    expect(userGoals).toBe(result.userScore);
    expect(oppGoals).toBe(result.opponentScore);
  });

  it('can resolve drawn matches via extra time or penalties', () => {
    // Bias toward low-scoring outcomes to encourage draws
    restore = mockRandom(Array.from({ length: 300 }, () => 0.02));
    const result = simulateMatch(makeTestSquad(), OPPONENT, 3);
    if (result.wentToPenalties) {
      expect(result.userPenScore).toBeDefined();
      expect(result.oppPenScore).toBeDefined();
    }
    expect(result.userWon === result.userScore > result.opponentScore || result.wentToPenalties).toBe(
      true
    );
  });
});
