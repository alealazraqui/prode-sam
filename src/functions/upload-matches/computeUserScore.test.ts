import { describe, expect, it } from 'vitest';
import type { LineupPickItem } from '@/shared/types/lineupPickItem';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import { computeUserScore } from './computeUserScore';

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

function buildLineupPick(eventDay: string, points: number | null): LineupPickItem {
  return {
    eventDay,
    username: 'alice',
    alias: 'Alice',
    defensor: 'Def',
    mediocampista: 'Mid',
    delantero: 'Fwd',
    points,
  };
}

describe('computeUserScore', () => {
  it('sums stored pointsCommon for all predictions', () => {
    const predictions = [
      buildPrediction('mock-m001', '2026-06-01T18:00:00.000Z', 3),
      buildPrediction('mock-m002', '2026-06-10T18:00:00.000Z', 1),
    ];
    expect(computeUserScore(predictions, [], [], 'alice')).toBe(4);
  });

  it('treats null or undefined pointsCommon as 0', () => {
    const predictions = [
      buildPrediction('mock-m001', '2026-06-01T18:00:00.000Z', null),
      buildPrediction('mock-m002', '2026-06-01T18:00:00.000Z', undefined),
    ];
    expect(computeUserScore(predictions, [], [], 'alice')).toBe(0);
  });

  it('adds stolenPoints when user is stealer', () => {
    const stealPicks = [buildStealPick('alice', 'bob', 3)];
    expect(computeUserScore([], stealPicks, [], 'alice')).toBe(3);
  });

  it('subtracts stolenPoints when user is victim', () => {
    const stealPicks = [buildStealPick('charlie', 'alice', 2)];
    expect(computeUserScore([], stealPicks, [], 'alice')).toBe(-2);
  });

  it('combines prediction score and steal delta', () => {
    const predictions = [buildPrediction('mock-m001', '2026-06-01T18:00:00.000Z', 3)];
    const stealPicks = [buildStealPick('alice', 'bob', 1)];
    expect(computeUserScore(predictions, stealPicks, [], 'alice')).toBe(4);
  });

  it('adds lineup pick points for the user', () => {
    const lineupPicks = [buildLineupPick('2026-06-05', 4), buildLineupPick('2026-06-10', 2)];
    expect(computeUserScore([], [], lineupPicks, 'alice')).toBe(6);
  });

  it('treats null lineup pick points as 0', () => {
    const lineupPicks = [buildLineupPick('2026-06-05', null)];
    expect(computeUserScore([], [], lineupPicks, 'alice')).toBe(0);
  });

  it('combines prediction, steal and lineup scores', () => {
    const predictions = [buildPrediction('mock-m001', '2026-06-01T18:00:00.000Z', 3)];
    const stealPicks = [buildStealPick('alice', 'bob', 1)];
    const lineupPicks = [buildLineupPick('2026-06-05', 2)];
    expect(computeUserScore(predictions, stealPicks, lineupPicks, 'alice')).toBe(6);
  });

  it('returns 0 when no predictions, steal picks or lineup picks', () => {
    expect(computeUserScore([], [], [], 'alice')).toBe(0);
  });
});
