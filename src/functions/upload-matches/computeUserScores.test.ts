import { describe, expect, it } from 'vitest';
import type { ScoringMatchInput } from '@/shared/scoring/types';
import type { PredictionItem } from '@/shared/types/predictionItem';
import { computeUserScores } from './computeUserScores';

const NOW = new Date('2026-06-06T12:00:00.000Z');

function buildPrediction(
  username: string,
  matchId: string,
  homeGoals: number,
  awayGoals: number,
): PredictionItem {
  return {
    username,
    matchId,
    homeGoals,
    awayGoals,
    updatedAt: '2026-06-01T12:00:00.000Z',
    kickoffAt: '2026-06-01T18:00:00.000Z',
  };
}

describe('computeUserScores', () => {
  it('computes score per user from predictions without using persisted pointsCommon', () => {
    const matchLookup = new Map<string, ScoringMatchInput>([
      ['mock-m001', { status: 2, homeGoals: 2, awayGoals: 1 }],
    ]);
    const predictionsByUser = new Map<string, PredictionItem[]>([
      ['alice', [buildPrediction('alice', 'mock-m001', 2, 1)]],
      ['bob', [buildPrediction('bob', 'mock-m001', 0, 1)]],
    ]);

    expect(computeUserScores(predictionsByUser, matchLookup, NOW)).toEqual(
      new Map([
        ['alice', 3],
        ['bob', 0],
      ]),
    );
  });
});
