import { describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { LineupPickItem } from '@/shared/types/lineupPickItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  LINEUP_PICKS_TABLE_NAME: 'LineupPicks',
};

vi.mock('./fetchAllPastPicks', () => ({
  fetchAllPastPicks: vi.fn(),
}));

vi.mock('./fetchMyFuturePicks', () => ({
  fetchMyFuturePicks: vi.fn(),
}));

const pastPick: LineupPickItem = {
  eventDay: '2026-06-04',
  username: 'other-user',
  alias: 'Other User',
  defensor: 'Def A',
  mediocampista: 'Mid A',
  delantero: 'Fwd A',
  points: 3,
};

const futurePick: LineupPickItem = {
  eventDay: '2026-06-07',
  username: 'user1',
  alias: 'User One',
  defensor: 'Def B',
  mediocampista: 'Mid B',
  delantero: 'Fwd B',
  points: null,
};

describe('getLineupPicks', () => {
  it('segregates past and future picks using alias stored on each item', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchAllPastPicks } = await import('./fetchAllPastPicks');
      const { fetchMyFuturePicks } = await import('./fetchMyFuturePicks');
      vi.mocked(fetchAllPastPicks).mockResolvedValue([pastPick]);
      vi.mocked(fetchMyFuturePicks).mockResolvedValue([futurePick]);

      const { getLineupPicks } = await import('./getLineupPicks');
      const result = await getLineupPicks('user1');

      expect(fetchMyFuturePicks).toHaveBeenCalledWith('user1');
      expect(result).toEqual({
        allPastPicks: [
          {
            eventDay: '2026-06-04',
            username: 'other-user',
            alias: 'Other User',
            defensor: 'Def A',
            mediocampista: 'Mid A',
            delantero: 'Fwd A',
            points: 3,
          },
        ],
        myFuturePicks: [
          {
            eventDay: '2026-06-07',
            username: 'user1',
            alias: 'User One',
            defensor: 'Def B',
            mediocampista: 'Mid B',
            delantero: 'Fwd B',
            points: null,
          },
        ],
      });
    });
  });

  it('falls back to username when alias is missing on stored item', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchAllPastPicks } = await import('./fetchAllPastPicks');
      const { fetchMyFuturePicks } = await import('./fetchMyFuturePicks');
      vi.mocked(fetchAllPastPicks).mockResolvedValue([
        { ...pastPick, alias: undefined as unknown as string },
      ]);
      vi.mocked(fetchMyFuturePicks).mockResolvedValue([]);

      const { getLineupPicks } = await import('./getLineupPicks');
      const result = await getLineupPicks('user1');

      expect(result.allPastPicks[0]?.alias).toBe('other-user');
    });
  });

  it('maps points as null when absent on past picks', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchAllPastPicks } = await import('./fetchAllPastPicks');
      const { fetchMyFuturePicks } = await import('./fetchMyFuturePicks');
      vi.mocked(fetchAllPastPicks).mockResolvedValue([
        { ...pastPick, points: undefined as unknown as null },
      ]);
      vi.mocked(fetchMyFuturePicks).mockResolvedValue([]);

      const { getLineupPicks } = await import('./getLineupPicks');
      const result = await getLineupPicks('user1');

      expect(result.allPastPicks[0]?.points).toBeNull();
    });
  });
});
