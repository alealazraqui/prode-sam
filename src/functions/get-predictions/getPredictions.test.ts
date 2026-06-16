import { describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { PredictionItem } from '@/shared/types/predictionItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
};

vi.mock('./fetchMyPredictions', () => ({
  fetchMyPredictions: vi.fn(),
}));

vi.mock('./fetchOthersPredictions', () => ({
  fetchOthersPredictions: vi.fn(),
}));

vi.mock('./fetchMyStealPick', () => ({
  fetchMyStealPick: vi.fn(),
}));

vi.mock('./fetchPastStealPicks', () => ({
  fetchPastStealPicks: vi.fn(),
}));

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

const mockUsers = [
  { username: 'user1', alias: 'User One', password: 'hash' },
  { username: 'other-user', password: 'hash' },
];

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
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(fetchMyPredictions).mockResolvedValue([ownFutureKickoff, ownPastKickoff]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      vi.mocked(scanTable).mockResolvedValue(mockUsers);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.myStealPick).toBeNull();
      expect(result.allStealPicks).toEqual([]);
      expect(result.myPredictions).toEqual([
        {
          username: 'user1',
          alias: 'User One',
          matchId: 'wc26-m002',
          homeGoals: 1,
          awayGoals: 1,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: null,
        },
        {
          username: 'user1',
          alias: 'User One',
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
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(fetchMyPredictions).mockResolvedValue([ownPastKickoff]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      vi.mocked(scanTable).mockResolvedValue(mockUsers);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.allPredictions).toEqual([
        {
          username: 'user1',
          alias: 'User One',
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
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(fetchMyPredictions).mockResolvedValue([ownPastKickoff]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([otherPastKickoff]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      vi.mocked(scanTable).mockResolvedValue(mockUsers);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.allPredictions).toEqual([
        {
          username: 'user1',
          alias: 'User One',
          matchId: 'wc26-m001',
          homeGoals: 2,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: 3,
        },
        {
          username: 'other-user',
          alias: 'other-user',
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
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(fetchMyPredictions).mockResolvedValue([]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([ownPastKickoff, otherWithoutPoints]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      vi.mocked(scanTable).mockResolvedValue(mockUsers);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.allPredictions).toEqual([
        {
          username: 'user1',
          alias: 'User One',
          matchId: 'wc26-m001',
          homeGoals: 2,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: 3,
        },
        {
          username: 'other-user',
          alias: 'other-user',
          matchId: 'wc26-m003',
          homeGoals: 0,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: null,
        },
      ]);
    });
  });

  it('returns myStealPick and allStealPicks alongside predictions', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');

      const myStealPick = {
        calendarDate: '2026-06-07',
        stealerUsername: 'user1',
        victimUsername: 'other-user',
        matchId: 'wc26-m003',
        stolenPoints: 0,
      };
      const allStealPicks = [
        {
          calendarDate: '2026-06-05',
          stealerUsername: 'other-user',
          victimUsername: 'user1',
          matchId: 'wc26-m001',
          stolenPoints: 0,
        },
      ];

      vi.mocked(fetchMyPredictions).mockResolvedValue([]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(myStealPick);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: allStealPicks,
        activeStealMatchIds: [],
      });
      vi.mocked(scanTable).mockResolvedValue(mockUsers);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.myStealPick).toEqual(myStealPick);
      expect(result.allStealPicks).toEqual(allStealPicks);
      expect(result.activeStealMatchIds).toEqual([]);
    });
  });
});
