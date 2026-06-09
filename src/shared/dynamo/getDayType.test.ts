import { describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import { DayEventType } from '@/shared/types/dayEventType';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
  STEALERS_TABLE_NAME: 'Stealers',
  BLOCKED_VICTIMS_TABLE_NAME: 'BlockedVictims',
};

vi.mock('./getItem', () => ({
  getItem: vi.fn(),
}));

describe('getDayType', () => {
  it('returns robo when the day event exists with eventType robo', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('./getItem');
      const { getDayType } = await import('./getDayType');
      vi.mocked(getItem).mockResolvedValue({ date: '2026-06-15', eventType: DayEventType.Robo });

      const result = await getDayType('2026-06-15');

      expect(result).toBe(DayEventType.Robo);
      expect(getItem).toHaveBeenCalledWith('DayEvents', { date: '2026-06-15' });
    });
  });

  it('returns jugadores when the day event exists with eventType jugadores', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('./getItem');
      const { getDayType } = await import('./getDayType');
      vi.mocked(getItem).mockResolvedValue({
        date: '2026-06-16',
        eventType: DayEventType.Jugadores,
      });

      const result = await getDayType('2026-06-16');

      expect(result).toBe(DayEventType.Jugadores);
    });
  });

  it('returns comun when the day event exists with eventType comun', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('./getItem');
      const { getDayType } = await import('./getDayType');
      vi.mocked(getItem).mockResolvedValue({ date: '2026-06-17', eventType: DayEventType.Comun });

      const result = await getDayType('2026-06-17');

      expect(result).toBe(DayEventType.Comun);
    });
  });

  it('returns comun when no day event exists for the date', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('./getItem');
      const { getDayType } = await import('./getDayType');
      vi.mocked(getItem).mockResolvedValue(null);

      const result = await getDayType('2026-06-18');

      expect(result).toBe(DayEventType.Comun);
    });
  });
});
