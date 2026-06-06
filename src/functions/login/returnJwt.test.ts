import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
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
  score: 0,
};

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

describe('authenticateUser', () => {
  it('throws UnauthorizedError when user is not found', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(null);

      const { authenticateUser } = await import('./returnJwt');

      await expect(authenticateUser({ username: 'unknown', password: '1234' })).rejects.toThrow(
        new UnauthorizedError('Usuario o contraseña inválidos.'),
      );
    });
  });

  it('throws UnauthorizedError when password is incorrect', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);

      const { authenticateUser } = await import('./returnJwt');

      await expect(authenticateUser({ username: 'alejandro', password: 'wrong' })).rejects.toThrow(
        new UnauthorizedError('Usuario o contraseña inválidos.'),
      );
    });
  });

  it('returns user when credentials are valid', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);

      const { authenticateUser } = await import('./returnJwt');

      await expect(authenticateUser({ username: 'alejandro', password: '1234' })).resolves.toEqual(
        mockUser,
      );
    });
  });
});

describe('buildAuthResponse', () => {
  it('returns only token without user object', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { buildAuthResponse } = await import('./returnJwt');

      const response = buildAuthResponse(mockUser);

      expect(response).toEqual({ token: expect.any(String) });
      expect(response).not.toHaveProperty('user');
    });
  });

  it('includes username and optional alias in JWT payload', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { buildAuthResponse } = await import('./returnJwt');

      const response = buildAuthResponse(mockUser);
      const decoded = jwt.verify(response.token, TEST_ENV.JWT_SECRET) as jwt.JwtPayload;

      expect(decoded.username).toBe('alejandro');
      expect(decoded.alias).toBe('Ale');
    });
  });

  it('includes username only when alias is absent', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { buildAuthResponse } = await import('./returnJwt');

      const response = buildAuthResponse({
        username: 'alejandro',
        password: '1234',
      });
      const decoded = jwt.verify(response.token, TEST_ENV.JWT_SECRET) as jwt.JwtPayload;

      expect(decoded.username).toBe('alejandro');
      expect(decoded.alias).toBeUndefined();
    });
  });
});
