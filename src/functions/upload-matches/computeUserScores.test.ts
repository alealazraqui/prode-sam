import { describe, expect, it } from 'vitest';
import type { LineupPickItem } from '@/shared/types/lineupPickItem';
import type { PredictionItem } from '@/shared/types/predictionItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import { computeUserScores } from './computeUserScores';

function buildPrediction(username: string, pointsCommon: number): PredictionItem {
  return {
    username,
    matchId: 'mock-m001',
    homeGoals: 2,
    awayGoals: 1,
    updatedAt: '2026-06-01T12:00:00.000Z',
    kickoffAt: '2026-06-01T18:00:00.000Z',
    pointsCommon,
  };
}

function buildLineupPick(username: string, eventDay: string, points: number): LineupPickItem {
  return {
    eventDay,
    username,
    alias: username,
    defensor: 'Def',
    mediocampista: 'Mid',
    delantero: 'Fwd',
    points,
  };
}

describe('computeUserScores', () => {
  it('computes score per user from stored pointsCommon', () => {
    const predictionsByUser = new Map([
      ['alice', [buildPrediction('alice', 3)]],
      ['bob', [buildPrediction('bob', 1)]],
    ]);

    expect(computeUserScores(predictionsByUser, [], [])).toEqual(
      new Map([
        ['alice', 3],
        ['bob', 1],
      ]),
    );
  });

  it('adds steal delta when user is stealer', () => {
    const predictionsByUser = new Map([
      ['alice', [buildPrediction('alice', 3)]],
      ['bob', [buildPrediction('bob', 3)]],
    ]);
    const stealPicks: StealPickItem[] = [
      {
        calendarDate: '2026-06-01',
        stealerUsername: 'alice',
        victimUsername: 'bob',
        matchId: 'mock-m001',
        stolenPoints: 2,
      },
    ];

    expect(computeUserScores(predictionsByUser, stealPicks, [])).toEqual(
      new Map([
        ['alice', 5],
        ['bob', 1],
      ]),
    );
  });

  it('adds lineup pick points per user', () => {
    const predictionsByUser = new Map([
      ['alice', [buildPrediction('alice', 3)]],
      ['bob', [buildPrediction('bob', 1)]],
    ]);
    const lineupPicks = [
      buildLineupPick('alice', '2026-06-05', 4),
      buildLineupPick('bob', '2026-06-05', 2),
    ];

    expect(computeUserScores(predictionsByUser, [], lineupPicks)).toEqual(
      new Map([
        ['alice', 7],
        ['bob', 3],
      ]),
    );
  });

  it('returns 0 for users with no predictions, steal picks or lineup picks', () => {
    const predictionsByUser = new Map([['alice', []]]);

    expect(computeUserScores(predictionsByUser, [], [])).toEqual(new Map([['alice', 0]]));
  });
});
