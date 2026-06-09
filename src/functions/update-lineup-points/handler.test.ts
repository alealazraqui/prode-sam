import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  LINEUP_PICKS_TABLE_NAME: 'LineupPicks',
};

vi.mock('./updateLineupPoints', () => ({
  updateLineupPoints: vi.fn(),
}));

describe('update-lineup-points handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for a valid authenticated PATCH request', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { updateLineupPoints } = await import('./updateLineupPoints');
      vi.mocked(updateLineupPoints).mockResolvedValue(undefined);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'PATCH',
        path: '/lineup-picks/points',
        authorizerContext: { username: 'admin-user' },
        body: JSON.stringify([
          { eventDay: '2026-06-15', username: 'user1', points: 3 },
          { eventDay: '2026-06-15', username: 'user2', points: 6 },
        ]),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({});
      expect(updateLineupPoints).toHaveBeenCalledWith([
        { eventDay: '2026-06-15', username: 'user1', points: 3 },
        { eventDay: '2026-06-15', username: 'user2', points: 6 },
      ]);
    });
  });

  it('returns 400 when validation fails', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { BadRequestError } = await import('@/shared/errors/BadRequestError');
      const { updateLineupPoints } = await import('./updateLineupPoints');
      vi.mocked(updateLineupPoints).mockRejectedValue(new BadRequestError('Invalid input'));
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'PATCH',
        path: '/lineup-picks/points',
        authorizerContext: { username: 'admin-user' },
        body: JSON.stringify([]),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(400);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'BAD_REQUEST',
        message: 'Invalid input',
      });
    });
  });

  it('returns 404 when a lineup pick does not exist', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { NotFoundError } = await import('@/shared/errors/NotFoundError');
      const { updateLineupPoints } = await import('./updateLineupPoints');
      vi.mocked(updateLineupPoints).mockRejectedValue(
        new NotFoundError('Lineup pick not found for eventDay=2026-06-15, username=missing-user'),
      );
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'PATCH',
        path: '/lineup-picks/points',
        authorizerContext: { username: 'admin-user' },
        body: JSON.stringify([{ eventDay: '2026-06-15', username: 'missing-user', points: 3 }]),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(404);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'NOT_FOUND',
        message: 'Lineup pick not found for eventDay=2026-06-15, username=missing-user',
      });
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'PATCH',
        path: '/lineup-picks/points',
        body: JSON.stringify([{ eventDay: '2026-06-15', username: 'user1', points: 3 }]),
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
