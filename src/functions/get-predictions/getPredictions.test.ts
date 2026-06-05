import { describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { PredictionItem } from '@/shared/types/predictionItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
};

vi.mock('./fetchMyPredictions', () => ({
  fetchMyPredictions: vi.fn(),
}));

vi.mock('./fetchOthersPredictions', () => ({
  fetchOthersPredictions: vi.fn(),
}));

const ownFutureKickoff: PredictionItem = {
  username: 'user1',
  matchId: 'wc26-m002',
  homeGoals: 1,
  awayGoals: 1,
  updatedAt: '2026-06-05T12:00:00.000Z',
  kickoffAt: '2099-01-01T00:00:00.000Z',
};

const ownPastKickoff: PredictionItem = {
  username: 'user1',
  matchId: 'wc26-m001',
  homeGoals: 2,
  awayGoals: 0,
  updatedAt: '2026-06-05T12:00:00.000Z',
  kickoffAt: '2020-01-01T00:00:00.000Z',
  pointsCommon: 3,
};

const otherPastKickoff: PredictionItem = {
  username: 'other-user',
  matchId: 'wc26-m001',
  homeGoals: 1,
  awayGoals: 1,
  updatedAt: '2026-06-05T12:00:00.000Z',
  kickoffAt: '2020-01-01T00:00:00.000Z',
};

const otherWithoutPoints: PredictionItem = {
  username: 'other-user',
  matchId: 'wc26-m003',
  homeGoals: 0,
  awayGoals: 0,
  updatedAt: '2026-06-05T12:00:00.000Z',
  kickoffAt: '2020-01-01T00:00:00.000Z',
};

describe('getPredictions', () => {
  it('returns all own predictions in myPredictions regardless of kickoffAt', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      vi.mocked(fetchMyPredictions).mockResolvedValue([ownFutureKickoff, ownPastKickoff]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([]);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.myPredictions).toEqual([
        {
          username: 'user1',
          matchId: 'wc26-m002',
          homeGoals: 1,
          awayGoals: 1,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: null,
        },
        {
          username: 'user1',
          matchId: 'wc26-m001',
          homeGoals: 2,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: 3,
        },
      ]);
    });
  });

  it('excludes other users predictions with future kickoff from allPredictions', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      vi.mocked(fetchMyPredictions).mockResolvedValue([ownPastKickoff]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([]);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.allPredictions).toEqual([
        {
          username: 'user1',
          matchId: 'wc26-m001',
          homeGoals: 2,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: 3,
        },
      ]);
    });
  });

  it('includes other users predictions with past kickoff in allPredictions', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      vi.mocked(fetchMyPredictions).mockResolvedValue([ownPastKickoff]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([otherPastKickoff]);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.allPredictions).toEqual([
        {
          username: 'user1',
          matchId: 'wc26-m001',
          homeGoals: 2,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: 3,
        },
        {
          username: 'other-user',
          matchId: 'wc26-m001',
          homeGoals: 1,
          awayGoals: 1,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: null,
        },
      ]);
    });
  });

  it('maps pointsCommon as null when absent and numeric when present', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      vi.mocked(fetchMyPredictions).mockResolvedValue([]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([ownPastKickoff, otherWithoutPoints]);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.allPredictions).toEqual([
        {
          username: 'user1',
          matchId: 'wc26-m001',
          homeGoals: 2,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: 3,
        },
        {
          username: 'other-user',
          matchId: 'wc26-m003',
          homeGoals: 0,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: null,
        },
      ]);
    });
  });
});
