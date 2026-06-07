import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { StealPickRequest } from './types';

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

const REQUEST: StealPickRequest = {
  calendarDate: '2026-06-07',
  victimUsername: 'victim.user',
  matchId: 'wc26-m010',
};

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

describe('saveStealPick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates StealPick with stolenPoints 0 and blocks the victim', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { saveStealPick } = await import('./saveStealPick');

      await saveStealPick('stealer.user', REQUEST);

      expect(putItem).toHaveBeenCalledTimes(2);
      expect(putItem).toHaveBeenCalledWith('StealPicks', {
        calendarDate: '2026-06-07',
        stealerUsername: 'stealer.user',
        victimUsername: 'victim.user',
        matchId: 'wc26-m010',
        stolenPoints: 0,
      });
      expect(putItem).toHaveBeenCalledWith('BlockedVictims', {
        username: 'victim.user',
      });
    });
  });
});
