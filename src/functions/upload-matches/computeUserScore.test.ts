import { describe, expect, it } from 'vitest';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import { computeUserScore } from './computeUserScore';

const NOW = new Date('2026-06-06T12:00:00.000Z');

function buildPrediction(
  matchId: string,
  kickoffAt: string,
  pointsCommon?: number | null,
): PredictionItem {
  return {
    username: 'alice',
    matchId,
    homeGoals: 1,
    awayGoals: 0,
    updatedAt: '2026-06-01T12:00:00.000Z',
    kickoffAt,
    pointsCommon,
  };
}

function buildStealPick(
  stealerUsername: string,
  victimUsername: string,
  stolenPoints: number,
): StealPickItem {
  return {
    calendarDate: '2026-06-01',
    stealerUsername,
    victimUsername,
    matchId: 'mock-m001',
    stolenPoints,
  };
}

describe('computeUserScore', () => {
  it('sums stored pointsCommon for eligible predictions', () => {
    const predictions = [
      buildPrediction('mock-m001', '2026-06-01T18:00:00.000Z', 3),
      buildPrediction('mock-m002', '2026-06-02T18:00:00.000Z', 1),
    ];
    expect(computeUserScore(predictions, [], 'alice', NOW)).toBe(4);
  });

  it('excludes predictions with kickoffAt after now', () => {
    const predictions = [buildPrediction('mock-m001', '2026-06-10T18:00:00.000Z', 3)];
    expect(computeUserScore(predictions, [], 'alice', NOW)).toBe(0);
  });

  it('treats null or undefined pointsCommon as 0', () => {
    const predictions = [
      buildPrediction('mock-m001', '2026-06-01T18:00:00.000Z', null),
      buildPrediction('mock-m002', '2026-06-01T18:00:00.000Z', undefined),
    ];
    expect(computeUserScore(predictions, [], 'alice', NOW)).toBe(0);
  });

  it('adds stolenPoints when user is stealer', () => {
    const stealPicks = [buildStealPick('alice', 'bob', 3)];
    expect(computeUserScore([], stealPicks, 'alice', NOW)).toBe(3);
  });

  it('subtracts stolenPoints when user is victim', () => {
    const stealPicks = [buildStealPick('charlie', 'alice', 2)];
    expect(computeUserScore([], stealPicks, 'alice', NOW)).toBe(-2);
  });

  it('combines prediction score and steal delta', () => {
    const predictions = [buildPrediction('mock-m001', '2026-06-01T18:00:00.000Z', 3)];
    const stealPicks = [buildStealPick('alice', 'bob', 1)];
    expect(computeUserScore(predictions, stealPicks, 'alice', NOW)).toBe(4);
  });

  it('returns 0 when no predictions and no steal picks', () => {
    expect(computeUserScore([], [], 'alice', NOW)).toBe(0);
  });
});
