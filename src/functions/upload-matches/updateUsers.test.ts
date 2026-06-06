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

describe('updateUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates score and rankingPosition for each user', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      const { updateUsers } = await import('./updateUsers');

      await updateUsers([
        { username: 'alice', score: 10, rankingPosition: 1 },
        { username: 'bob', score: 8, rankingPosition: 2 },
      ]);

      expect(updateItem).toHaveBeenCalledTimes(2);
      expect(updateItem).toHaveBeenCalledWith({
        tableName: 'Users',
        key: { username: 'alice' },
        updateExpression: 'SET score = :score, rankingPosition = :rankingPosition',
        expressionAttributeValues: {
          ':score': 10,
          ':rankingPosition': 1,
        },
      });
    });
  });
});
