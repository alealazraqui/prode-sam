import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { DayEventItem } from '@/shared/types/dayEvent';
import { DayEventType } from '@/shared/types/dayEventType';
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
      expect(getItem).not.toHaveBeenCalled();
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
      vi.mocked(getItem).mockResolvedValue({
        dayId: '2026-06-07',
        stealerUsername: 'alejandro',
      } satisfies StealerItem);

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
        },
      });
      expect(getItem).toHaveBeenCalledWith('Stealers', {
        dayId: '2026-06-07',
        stealerUsername: 'alejandro',
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
      });
      expect(getItem).toHaveBeenCalledWith('Stealers', {
        dayId: '2026-06-07',
        stealerUsername: 'alejandro',
      });
    });
  });

  it('returns empty days when no day events exist', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(scanTable).mockResolvedValue([] satisfies DayEventItem[]);

      const result = await getEventType('alejandro');

      expect(result).toEqual({
        today: '2026-06-07',
        days: {},
      });
    });
  });
});
