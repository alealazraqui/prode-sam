import { describe, expect, it } from 'vitest';
import type { ScoringMatchInput } from '@/shared/scoring/types';
import type { PredictionItem } from '@/shared/types/predictionItem';
import { computeUserScore } from './computeUserScore';

const NOW = new Date('2026-06-06T12:00:00.000Z');

function buildPrediction(
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  kickoffAt: string,
): PredictionItem {
  return {
    username: 'test.user',
    matchId,
    homeGoals,
    awayGoals,
    updatedAt: '2026-06-01T12:00:00.000Z',
    kickoffAt,
  };
}

describe('computeUserScore', () => {
  it('sums scoreCalculator results only for predictions with kickoffAt before now', () => {
    const matchLookup = new Map<string, ScoringMatchInput>([
      ['mock-m001', { status: 2, homeGoals: 2, awayGoals: 1 }],
      ['mock-m002', { status: 2, homeGoals: 0, awayGoals: 0 }],
    ]);

    const predictions = [
      buildPrediction('mock-m001', 2, 1, '2026-06-01T18:00:00.000Z'),
      buildPrediction('mock-m002', 1, 1, '2026-06-02T18:00:00.000Z'),
      buildPrediction('mock-m001', 3, 0, '2026-06-10T18:00:00.000Z'),
    ];

    expect(computeUserScore(predictions, matchLookup, NOW)).toBe(4);
  });

  it('returns 0 when all predictions kick off after now', () => {
    const matchLookup = new Map<string, ScoringMatchInput>([
      ['mock-m001', { status: 2, homeGoals: 2, awayGoals: 1 }],
    ]);

    const predictions = [buildPrediction('mock-m001', 2, 1, '2026-06-10T18:00:00.000Z')];

    expect(computeUserScore(predictions, matchLookup, NOW)).toBe(0);
  });

  it('returns 0 for predictions without a match in the lookup', () => {
    const predictions = [buildPrediction('unknown-match', 2, 1, '2026-06-01T18:00:00.000Z')];

    expect(computeUserScore(predictions, new Map(), NOW)).toBe(0);
  });

  it('returns 0 when unfinished matches contribute no points', () => {
    const matchLookup = new Map<string, ScoringMatchInput>([
      ['mock-m001', { status: 1, homeGoals: 2, awayGoals: 1 }],
    ]);

    const predictions = [buildPrediction('mock-m001', 2, 1, '2026-06-01T18:00:00.000Z')];

    expect(computeUserScore(predictions, matchLookup, NOW)).toBe(0);
  });
});
