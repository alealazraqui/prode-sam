import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
};

vi.mock('./savePredictions', () => ({
  savePredictions: vi.fn(),
}));

describe('save-predictions handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 204 for a valid authenticated request', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { savePredictions } = await import('./savePredictions');
      vi.mocked(savePredictions).mockResolvedValue(undefined);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/predictions',
        authorizerContext: { username: 'user1' },
        body: JSON.stringify([{ matchId: 'wc26-m001', homeGoals: 1, awayGoals: 0 }]),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(204);
      expect(response.body).toBeUndefined();
      expect(savePredictions).toHaveBeenCalledWith('user1', [
        { matchId: 'wc26-m001', homeGoals: 1, awayGoals: 0 },
      ]);
    });
  });

  it('returns 400 when validation fails', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { BadRequestError } = await import('@/shared/errors/BadRequestError');
      const { savePredictions } = await import('./savePredictions');
      vi.mocked(savePredictions).mockRejectedValue(new BadRequestError('Invalid input'));
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/predictions',
        authorizerContext: { username: 'user1' },
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

  it('returns 409 when predictions are locked', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { ConflictError } = await import('@/shared/errors/ConflictError');
      const { savePredictions } = await import('./savePredictions');
      vi.mocked(savePredictions).mockRejectedValue(
        new ConflictError('Predictions locked for matches: wc26-m001'),
      );
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/predictions',
        authorizerContext: { username: 'user1' },
        body: JSON.stringify([{ matchId: 'wc26-m001', homeGoals: 1, awayGoals: 0 }]),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(409);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'CONFLICT',
        message: 'Predictions locked for matches: wc26-m001',
      });
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/predictions',
        body: JSON.stringify([{ matchId: 'wc26-m001', homeGoals: 1, awayGoals: 0 }]),
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
