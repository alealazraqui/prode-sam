import { describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { LineupPickItem } from '@/shared/types/lineupPickItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  LINEUP_PICKS_TABLE_NAME: 'LineupPicks',
};

const TODAY = '2026-06-05';

const pastPickUser1: LineupPickItem = {
  eventDay: '2026-06-04',
  username: 'user1',
  alias: 'user1',
  defensor: 'Def A',
  mediocampista: 'Mid A',
  delantero: 'Fwd A',
  points: 5,
};

const todayPickUser1: LineupPickItem = {
  eventDay: TODAY,
  username: 'user1',
  alias: 'user1',
  defensor: 'Def C',
  mediocampista: 'Mid C',
  delantero: 'Fwd C',
  points: null,
};

const futurePickUser1: LineupPickItem = {
  eventDay: '2026-06-07',
  username: 'user1',
  alias: 'user1',
  defensor: 'Def E',
  mediocampista: 'Mid E',
  delantero: 'Fwd E',
  points: null,
};

const todayPickOtherUser: LineupPickItem = {
  eventDay: TODAY,
  username: 'other-user',
  alias: 'other-user',
  defensor: 'Def F',
  mediocampista: 'Mid F',
  delantero: 'Fwd F',
  points: null,
};

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

vi.mock('@/functions/get-event-type/getArgentinaTodayDateString', () => ({
  getArgentinaTodayDateString: vi.fn(() => TODAY),
}));

describe('fetchMyFuturePicks', () => {
  it('returns today and future picks only for the authenticated user', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable).mockResolvedValue([
        pastPickUser1,
        todayPickUser1,
        futurePickUser1,
        todayPickOtherUser,
      ]);

      const { fetchMyFuturePicks } = await import('./fetchMyFuturePicks');
      const result = await fetchMyFuturePicks('user1');

      expect(scanTable).toHaveBeenCalledWith('LineupPicks');
      expect(result).toEqual([todayPickUser1, futurePickUser1]);
    });
  });

  it('returns empty array when the user has no today or future picks', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable).mockResolvedValue([pastPickUser1, todayPickOtherUser]);

      const { fetchMyFuturePicks } = await import('./fetchMyFuturePicks');
      const result = await fetchMyFuturePicks('user1');

      expect(result).toEqual([]);
    });
  });
});
