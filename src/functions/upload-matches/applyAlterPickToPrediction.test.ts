import { describe, expect, it } from 'vitest';
import type { AlterPickItem } from '@/shared/types/alteration';
import type { PredictionItem } from '@/shared/types/predictionItem';
import { applyAlterPickToPrediction } from './applyAlterPickToPrediction';

const BASE_PREDICTION: PredictionItem = {
  username: 'victim.user',
  matchId: 'wc26-m001',
  homeGoals: 1,
  awayGoals: 2,
  updatedAt: '2026-06-21T12:00:00.000Z',
  kickoffAt: '2026-06-21T18:00:00.000Z',
};

const BASE_ALTER_PICK: AlterPickItem = {
  altererUsername: 'alterer.user',
  victimUsername: 'victim.user',
  calendarDate: '2026-06-21',
  matchId: 'wc26-m001',
  side: 'home',
  delta: 1,
  createdAt: '2026-06-21T13:00:00.000Z',
};

describe('applyAlterPickToPrediction', () => {
  it('applies +1 to home goals only', () => {
    expect(applyAlterPickToPrediction(BASE_PREDICTION, BASE_ALTER_PICK)).toEqual({
      ...BASE_PREDICTION,
      homeGoals: 2,
      awayGoals: 2,
    });
  });

  it('applies -1 to home goals and clamps at zero', () => {
    expect(
      applyAlterPickToPrediction(
        { ...BASE_PREDICTION, homeGoals: 0 },
        { ...BASE_ALTER_PICK, delta: -1 },
      ),
    ).toEqual({
      ...BASE_PREDICTION,
      homeGoals: 0,
      awayGoals: 2,
    });
  });

  it('applies +1 to away goals only', () => {
    expect(
      applyAlterPickToPrediction(BASE_PREDICTION, {
        ...BASE_ALTER_PICK,
        side: 'away',
      }),
    ).toEqual({
      ...BASE_PREDICTION,
      homeGoals: 1,
      awayGoals: 3,
    });
  });

  it('applies -1 to away goals and clamps at zero', () => {
    expect(
      applyAlterPickToPrediction(
        { ...BASE_PREDICTION, awayGoals: 0 },
        { ...BASE_ALTER_PICK, side: 'away', delta: -1 },
      ),
    ).toEqual({
      ...BASE_PREDICTION,
      homeGoals: 1,
      awayGoals: 0,
    });
  });

  it('does not mutate the original prediction', () => {
    const prediction = { ...BASE_PREDICTION };

    const result = applyAlterPickToPrediction(prediction, {
      ...BASE_ALTER_PICK,
      side: 'away',
      delta: -1,
    });

    expect(prediction).toEqual(BASE_PREDICTION);
    expect(result).not.toBe(prediction);
  });
});
