import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { StealPickItem } from '@/shared/types/stealPickItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
  STEAL_PICKS_TABLE_NAME: 'StealPicks',
};

const TODAY_STEAL_PICK: StealPickItem = {
  calendarDate: '2026-06-07',
  stealerUsername: 'stealer.user',
  victimUsername: 'victim.user',
  matchId: 'wc26-m003',
  stolenPoints: 0,
};

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

describe('fetchMyStealPick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns today steal pick for the authenticated stealer', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(TODAY_STEAL_PICK);

      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const result = await fetchMyStealPick('stealer.user');

      expect(getItem).toHaveBeenCalledWith('StealPicks', {
        calendarDate: '2026-06-07',
        stealerUsername: 'stealer.user',
      });
      expect(result).toEqual(TODAY_STEAL_PICK);
    });
  });

  it('returns null when the stealer has no pick for today', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(null);

      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const result = await fetchMyStealPick('stealer.user');

      expect(result).toBeNull();
    });
  });
});
