import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { StealPickItem } from '@/shared/types/stealPickItem';
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

const EXISTING_PICK: StealPickItem = {
  calendarDate: '2026-06-07',
  stealerUsername: 'stealer.user',
  victimUsername: 'old.victim',
  matchId: 'wc26-m010',
  stolenPoints: 0,
};

vi.mock('@/shared/dynamo/deleteItem', () => ({
  deleteItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

describe('editStealPick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('swaps blocked victims and updates StealPick when victim changes', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { deleteItem } = await import('@/shared/dynamo/deleteItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { editStealPick } = await import('./editStealPick');

      const request: StealPickRequest = {
        calendarDate: '2026-06-07',
        victimUsername: 'new.victim',
        matchId: 'wc26-m011',
      };

      await editStealPick('stealer.user', request, EXISTING_PICK);

      expect(deleteItem).toHaveBeenCalledWith('BlockedVictims', { username: 'old.victim' });
      expect(putItem).toHaveBeenCalledWith('BlockedVictims', { username: 'new.victim' });
      expect(putItem).toHaveBeenCalledWith('StealPicks', {
        calendarDate: '2026-06-07',
        stealerUsername: 'stealer.user',
        victimUsername: 'new.victim',
        matchId: 'wc26-m011',
        stolenPoints: 0,
      });
    });
  });

  it('updates only StealPick when victim stays the same', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { deleteItem } = await import('@/shared/dynamo/deleteItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      const { editStealPick } = await import('./editStealPick');

      const request: StealPickRequest = {
        calendarDate: '2026-06-07',
        victimUsername: 'old.victim',
        matchId: 'wc26-m012',
      };

      await editStealPick('stealer.user', request, EXISTING_PICK);

      expect(deleteItem).not.toHaveBeenCalled();
      expect(putItem).toHaveBeenCalledTimes(1);
      expect(putItem).toHaveBeenCalledWith('StealPicks', {
        calendarDate: '2026-06-07',
        stealerUsername: 'stealer.user',
        victimUsername: 'old.victim',
        matchId: 'wc26-m012',
        stolenPoints: 0,
      });
    });
  });
});
