import { describe, expect, it } from 'vitest';
import type { PredictionItem } from '@/shared/types/predictionItem';
import { commonRule } from './commonRule';
import type { ScoringMatchInput } from './types';

function buildFinishedMatch(homeGoals: number, awayGoals: number): ScoringMatchInput {
  return { homeGoals, awayGoals, status: 2 };
}

function buildPendingMatch(homeGoals: number, awayGoals: number): ScoringMatchInput {
  return { homeGoals, awayGoals, status: 1 };
}

function buildPrediction(homeGoals: number, awayGoals: number): PredictionItem {
  return {
    username: 'test.user',
    matchId: 'mock-m001',
    homeGoals,
    awayGoals,
    updatedAt: '2026-06-01T12:00:00.000Z',
    kickoffAt: '2026-06-01T18:00:00.000Z',
  };
}

describe('commonRule', () => {
  it('returns 0 when match is not finished (status=1)', () => {
    const match = buildPendingMatch(2, 1);
    const prediction = buildPrediction(2, 1);

    expect(commonRule(prediction, match)).toBe(0);
  });

  it('returns 3 for exact score on finished match', () => {
    const match = buildFinishedMatch(2, 1);
    const prediction = buildPrediction(2, 1);

    expect(commonRule(prediction, match)).toBe(3);
  });

  it('returns 3 for exact draw on finished match', () => {
    const match = buildFinishedMatch(0, 0);
    const prediction = buildPrediction(0, 0);

    expect(commonRule(prediction, match)).toBe(3);
  });

  it('returns 1 when home wins with different score', () => {
    const match = buildFinishedMatch(2, 1);
    const prediction = buildPrediction(1, 0);

    expect(commonRule(prediction, match)).toBe(1);
  });

  it('returns 1 when away wins with different score', () => {
    const match = buildFinishedMatch(0, 2);
    const prediction = buildPrediction(0, 1);

    expect(commonRule(prediction, match)).toBe(1);
  });

  it('returns 1 when draw with different score', () => {
    const match = buildFinishedMatch(0, 0);
    const prediction = buildPrediction(1, 1);

    expect(commonRule(prediction, match)).toBe(1);
  });

  it('returns 0 when predicted away win but home won', () => {
    const match = buildFinishedMatch(2, 1);
    const prediction = buildPrediction(0, 1);

    expect(commonRule(prediction, match)).toBe(0);
  });

  it('returns 0 when predicted draw but home won', () => {
    const match = buildFinishedMatch(2, 1);
    const prediction = buildPrediction(1, 1);

    expect(commonRule(prediction, match)).toBe(0);
  });

  it('returns 0 when predicted home win but match was draw', () => {
    const match = buildFinishedMatch(0, 0);
    const prediction = buildPrediction(1, 0);

    expect(commonRule(prediction, match)).toBe(0);
  });

  it('returns 3 on finished match confirming status=2 is required to score', () => {
    const match = buildFinishedMatch(2, 1);
    const prediction = buildPrediction(2, 1);

    expect(match.status).toBe(2);
    expect(commonRule(prediction, match)).toBe(3);
  });
});
