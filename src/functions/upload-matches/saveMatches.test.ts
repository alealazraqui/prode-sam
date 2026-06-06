import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  });

  it('does nothing when matches array is empty', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      const { saveMatches } = await import('./saveMatches');

      await saveMatches([]);

      expect(updateItem).not.toHaveBeenCalled();
    });
  });

  it('updates each match with goals and finished status', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      const { saveMatches } = await import('./saveMatches');

      await saveMatches([
        {
          matchId: 'mock-m001',
          homeGoals: 2,
          awayGoals: 1,
          kickoffAt: '2026-06-01T18:00:00.000Z',
        },
      ]);

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
});
