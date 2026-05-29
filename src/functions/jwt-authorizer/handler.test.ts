import type { APIGatewayRequestAuthorizerEventV2 } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
};

vi.mock('@/shared/auth/verifyJwt', () => ({
  verifyJwt: vi.fn(),
}));

function mockAuthorizerEvent(authorizationHeader?: string): APIGatewayRequestAuthorizerEventV2 {
  return {
    version: '2.0',
    type: 'REQUEST',
    routeArn: 'arn:aws:execute-api:us-east-1:123456789012:test-api/$default/GET/matches',
    identitySource: authorizationHeader ? [authorizationHeader] : [],
    routeKey: 'GET /matches',
    rawPath: '/matches',
    rawQueryString: '',
    cookies: [],
    headers: authorizationHeader ? { authorization: authorizationHeader } : {},
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      domainName: 'test.example.com',
      domainPrefix: 'test',
      http: {
        method: 'GET',
        path: '/matches',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'test-request-id',
      routeKey: 'GET /matches',
      stage: '$default',
      time: '01/Jan/2024:00:00:00 +0000',
      timeEpoch: 1_704_067_200_000,
    },
  };
}

describe('jwt-authorizer handler', () => {
  it('returns isAuthorized true for valid Bearer token', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { verifyJwt } = await import('@/shared/auth/verifyJwt');
      vi.mocked(verifyJwt).mockReturnValue({ username: 'alejandro', alias: 'Ale' });

      const { handler } = await import('./handler');
      const result = await handler(mockAuthorizerEvent('Bearer valid-token'));

      expect(verifyJwt).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual({
        isAuthorized: true,
        context: {
          username: 'alejandro',
          alias: 'Ale',
        },
      });
    });
  });

  it('returns isAuthorized false when Authorization header is missing', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');

      const result = await handler(mockAuthorizerEvent());

      expect(result).toEqual({ isAuthorized: false });
    });
  });

  it('returns isAuthorized false when token format is invalid', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');

      const result = await handler(mockAuthorizerEvent('Token invalid'));

      expect(result).toEqual({ isAuthorized: false });
    });
  });

  it('returns isAuthorized false when verifyJwt throws', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { verifyJwt } = await import('@/shared/auth/verifyJwt');
      vi.mocked(verifyJwt).mockImplementation(() => {
        throw new UnauthorizedError();
      });

      const { handler } = await import('./handler');
      const result = await handler(mockAuthorizerEvent('Bearer invalid-token'));

      expect(result).toEqual({ isAuthorized: false });
    });
  });
});
