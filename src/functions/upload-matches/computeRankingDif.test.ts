import { describe, expect, it } from 'vitest';
import { applyRankingDif, computeRankingDifForEntry } from './computeRankingDif';

describe('computeRankingDifForEntry', () => {
  it('returns positive delta when the user moves up in the ranking', () => {
    expect(computeRankingDifForEntry(5, 3)).toBe(2);
  });

  it('returns negative delta when the user moves down in the ranking', () => {
    expect(computeRankingDifForEntry(3, 7)).toBe(-4);
  });

  it('returns zero when the position does not change', () => {
    expect(computeRankingDifForEntry(4, 4)).toBe(0);
  });

  it('returns zero when there is no previous position', () => {
    expect(computeRankingDifForEntry(undefined, 2)).toBe(0);
    expect(computeRankingDifForEntry(0, 2)).toBe(0);
  });
});

describe('applyRankingDif', () => {
  it('enriches ranking entries with rankingDif from previous positions', () => {
    const previousPositions = new Map([
      ['alice', 1],
      ['bob', 3],
      ['carol', 2],
    ]);

    expect(
      applyRankingDif(
        [
          { username: 'alice', score: 10, rankingPosition: 1 },
          { username: 'bob', score: 8, rankingPosition: 3 },
          { username: 'carol', score: 9, rankingPosition: 2 },
        ],
        previousPositions,
      ),
    ).toEqual([
      { username: 'alice', score: 10, rankingPosition: 1, rankingDif: 0 },
      { username: 'bob', score: 8, rankingPosition: 3, rankingDif: 0 },
      { username: 'carol', score: 9, rankingPosition: 2, rankingDif: 0 },
    ]);
  });

  it('computes non-zero deltas when positions change', () => {
    const previousPositions = new Map([
      ['alice', 4],
      ['bob', 2],
    ]);

    expect(
      applyRankingDif(
        [
          { username: 'alice', score: 12, rankingPosition: 1 },
          { username: 'bob', score: 5, rankingPosition: 2 },
        ],
        previousPositions,
      ),
    ).toEqual([
      { username: 'alice', score: 12, rankingPosition: 1, rankingDif: 3 },
      { username: 'bob', score: 5, rankingPosition: 2, rankingDif: 0 },
    ]);
  });
});
