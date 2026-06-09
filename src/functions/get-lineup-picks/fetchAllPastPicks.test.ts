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

const pastPickUser2: LineupPickItem = {
  eventDay: '2026-06-03',
  username: 'other-user',
  alias: 'other-user',
  defensor: 'Def B',
  mediocampista: 'Mid B',
  delantero: 'Fwd B',
  points: null,
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

const futurePickUser2: LineupPickItem = {
  eventDay: '2026-06-07',
  username: 'other-user',
  alias: 'other-user',
  defensor: 'Def D',
  mediocampista: 'Mid D',
  delantero: 'Fwd D',
  points: null,
};

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

vi.mock('@/functions/get-event-type/getArgentinaTodayDateString', () => ({
  getArgentinaTodayDateString: vi.fn(() => TODAY),
}));

describe('fetchAllPastPicks', () => {
  it('returns lineup picks from days before today for all users', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable).mockResolvedValue([
        pastPickUser1,
        pastPickUser2,
        todayPickUser1,
        futurePickUser2,
      ]);

      const { fetchAllPastPicks } = await import('./fetchAllPastPicks');
      const result = await fetchAllPastPicks();

      expect(scanTable).toHaveBeenCalledWith('LineupPicks');
      expect(result).toEqual([pastPickUser1, pastPickUser2]);
    });
  });

  it('returns empty array when no pick is from a past day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable).mockResolvedValue([todayPickUser1, futurePickUser2]);

      const { fetchAllPastPicks } = await import('./fetchAllPastPicks');
      const result = await fetchAllPastPicks();

      expect(result).toEqual([]);
    });
  });
});
