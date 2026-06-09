import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { UserItem } from '@/shared/types/userItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
};

const mockUser: UserItem = {
  username: 'alejandro',
  alias: 'Ale',
  password: '1234',
  score: 42,
  rankingPosition: 7,
};

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

describe('updateCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates only alias and preserves password, score and rankingPosition', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);
      vi.mocked(putItem).mockResolvedValue(undefined);

      const { updateCurrentUser } = await import('./updateCurrentUser');
      const result = await updateCurrentUser('alejandro', { alias: 'Nuevo' });

      expect(putItem).toHaveBeenCalledWith('Users', {
        username: 'alejandro',
        alias: 'Nuevo',
        password: '1234',
        score: 42,
        rankingPosition: 7,
      });
      expect(result).toEqual({
        username: 'alejandro',
        alias: 'Nuevo',
        score: 42,
        rankingPosition: 7,
        rankingDif: 0,
      });
    });
  });

  it('updates only password and preserves alias, score and rankingPosition', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);
      vi.mocked(putItem).mockResolvedValue(undefined);

      const { updateCurrentUser } = await import('./updateCurrentUser');
      const result = await updateCurrentUser('alejandro', { password: 'nueva' });

      expect(putItem).toHaveBeenCalledWith('Users', {
        username: 'alejandro',
        alias: 'Ale',
        password: 'nueva',
        score: 42,
        rankingPosition: 7,
      });
      expect(result).toEqual({
        username: 'alejandro',
        alias: 'Ale',
        score: 42,
        rankingPosition: 7,
        rankingDif: 0,
      });
    });
  });

  it('updates alias and password together', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);
      vi.mocked(putItem).mockResolvedValue(undefined);

      const { updateCurrentUser } = await import('./updateCurrentUser');
      const result = await updateCurrentUser('alejandro', {
        alias: 'Nuevo',
        password: 'nueva',
      });

      expect(putItem).toHaveBeenCalledWith('Users', {
        username: 'alejandro',
        alias: 'Nuevo',
        password: 'nueva',
        score: 42,
        rankingPosition: 7,
      });
      expect(result).toEqual({
        username: 'alejandro',
        alias: 'Nuevo',
        score: 42,
        rankingPosition: 7,
        rankingDif: 0,
      });
    });
  });

  it('throws NotFoundError when user does not exist', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(null);

      const { updateCurrentUser } = await import('./updateCurrentUser');

      await expect(updateCurrentUser('unknown', { alias: 'X' })).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Usuario no encontrado.',
      });
    });
  });
});
