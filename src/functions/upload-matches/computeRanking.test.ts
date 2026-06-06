import { describe, expect, it } from 'vitest';
import { computeRanking } from './computeRanking';

describe('computeRanking', () => {
  it('orders users by score descending with standard competition ties', () => {
    const userScores = new Map<string, number>([
      ['alice', 10],
      ['bob', 8],
      ['carol', 8],
      ['dan', 5],
    ]);

    expect(computeRanking(userScores)).toEqual([
      { username: 'alice', score: 10, rankingPosition: 1 },
      { username: 'bob', score: 8, rankingPosition: 2 },
      { username: 'carol', score: 8, rankingPosition: 2 },
      { username: 'dan', score: 5, rankingPosition: 4 },
    ]);
  });
});
