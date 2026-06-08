import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';

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

const TODAY = '2026-06-08';
const FUTURE_KICKOFF = '2099-06-08T21:00:00.000Z';
const PAST_KICKOFF = '2020-06-08T21:00:00.000Z';

const EXISTING_PICK = {
  calendarDate: TODAY,
  stealerUsername: 'stealer.user',
  victimUsername: 'victim.user',
  matchId: 'wc26-m010',
  stolenPoints: 0,
};

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/deleteItem', () => ({
  deleteItem: vi.fn(),
}));

vi.mock('@/functions/get-event-type/getArgentinaTodayDateString', () => ({
  getArgentinaTodayDateString: vi.fn(() => TODAY),
}));

describe('deleteStealPick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes steal pick and unblocks victim when kickoff has not passed', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { deleteItem } = await import('@/shared/dynamo/deleteItem');
      const { deleteStealPick } = await import('./deleteStealPick');

      vi.mocked(getItem).mockImplementation(async (tableName, key) => {
        if (tableName === 'StealPicks') return EXISTING_PICK;
        if (tableName === 'Matches' && key.matchId === 'wc26-m010') {
          return { matchId: 'wc26-m010', kickoffAt: FUTURE_KICKOFF };
        }
        return null;
      });

      await deleteStealPick('stealer.user');

      expect(deleteItem).toHaveBeenCalledWith('StealPicks', {
        calendarDate: TODAY,
        stealerUsername: 'stealer.user',
      });
      expect(deleteItem).toHaveBeenCalledWith('BlockedVictims', {
        username: 'victim.user',
      });
    });
  });

  it('throws NotFoundError when user has no steal pick today', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { deleteStealPick } = await import('./deleteStealPick');

      vi.mocked(getItem).mockResolvedValue(null);

      await expect(deleteStealPick('stealer.user')).rejects.toMatchObject({
        statusCode: 404,
        message: 'No steal pick found for today',
      });
    });
  });

  it('throws BadRequestError when kickoff has passed', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { deleteItem } = await import('@/shared/dynamo/deleteItem');
      const { deleteStealPick } = await import('./deleteStealPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'StealPicks') return EXISTING_PICK;
        if (tableName === 'Matches') {
          return { matchId: 'wc26-m010', kickoffAt: PAST_KICKOFF };
        }
        return null;
      });

      await expect(deleteStealPick('stealer.user')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Kickoff has passed for match wc26-m010',
      });
      expect(deleteItem).not.toHaveBeenCalled();
    });
  });
});
