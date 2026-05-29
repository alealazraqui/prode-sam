import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
};

describe('verifyJwt', () => {
  it('returns payload for a valid token', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { createJwt } = await import('./createJwt');
      const { verifyJwt } = await import('./verifyJwt');

      const token = createJwt({ username: 'alejandro', alias: 'Ale' });

      expect(verifyJwt(token)).toEqual({ username: 'alejandro', alias: 'Ale' });
    });
  });

  it('returns payload with username only when alias is absent', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { createJwt } = await import('./createJwt');
      const { verifyJwt } = await import('./verifyJwt');

      const token = createJwt({ username: 'alejandro' });

      expect(verifyJwt(token)).toEqual({ username: 'alejandro' });
    });
  });

  it('throws UnauthorizedError for invalid token', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { verifyJwt } = await import('./verifyJwt');
      const { UnauthorizedError } = await import('@/shared/errors/UnauthorizedError');

      expect(() => verifyJwt('invalid-token')).toThrow(UnauthorizedError);
    });
  });

  it('throws UnauthorizedError when token is signed with another secret', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { verifyJwt } = await import('./verifyJwt');
      const { UnauthorizedError } = await import('@/shared/errors/UnauthorizedError');
      const token = jwt.sign({ username: 'alejandro' }, 'other-secret', { expiresIn: '180d' });

      expect(() => verifyJwt(token)).toThrow(UnauthorizedError);
    });
  });

  it('throws UnauthorizedError when username is empty', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { verifyJwt } = await import('./verifyJwt');
      const { UnauthorizedError } = await import('@/shared/errors/UnauthorizedError');
      const token = jwt.sign({ username: '' }, TEST_ENV.JWT_SECRET, { expiresIn: '180d' });

      expect(() => verifyJwt(token)).toThrow(UnauthorizedError);
    });
  });

  it('throws UnauthorizedError when username is missing from payload', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { verifyJwt } = await import('./verifyJwt');
      const { UnauthorizedError } = await import('@/shared/errors/UnauthorizedError');
      const token = jwt.sign({ alias: 'Ale' }, TEST_ENV.JWT_SECRET, { expiresIn: '180d' });

      expect(() => verifyJwt(token)).toThrow(UnauthorizedError);
    });
  });
});
