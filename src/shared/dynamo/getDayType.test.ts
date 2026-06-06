import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import { getItem } from './getItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
};

vi.mock('./getItem', () => ({
  getItem: vi.fn(),
}));

describe('getDayType', () => {
  beforeEach(() => {
    vi.mocked(getItem).mockReset();
  });

  it('returns robo when the day event exists with eventType robo', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('./getDayType');
      vi.mocked(getItem).mockResolvedValue({ date: '2026-06-15', eventType: 'robo' });

      const result = await getDayType('2026-06-15');

      expect(result).toBe('robo');
      expect(getItem).toHaveBeenCalledWith('DayEvents', { date: '2026-06-15' });
    });
  });

  it('returns players when the day event exists with eventType players', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('./getDayType');
      vi.mocked(getItem).mockResolvedValue({ date: '2026-06-16', eventType: 'players' });

      const result = await getDayType('2026-06-16');

      expect(result).toBe('players');
    });
  });

  it('returns common when the day event exists with eventType common', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('./getDayType');
      vi.mocked(getItem).mockResolvedValue({ date: '2026-06-17', eventType: 'common' });

      const result = await getDayType('2026-06-17');

      expect(result).toBe('common');
    });
  });

  it('returns common when no day event exists for the date', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getDayType } = await import('./getDayType');
      vi.mocked(getItem).mockResolvedValue(null);

      const result = await getDayType('2026-06-18');

      expect(result).toBe('common');
    });
  });
});
