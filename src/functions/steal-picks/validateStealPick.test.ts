import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { DayEventItem } from '@/shared/types/dayEvent';
import type { BlockedVictimItem, StealerItem } from '@/shared/types/stealer';
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

const FUTURE_MATCH: MatchItem = {
  matchId: 'wc26-m010',
  homeTeamName: 'Home',
  homeTeamCode: 'HOM',
  awayTeamName: 'Away',
  awayTeamCode: 'AWY',
  homeGoals: null,
  awayGoals: null,
  kickoffAt: '2026-06-07T21:00:00.000Z',
  status: 1,
  isFirstRound: true,
};

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

describe('validateStealPick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T15:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when caller tries to steal from themselves', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { validateStealPick } = await import('./validateStealPick');

      await expect(
        validateStealPick('stealer.user', {
          ...REQUEST,
          victimUsername: 'stealer.user',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Cannot steal from yourself',
      });
    });
  });

  it('throws when caller is not an authorized stealer', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateStealPick } = await import('./validateStealPick');

      vi.mocked(getItem).mockResolvedValue(null);

      await expect(validateStealPick('stealer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Caller is not an authorized stealer for this day',
      });
    });
  });

  it('throws when the day is not a steal day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateStealPick } = await import('./validateStealPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'Stealers') {
          return {
            calendarDate: REQUEST.calendarDate,
            stealerUsername: 'stealer.user',
          } satisfies StealerItem;
        }

        if (tableName === 'DayEvents') {
          return { date: REQUEST.calendarDate, eventType: 'common' } satisfies DayEventItem;
        }

        return null;
      });

      await expect(validateStealPick('stealer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Steal picks are only allowed on steal days',
      });
    });
  });

  it('throws when victim is blocked', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateStealPick } = await import('./validateStealPick');

      vi.mocked(getItem).mockImplementation(async (tableName, key) => {
        if (tableName === 'Stealers') {
          return {
            calendarDate: REQUEST.calendarDate,
            stealerUsername: 'stealer.user',
          } satisfies StealerItem;
        }

        if (tableName === 'DayEvents') {
          return { date: REQUEST.calendarDate, eventType: 'robo' } satisfies DayEventItem;
        }

        if (tableName === 'BlockedVictims' && key.username === REQUEST.victimUsername) {
          return { username: REQUEST.victimUsername } satisfies BlockedVictimItem;
        }

        return null;
      });

      await expect(validateStealPick('stealer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Victim is blocked: victim.user',
      });
    });
  });

  it('throws when matchId is unknown', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateStealPick } = await import('./validateStealPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'Stealers') {
          return {
            calendarDate: REQUEST.calendarDate,
            stealerUsername: 'stealer.user',
          } satisfies StealerItem;
        }

        if (tableName === 'DayEvents') {
          return { date: REQUEST.calendarDate, eventType: 'robo' } satisfies DayEventItem;
        }

        return null;
      });

      await expect(validateStealPick('stealer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Unknown matchId: wc26-m010',
      });
    });
  });

  it('throws when match does not belong to the requested day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateStealPick } = await import('./validateStealPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'Stealers') {
          return {
            calendarDate: REQUEST.calendarDate,
            stealerUsername: 'stealer.user',
          } satisfies StealerItem;
        }

        if (tableName === 'DayEvents') {
          return { date: REQUEST.calendarDate, eventType: 'robo' } satisfies DayEventItem;
        }

        if (tableName === 'Matches') {
          return {
            ...FUTURE_MATCH,
            kickoffAt: '2099-06-08T21:00:00.000Z',
          };
        }

        return null;
      });

      await expect(validateStealPick('stealer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Match wc26-m010 does not belong to calendar date 2026-06-07',
      });
    });
  });

  it('throws when kickoff has passed', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateStealPick } = await import('./validateStealPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'Stealers') {
          return {
            calendarDate: REQUEST.calendarDate,
            stealerUsername: 'stealer.user',
          } satisfies StealerItem;
        }

        if (tableName === 'DayEvents') {
          return { date: REQUEST.calendarDate, eventType: 'robo' } satisfies DayEventItem;
        }

        if (tableName === 'Matches') {
          return {
            ...FUTURE_MATCH,
            kickoffAt: '2026-06-07T12:00:00.000Z',
          };
        }

        return null;
      });

      await expect(validateStealPick('stealer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Kickoff has passed for match wc26-m010',
      });
    });
  });

  it('does not throw when all validations pass', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateStealPick } = await import('./validateStealPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'Stealers') {
          return {
            calendarDate: REQUEST.calendarDate,
            stealerUsername: 'stealer.user',
          } satisfies StealerItem;
        }

        if (tableName === 'DayEvents') {
          return { date: REQUEST.calendarDate, eventType: 'robo' } satisfies DayEventItem;
        }

        if (tableName === 'Matches') {
          return FUTURE_MATCH;
        }

        return null;
      });

      await expect(validateStealPick('stealer.user', REQUEST)).resolves.toBeUndefined();
    });
  });
});
