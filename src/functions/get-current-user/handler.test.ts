import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { UserItem } from '@/functions/login/types';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
};

const mockUser: UserItem = {
  username: 'alejandro',
  alias: 'Ale',
  password: '1234',
  score: 42,
};

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

describe('get-current-user handler', () => {
  it('returns 200 with current user shape for authenticated username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/users/me',
        authorizerContext: { username: 'alejandro' },
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({
        id: 'alejandro',
        name: 'alejandro',
        alias: 'Ale',
        score: 42,
      });
    });
  });

  it('returns 404 when user is not found in DynamoDB', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(null);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/users/me',
        authorizerContext: { username: 'unknown' },
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(404);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'NOT_FOUND',
        message: 'Usuario no encontrado.',
      });
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/users/me',
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(401);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      });
    });
  });
});
