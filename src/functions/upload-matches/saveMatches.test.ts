import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
};

vi.mock('@/shared/dynamo/updateItem', () => ({
  updateItem: vi.fn(),
}));

describe('saveMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing and returns empty set when matches array is empty', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      const { saveMatches } = await import('./saveMatches');

      const result = await saveMatches([]);

      expect(result).toEqual(new Set());
      expect(updateItem).not.toHaveBeenCalled();
    });
  });

  it('updates a past match and returns its matchId', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      const { saveMatches } = await import('./saveMatches');

      const result = await saveMatches([
        {
          matchId: 'mock-m001',
          homeGoals: 2,
          awayGoals: 1,
          kickoffAt: '2026-06-01T18:00:00.000Z',
        },
      ]);

      expect(result).toEqual(new Set(['mock-m001']));
      expect(updateItem).toHaveBeenCalledWith({
        tableName: 'Matches',
        key: { matchId: 'mock-m001' },
        updateExpression: 'SET homeGoals = :homeGoals, awayGoals = :awayGoals, #status = :status',
        expressionAttributeNames: { '#status': 'status' },
        expressionAttributeValues: {
          ':homeGoals': 2,
          ':awayGoals': 1,
          ':status': 2,
        },
      });
    });
  });

  it('skips future matches and only returns past matchIds', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      const { saveMatches } = await import('./saveMatches');

      const result = await saveMatches([
        {
          matchId: 'past-m001',
          homeGoals: 1,
          awayGoals: 0,
          kickoffAt: '2026-06-01T18:00:00.000Z',
        },
        {
          matchId: 'future-m001',
          homeGoals: 2,
          awayGoals: 1,
          kickoffAt: '2026-06-10T18:00:00.000Z',
        },
      ]);

      expect(result).toEqual(new Set(['past-m001']));
      expect(updateItem).toHaveBeenCalledTimes(1);
      expect(updateItem).toHaveBeenCalledWith(
        expect.objectContaining({ key: { matchId: 'past-m001' } }),
      );
    });
  });

  it('returns empty set when all matches are in the future', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      const { saveMatches } = await import('./saveMatches');

      const result = await saveMatches([
        {
          matchId: 'future-m001',
          homeGoals: 1,
          awayGoals: 0,
          kickoffAt: '2026-06-10T18:00:00.000Z',
        },
      ]);

      expect(result).toEqual(new Set());
      expect(updateItem).not.toHaveBeenCalled();
    });
  });
});
