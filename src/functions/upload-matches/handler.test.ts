import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
};

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/updateItem', () => ({
  updateItem: vi.fn(),
}));

describe('upload-matches handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 200 and rewrites predictions and users when matches are provided', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      const { handler } = await import('./handler');

      vi.mocked(scanTable).mockImplementation(async (tableName) => {
        if (tableName === 'Predictions') {
          return [
            {
              username: 'alice',
              matchId: 'mock-m001',
              homeGoals: 2,
              awayGoals: 1,
              updatedAt: '2026-06-01T12:00:00.000Z',
              kickoffAt: '2026-06-01T18:00:00.000Z',
            },
          ];
        }
        if (tableName === 'Matches') {
          return [
            {
              matchId: 'mock-m001',
              homeTeamName: 'Home',
              homeTeamCode: 'HOM',
              awayTeamName: 'Away',
              awayTeamCode: 'AWY',
              homeGoals: 1,
              awayGoals: 0,
              kickoffAt: '2026-06-01T18:00:00.000Z',
              status: 2,
              isFirstRound: true,
            },
          ];
        }
        return [{ username: 'alice', password: 'secret' }];
      });

      const response = await handler({
        matches: [
          {
            matchId: 'mock-m001',
            homeGoals: 2,
            awayGoals: 1,
            kickoffAt: '2026-06-01T18:00:00.000Z',
          },
        ],
      });

      expect(response).toEqual({
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      });
      expect(putItem).toHaveBeenCalledWith('Predictions', {
        username: 'alice',
        matchId: 'mock-m001',
        homeGoals: 2,
        awayGoals: 1,
        updatedAt: '2026-06-01T12:00:00.000Z',
        kickoffAt: '2026-06-01T18:00:00.000Z',
        pointsCommon: 3,
      });
      expect(updateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          tableName: 'Users',
          key: { username: 'alice' },
        }),
      );
    });
  });

  it('returns 200 and skips prediction writes when matches array is empty', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      const { handler } = await import('./handler');

      vi.mocked(scanTable).mockImplementation(async (tableName) => {
        if (tableName === 'Predictions') {
          return [
            {
              username: 'alice',
              matchId: 'mock-m001',
              homeGoals: 2,
              awayGoals: 1,
              updatedAt: '2026-06-01T12:00:00.000Z',
              kickoffAt: '2026-06-01T18:00:00.000Z',
              pointsCommon: 3,
            },
          ];
        }
        if (tableName === 'Matches') {
          return [
            {
              matchId: 'mock-m001',
              homeTeamName: 'Home',
              homeTeamCode: 'HOM',
              awayTeamName: 'Away',
              awayTeamCode: 'AWY',
              homeGoals: 2,
              awayGoals: 1,
              kickoffAt: '2026-06-01T18:00:00.000Z',
              status: 2,
              isFirstRound: true,
            },
          ];
        }
        return [{ username: 'alice', password: 'secret' }];
      });

      const response = await handler({ matches: [] });

      expect(response.statusCode).toBe(200);
      expect(putItem).not.toHaveBeenCalled();
      expect(updateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          tableName: 'Users',
          key: { username: 'alice' },
        }),
      );
    });
  });
});
