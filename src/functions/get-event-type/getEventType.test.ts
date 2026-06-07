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

  it('returns common day with empty blocked victims', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(getDayType).mockResolvedValue('common');

      const result = await getEventType('alejandro');

      expect(result).toEqual({
        eventType: 'common',
        currentUserIsSteal: false,
        blockedUsernames: [],
      });
      expect(getDayType).toHaveBeenCalledWith('2026-06-07');
      expect(getItem).not.toHaveBeenCalled();
      expect(scanTable).not.toHaveBeenCalled();
    });
  });

  it('returns players day with empty blocked victims', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { getEventType } = await import('./getEventType');

      vi.mocked(getDayType).mockResolvedValue('players');

      const result = await getEventType('alejandro');

      expect(result).toEqual({
        eventType: 'players',
        currentUserIsSteal: false,
        blockedUsernames: [],
      });
      expect(getItem).not.toHaveBeenCalled();
    });
  });

  it('returns currentUserIsSteal true and blocked victims on a steal day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(getDayType).mockResolvedValue('robo');
      vi.mocked(getItem).mockResolvedValue({
        calendarDate: '2026-06-07',
        stealerUsername: 'alejandro',
      } satisfies StealerItem);
      vi.mocked(scanTable).mockResolvedValue([
        { username: 'blocked-user' },
        { username: 'another-blocked' },
      ] satisfies BlockedVictimItem[]);

      const result = await getEventType('alejandro');

      expect(result).toEqual({
        eventType: 'steal',
        currentUserIsSteal: true,
        blockedUsernames: ['blocked-user', 'another-blocked'],
      });
      expect(getItem).toHaveBeenCalledWith('Stealers', {
        calendarDate: '2026-06-07',
        stealerUsername: 'alejandro',
      });
      expect(scanTable).toHaveBeenCalledWith('BlockedVictims');
    });
  });

  it('returns currentUserIsSteal false with blocked victims when user is not a stealer', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('@/shared/dynamo/getDayType');
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { getEventType } = await import('./getEventType');

      vi.mocked(getDayType).mockResolvedValue('robo');
      vi.mocked(getItem).mockResolvedValue(null);
      vi.mocked(scanTable).mockResolvedValue([
        { username: 'blocked-user' },
      ] satisfies BlockedVictimItem[]);

      const result = await getEventType('alejandro');

      expect(result).toEqual({
        eventType: 'steal',
        currentUserIsSteal: false,
        blockedUsernames: ['blocked-user'],
      });
    });
  });
});
