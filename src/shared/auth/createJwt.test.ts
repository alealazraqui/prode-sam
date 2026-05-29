import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
};

describe('createJwt', () => {
  it('signs a token with username in payload', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { createJwt } = await import('./createJwt');

      const token = createJwt({ username: 'alejandro' });
      const decoded = jwt.verify(token, TEST_ENV.JWT_SECRET) as jwt.JwtPayload;

      expect(decoded.username).toBe('alejandro');
      expect(decoded.alias).toBeUndefined();
    });
  });

  it('includes optional alias in payload', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { createJwt } = await import('./createJwt');

      const token = createJwt({ username: 'alejandro', alias: 'Ale' });
      const decoded = jwt.verify(token, TEST_ENV.JWT_SECRET) as jwt.JwtPayload;

      expect(decoded.username).toBe('alejandro');
      expect(decoded.alias).toBe('Ale');
    });
  });

  it('expires in 180 days', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { createJwt } = await import('./createJwt');

      const token = createJwt({ username: 'alejandro' });
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded.exp! - decoded.iat!).toBe(180 * 24 * 60 * 60);
    });
  });
});
