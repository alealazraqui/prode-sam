import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { UserItem } from './types';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
};

const mockUser: UserItem = {
  username: 'alejandro',
  alias: 'Ale',
  password: '1234',
};

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

describe('login handler', () => {
  it('returns 200 with token for valid credentials', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        path: '/auth/login',
        body: JSON.stringify({ username: 'alejandro', password: '1234' }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      const body = parseHttpResponseBody<{ token: string }>(response.body);
      expect(body.token).toEqual(expect.any(String));
      expect(body).not.toHaveProperty('user');
    });
  });

  it('returns 401 with generic message for invalid credentials', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      vi.mocked(getItem).mockResolvedValue(null);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        path: '/auth/login',
        body: JSON.stringify({ username: 'unknown', password: '1234' }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(401);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'UNAUTHORIZED',
        message: 'Usuario o contraseña inválidos.',
      });
    });
  });

  it('returns 400 when request body is missing', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        path: '/auth/login',
        body: null,
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(400);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'BAD_REQUEST',
        message: 'Request body is required',
      });
    });
  });

  it('returns 400 when username or password is empty', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        path: '/auth/login',
        body: JSON.stringify({ username: '', password: '1234' }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(400);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'BAD_REQUEST',
        message: 'username and password are required',
      });
    });
  });
});
