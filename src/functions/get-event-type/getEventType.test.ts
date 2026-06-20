import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { DayEventItem } from '@/shared/types/dayEvent';
import { DayEventType } from '@/shared/types/dayEventType';
import type { AlterAssignmentItem, AlterVictimLockItem } from '@/shared/types/alteration';
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

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

describe('getEventType', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T15:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns all day events without steal context when today is not a robo day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(scanTable).mockResolvedValue([
        { date: '2026-06-07', eventType: DayEventType.Comun },
        { date: '2026-06-10', eventType: DayEventType.Jugadores },
        { date: '2026-06-12', eventType: DayEventType.Robo },
      ] satisfies DayEventItem[]);
      vi.mocked(getItem).mockResolvedValue(null);

      const result = await getEventType('alejandro');

      expect(result).toEqual({
        today: '2026-06-07',
        days: {
          '2026-06-07': { eventType: DayEventType.Comun },
          '2026-06-10': { eventType: DayEventType.Jugadores },
          '2026-06-12': { eventType: DayEventType.Robo },
        },
      });
      expect(scanTable).toHaveBeenCalledWith('DayEvents');
      expect(getItem).toHaveBeenCalledWith('AlterAssignments', {
        calendarDate: '2026-06-07',
        username: 'alejandro',
      });
      expect(scanTable).toHaveBeenCalledTimes(1);
    });
  });

  it('returns steal context only when today is a robo day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'DayEvents') {
          return [
            { date: '2026-06-07', eventType: DayEventType.Robo },
            { date: '2026-06-10', eventType: DayEventType.Jugadores },
          ] satisfies DayEventItem[];
        }

        return [
          { username: 'blocked-user' },
          { username: 'another-blocked' },
        ] satisfies BlockedVictimItem[];
      });
      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'Stealers') {
          return {
            dayId: '2026-06-07',
            stealerUsername: 'alejandro',
          } satisfies StealerItem;
        }

        return null;
      });

      const result = await getEventType('alejandro');

      expect(result).toEqual({
        today: '2026-06-07',
        days: {
          '2026-06-07': { eventType: DayEventType.Robo },
          '2026-06-10': { eventType: DayEventType.Jugadores },
        },
        stealContext: {
          currentUserIsSteal: true,
          blockedUsernames: ['blocked-user', 'another-blocked'],
          availableMatchIds: [],
        },
      });
      expect(getItem).toHaveBeenCalledWith('Stealers', {
        dayId: '2026-06-07',
        stealerUsername: 'alejandro',
      });
      expect(getItem).toHaveBeenCalledWith('AlterAssignments', {
        calendarDate: '2026-06-07',
        username: 'alejandro',
      });
      expect(scanTable).toHaveBeenCalledWith('BlockedVictims');
    });
  });

  it('does not treat user as stealer when only registered for another dayId', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'DayEvents') {
          return [{ date: '2026-06-07', eventType: DayEventType.Robo }] satisfies DayEventItem[];
        }

        return [] satisfies BlockedVictimItem[];
      });
      vi.mocked(getItem).mockResolvedValue(null);

      const result = await getEventType('alejandro');

      expect(result.stealContext).toEqual({
        currentUserIsSteal: false,
        blockedUsernames: [],
        availableMatchIds: [],
      });
      expect(getItem).toHaveBeenCalledWith('Stealers', {
        dayId: '2026-06-07',
        stealerUsername: 'alejandro',
      });
      expect(getItem).toHaveBeenCalledWith('AlterAssignments', {
        calendarDate: '2026-06-07',
        username: 'alejandro',
      });
    });
  });

  it('includes the stealer available match IDs in steal context when the row has them', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'DayEvents') {
          return [{ date: '2026-06-07', eventType: DayEventType.Robo }] satisfies DayEventItem[];
        }
        return [] satisfies BlockedVictimItem[];
      });
      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'Stealers') {
          return {
            dayId: '2026-06-07',
            stealerUsername: 'alejandro',
            availableMatchSteals: ['wc26-m001', 'wc26-m003'],
          } satisfies StealerItem;
        }

        return null;
      });

      const result = await getEventType('alejandro');

      expect(result.stealContext?.availableMatchIds).toEqual(['wc26-m001', 'wc26-m003']);
    });
  });

  it('returns empty availableMatchIds when the stealer row has no availableMatchSteals', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'DayEvents') {
          return [{ date: '2026-06-07', eventType: DayEventType.Robo }] satisfies DayEventItem[];
        }
        return [] satisfies BlockedVictimItem[];
      });
      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'Stealers') {
          return {
            dayId: '2026-06-07',
            stealerUsername: 'alejandro',
          } satisfies StealerItem;
        }

        return null;
      });

      const result = await getEventType('alejandro');

      expect(result.stealContext?.availableMatchIds).toEqual([]);
    });
  });

  it('returns empty days when no day events exist', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(scanTable).mockResolvedValue([] satisfies DayEventItem[]);
      vi.mocked(getItem).mockResolvedValue(null);

      const result = await getEventType('alejandro');

      expect(result).toEqual({
        today: '2026-06-07',
        days: {},
      });
    });
  });

  it('returns alter context only when the current user is assigned today', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(scanTable).mockImplementation(async (tableName: string) => {
        if (tableName === 'DayEvents') {
          return [{ date: '2026-06-07', eventType: DayEventType.Comun }] satisfies DayEventItem[];
        }

        return [
          { victimUsername: 'blocked-victim' },
          { victimUsername: 'another-victim' },
        ] satisfies AlterVictimLockItem[];
      });
      vi.mocked(getItem).mockResolvedValue({
        calendarDate: '2026-06-07',
        username: 'alejandro',
        createdAt: '2026-06-01T12:00:00.000Z',
      } satisfies AlterAssignmentItem);

      const result = await getEventType('alejandro');

      expect(result).toEqual({
        today: '2026-06-07',
        days: {
          '2026-06-07': { eventType: DayEventType.Comun },
        },
        alterContext: {
          currentUserCanAlter: true,
          blockedUsernames: ['blocked-victim', 'another-victim'],
        },
      });
      expect(getItem).toHaveBeenCalledWith('AlterAssignments', {
        calendarDate: '2026-06-07',
        username: 'alejandro',
      });
      expect(scanTable).toHaveBeenCalledWith('AlterVictimLocks');
    });
  });

  it('does not reveal alter context or future assignments when the user is not assigned today', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(scanTable).mockResolvedValue([
        { date: '2026-06-07', eventType: DayEventType.Comun },
        { date: '2026-06-10', eventType: DayEventType.Comun },
      ] satisfies DayEventItem[]);
      vi.mocked(getItem).mockResolvedValue(null);

      const result = await getEventType('alejandro');

      expect(result).toEqual({
        today: '2026-06-07',
        days: {
          '2026-06-07': { eventType: DayEventType.Comun },
          '2026-06-10': { eventType: DayEventType.Comun },
        },
      });
      expect(getItem).toHaveBeenCalledTimes(1);
      expect(getItem).toHaveBeenCalledWith('AlterAssignments', {
        calendarDate: '2026-06-07',
        username: 'alejandro',
      });
      expect(scanTable).not.toHaveBeenCalledWith('AlterVictimLocks');
    });
  });
});
