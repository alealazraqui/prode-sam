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

vi.mock('@/shared/dynamo/putItem', () => ({
  putItem: vi.fn(),
}));

describe('update-current-user handler', () => {
  it('returns 200 with updated alias only', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);
      vi.mocked(putItem).mockResolvedValue(undefined);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'PATCH',
        path: '/users/me',
        authorizerContext: { username: 'alejandro' },
        body: JSON.stringify({ alias: 'Nuevo' }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({
        username: 'alejandro',
        alias: 'Nuevo',
        score: 42,
      });
    });
  });

  it('returns 200 with updated password only', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);
      vi.mocked(putItem).mockResolvedValue(undefined);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'PATCH',
        path: '/users/me',
        authorizerContext: { username: 'alejandro' },
        body: JSON.stringify({ password: 'nueva' }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({
        username: 'alejandro',
        alias: 'Ale',
        score: 42,
      });
      expect(putItem).toHaveBeenCalledWith('Users', expect.objectContaining({ password: 'nueva' }));
    });
  });

  it('returns 200 when updating alias and password together', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { putItem } = await import('@/shared/dynamo/putItem');
      vi.mocked(getItem).mockResolvedValue(mockUser);
      vi.mocked(putItem).mockResolvedValue(undefined);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'PATCH',
        path: '/users/me',
        authorizerContext: { username: 'alejandro' },
        body: JSON.stringify({ alias: 'Nuevo', password: 'nueva' }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({
        username: 'alejandro',
        alias: 'Nuevo',
        score: 42,
      });
    });
  });

  it('returns 400 when body has no applicable fields', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'PATCH',
        path: '/users/me',
        authorizerContext: { username: 'alejandro' },
        body: JSON.stringify({ alias: '', password: '' }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(400);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'BAD_REQUEST',
        message: 'At least one of alias or password must be provided',
      });
    });
  });

  it('returns 400 when body only contains ignored username and name', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'PATCH',
        path: '/users/me',
        authorizerContext: { username: 'alejandro' },
        body: JSON.stringify({ username: 'other', name: 'Other' }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(400);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'BAD_REQUEST',
        message: 'At least one of alias or password must be provided',
      });
    });
  });

  it('returns 400 when body is invalid JSON', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'PATCH',
        path: '/users/me',
        authorizerContext: { username: 'alejandro' },
        body: 'not-json',
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(400);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'BAD_REQUEST',
        message: 'Invalid JSON body',
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
        method: 'PATCH',
        path: '/users/me',
        authorizerContext: { username: 'unknown' },
        body: JSON.stringify({ alias: 'Nuevo' }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(404);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'NOT_FOUND',
        message: 'Usuario no encontrado.',
      });
    });
  });
});
