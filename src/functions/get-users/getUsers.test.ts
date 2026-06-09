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

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

const mockUsers: UserItem[] = [
  {
    username: 'alejandro',
    alias: 'Ale',
    password: 'secret1',
    score: 42,
    rankingPosition: 2,
  },
  {
    username: 'demo',
    password: 'secret2',
    score: 10,
    rankingPosition: 1,
  },
];

describe('getUsers', () => {
  it('returns mapped list without password including rankingPosition and score', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable).mockResolvedValue(mockUsers);

      const { getUsers } = await import('./getUsers');
      const result = await getUsers();

      expect(result).toEqual([
        {
          username: 'alejandro',
          alias: 'Ale',
          score: 42,
          rankingPosition: 2,
          rankingDif: 0,
        },
        {
          username: 'demo',
          alias: 'demo',
          score: 10,
          rankingPosition: 1,
          rankingDif: 0,
        },
      ]);
      expect(result.every((user) => !('password' in user))).toBe(true);
    });
  });

  it('returns empty array when scan has no items', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable).mockResolvedValue([]);

      const { getUsers } = await import('./getUsers');
      const result = await getUsers();

      expect(result).toEqual([]);
    });
  });
});
