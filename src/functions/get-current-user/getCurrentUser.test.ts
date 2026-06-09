import { describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { UserItem } from '@/shared/types/userItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
};

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

const mockUser: UserItem = {
  username: 'alejandro',
  alias: 'Ale',
  password: '1234',
  score: 42,
  rankingPosition: 3,
};

describe('getCurrentUser', () => {
  it('returns mapped user without password', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);

      const { getCurrentUser } = await import('./getCurrentUser');
      const result = await getCurrentUser('alejandro');

      expect(result).toEqual({
        username: 'alejandro',
        alias: 'Ale',
        score: 42,
        rankingPosition: 3,
        rankingDif: 0,
      });
      expect(result).not.toHaveProperty('password');
    });
  });

  it('defaults score to 0 when missing on user item', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue({
        username: 'alejandro',
        alias: 'Ale',
        password: '1234',
      });

      const { getCurrentUser } = await import('./getCurrentUser');
      const result = await getCurrentUser('alejandro');

      expect(result.score).toBe(0);
      expect(result.rankingPosition).toBe(0);
    });
  });

  it('throws NotFoundError when user does not exist', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(null);

      const { getCurrentUser } = await import('./getCurrentUser');

      await expect(getCurrentUser('unknown')).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Usuario no encontrado.',
      });
    });
  });
});
