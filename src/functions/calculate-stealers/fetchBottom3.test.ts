import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { UserItem } from '@/shared/types/userItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
  STEALERS_TABLE_NAME: 'Stealers',
  BLOCKED_VICTIMS_TABLE_NAME: 'BlockedVictims',
  STEAL_PICKS_TABLE_NAME: 'StealPicks',
};

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

function user(username: string, score?: number): UserItem {
  return { username, password: 'secret', score };
}

describe('fetchBottom3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the three users with the lowest scores', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { fetchBottom3 } = await import('./fetchBottom3');

      vi.mocked(scanTable).mockResolvedValue([
        user('high', 100),
        user('mid', 50),
        user('low-a', 10),
        user('low-b', 20),
        user('low-c', 30),
      ]);

      await expect(fetchBottom3()).resolves.toEqual(['low-a', 'low-b', 'low-c']);
    });
  });

  it('places users without score after scored users', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { fetchBottom3 } = await import('./fetchBottom3');

      vi.mocked(scanTable).mockResolvedValue([
        user('scored-low', 5),
        user('scored-mid', 10),
        user('scored-high', 20),
        user('no-score'),
      ]);

      await expect(fetchBottom3()).resolves.toEqual(['scored-low', 'scored-mid', 'scored-high']);
    });
  });

  it('includes all tied users when the third place is tied', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { fetchBottom3 } = await import('./fetchBottom3');

      vi.mocked(scanTable).mockResolvedValue([
        user('a', 1),
        user('b', 2),
        user('c', 3),
        user('d', 3),
        user('e', 10),
      ]);

      await expect(fetchBottom3()).resolves.toEqual(['a', 'b', 'c', 'd']);
    });
  });

  it('returns every user when there are fewer than three', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { fetchBottom3 } = await import('./fetchBottom3');

      vi.mocked(scanTable).mockResolvedValue([user('only', 1), user('other', 2)]);

      await expect(fetchBottom3()).resolves.toEqual(['only', 'other']);
    });
  });
});
