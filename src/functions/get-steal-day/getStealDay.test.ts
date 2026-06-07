import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { BlockedVictimItem, StealerItem } from '@/shared/types/stealer';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
  STEALERS_TABLE_NAME: 'Stealers',
  BLOCKED_VICTIMS_TABLE_NAME: 'BlockedVictims',
};

vi.mock('@/shared/dynamo/getDayType', () => ({
  getDayType: vi.fn(),
}));

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

describe('getStealDay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T15:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty steal context when the day is common', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getStealDay } = await import('./getStealDay');

      vi.mocked(getDayType).mockResolvedValue('common');

      const result = await getStealDay('alejandro');

      expect(result).toEqual({
        eventType: 'common',
        stealers: [],
        blockedUsernames: [],
        currentUserIsSteal: false,
      });
      expect(getDayType).toHaveBeenCalledWith('2026-06-07');
      expect(scanTable).not.toHaveBeenCalled();
    });
  });

  it('returns empty steal context when the day is players', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { getStealDay } = await import('./getStealDay');

      vi.mocked(getDayType).mockResolvedValue('players');

      const result = await getStealDay('alejandro');

      expect(result).toEqual({
        eventType: 'players',
        stealers: [],
        blockedUsernames: [],
        currentUserIsSteal: false,
      });
    });
  });

  it('returns steal context with currentUserIsSteal true when user is a stealer', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getStealDay } = await import('./getStealDay');

      vi.mocked(getDayType).mockResolvedValue('robo');
      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Stealers') {
          return [
            {
              dayId: '2026-06-07',
              stealerUsername: 'alejandro',
              matchId: 'match-1',
              victimUsername: 'victim-1',
            },
            {
              dayId: '2026-06-06',
              stealerUsername: 'other',
            },
          ] satisfies StealerItem[];
        }

        return [
          { username: 'blocked-user' },
          { username: 'another-blocked' },
        ] satisfies BlockedVictimItem[];
      });

      const result = await getStealDay('alejandro');

      expect(result).toEqual({
        eventType: 'steal',
        stealers: [
          {
            stealerUsername: 'alejandro',
            matchId: 'match-1',
            victimUsername: 'victim-1',
          },
        ],
        blockedUsernames: ['blocked-user', 'another-blocked'],
        currentUserIsSteal: true,
      });
    });
  });

  it('returns currentUserIsSteal false when user is not a stealer on a steal day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getStealDay } = await import('./getStealDay');

      vi.mocked(getDayType).mockResolvedValue('robo');
      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Stealers') {
          return [
            {
              dayId: '2026-06-07',
              stealerUsername: 'other-stealer',
            },
          ] satisfies StealerItem[];
        }

        return [{ username: 'blocked-user' }] satisfies BlockedVictimItem[];
      });

      const result = await getStealDay('alejandro');

      expect(result).toEqual({
        eventType: 'steal',
        stealers: [{ stealerUsername: 'other-stealer' }],
        blockedUsernames: ['blocked-user'],
        currentUserIsSteal: false,
      });
    });
  });

  it('filters stealers by the current Argentina day id', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getStealDay } = await import('./getStealDay');

      vi.mocked(getDayType).mockResolvedValue('robo');
      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'Stealers') {
          return [
            { dayId: '2026-06-07', stealerUsername: 'today-stealer' },
            { dayId: '2026-06-06', stealerUsername: 'yesterday-stealer' },
          ] satisfies StealerItem[];
        }

        return [] satisfies BlockedVictimItem[];
      });

      const result = await getStealDay('today-stealer');

      expect(result.stealers).toEqual([{ stealerUsername: 'today-stealer' }]);
      expect(result.currentUserIsSteal).toBe(true);
    });
  });
});
