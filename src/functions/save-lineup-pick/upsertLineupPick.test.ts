import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  LINEUP_PICKS_TABLE_NAME: 'LineupPicks',
};

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

describe('upsertLineupPick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists lineup pick with alias and points null', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue({
        username: 'user1',
        alias: 'User One',
        password: 'secret',
      });
      vi.mocked(putItem).mockResolvedValue(undefined);

      const { upsertLineupPick } = await import('./upsertLineupPick');
      await upsertLineupPick('user1', {
        eventDay: '2026-06-15',
        defensor: 'Def A',
        mediocampista: 'Mid B',
        delantero: 'Fwd C',
      });

      expect(getItem).toHaveBeenCalledWith('Users', { username: 'user1' });
      expect(putItem).toHaveBeenCalledWith('LineupPicks', {
        eventDay: '2026-06-15',
        username: 'user1',
        alias: 'User One',
        defensor: 'Def A',
        mediocampista: 'Mid B',
        delantero: 'Fwd C',
        points: null,
      });
    });
  });

  it('falls back to username when alias is missing', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue({
        username: 'user1',
        password: 'secret',
      });
      vi.mocked(putItem).mockResolvedValue(undefined);

      const { upsertLineupPick } = await import('./upsertLineupPick');
      await upsertLineupPick('user1', {
        eventDay: '2026-06-15',
        defensor: 'Def A',
        mediocampista: 'Mid B',
        delantero: 'Fwd C',
      });

      expect(putItem).toHaveBeenCalledWith(
        'LineupPicks',
        expect.objectContaining({
          alias: 'user1',
        }),
      );
    });
  });
});
