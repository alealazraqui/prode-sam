import { describe, expect, it } from 'vitest';
import type { PredictionItem } from '@/shared/types/predictionItem';
import { scoreCalculator } from './scoreCalculator';
import type { ScoringMatchInput } from './types';

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

describe('scoreCalculator', () => {
  it('scores a single prediction via commonRule on finished match', () => {
    const match: ScoringMatchInput = { status: 2, homeGoals: 2, awayGoals: 1 };
    const prediction = buildPrediction(1, 0);

    expect(scoreCalculator(prediction, match)).toEqual({ pointsCommon: 1 });
  });

  it('returns zero pointsCommon for a single prediction when match is not finished', () => {
    const match: ScoringMatchInput = { status: 1, homeGoals: 2, awayGoals: 1 };
    const prediction = buildPrediction(2, 1);

    expect(scoreCalculator(prediction, match)).toEqual({ pointsCommon: 0 });
  });
});
