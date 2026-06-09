import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  LINEUP_PICKS_TABLE_NAME: 'LineupPicks',
};

vi.mock('@/shared/dynamo/updateItem', () => ({
  updateItem: vi.fn(),
}));

describe('updateLineupPickPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates points for an existing lineup pick', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      vi.mocked(updateItem).mockResolvedValue(undefined);

      const { updateLineupPickPoints } = await import('./updateLineupPickPoints');
      await updateLineupPickPoints({
        eventDay: '2026-06-15',
        username: 'user1',
        points: 4,
      });

      expect(updateItem).toHaveBeenCalledWith({
        tableName: 'LineupPicks',
        key: { eventDay: '2026-06-15', username: 'user1' },
        updateExpression: 'SET #points = :points',
        expressionAttributeNames: { '#points': 'points' },
        expressionAttributeValues: { ':points': 4 },
        conditionExpression: 'attribute_exists(eventDay) AND attribute_exists(username)',
      });
    });
  });

  it('throws NotFoundError when the lineup pick does not exist', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { NotFoundError } = await import('@/shared/errors/NotFoundError');
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      vi.mocked(updateItem).mockRejectedValue(
        Object.assign(new Error('Conditional check failed'), {
          name: 'ConditionalCheckFailedException',
        }),
      );

      const { updateLineupPickPoints } = await import('./updateLineupPickPoints');

      await expect(
        updateLineupPickPoints({
          eventDay: '2026-06-15',
          username: 'missing-user',
          points: 3,
        }),
      ).rejects.toThrow(NotFoundError);

      await expect(
        updateLineupPickPoints({
          eventDay: '2026-06-15',
          username: 'missing-user',
          points: 3,
        }),
      ).rejects.toMatchObject({
        message: 'Lineup pick not found for eventDay=2026-06-15, username=missing-user',
      });
    });
  });

  it('is idempotent when called twice with the same input', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { updateItem } = await import('@/shared/dynamo/updateItem');
      vi.mocked(updateItem).mockResolvedValue(undefined);

      const { updateLineupPickPoints } = await import('./updateLineupPickPoints');
      const input = { eventDay: '2026-06-15', username: 'user1', points: 5 };

      await updateLineupPickPoints(input);
      await updateLineupPickPoints(input);

      expect(updateItem).toHaveBeenCalledTimes(2);
      expect(updateItem).toHaveBeenNthCalledWith(1, {
        tableName: 'LineupPicks',
        key: { eventDay: '2026-06-15', username: 'user1' },
        updateExpression: 'SET #points = :points',
        expressionAttributeNames: { '#points': 'points' },
        expressionAttributeValues: { ':points': 5 },
        conditionExpression: 'attribute_exists(eventDay) AND attribute_exists(username)',
      });
      expect(updateItem).toHaveBeenNthCalledWith(2, {
        tableName: 'LineupPicks',
        key: { eventDay: '2026-06-15', username: 'user1' },
        updateExpression: 'SET #points = :points',
        expressionAttributeNames: { '#points': 'points' },
        expressionAttributeValues: { ':points': 5 },
        conditionExpression: 'attribute_exists(eventDay) AND attribute_exists(username)',
      });
    });
  });
});
