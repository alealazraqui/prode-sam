import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
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

vi.mock('./getPredictions', () => ({
  getPredictions: vi.fn(),
}));

describe('get-predictions handler', () => {
  it('returns 200 with predictions for authenticated request', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getPredictions } = await import('./getPredictions');
      vi.mocked(getPredictions).mockResolvedValue({
        myPredictions: [
          {
            username: 'user1',
            alias: 'User One',
            matchId: 'wc26-m001',
            homeGoals: 2,
            awayGoals: 1,
            updatedAt: '2026-06-05T12:00:00.000Z',
            pointsCommon: null,
          },
        ],
        allPredictions: [
          {
            username: 'user1',
            alias: 'User One',
            matchId: 'wc26-m001',
            homeGoals: 2,
            awayGoals: 1,
            updatedAt: '2026-06-05T12:00:00.000Z',
            pointsCommon: null,
          },
        ],
        myStealPick: {
          calendarDate: '2026-06-07',
          stealerUsername: 'user1',
          victimUsername: 'other-user',
          matchId: 'wc26-m003',
          stolenPoints: 0,
        },
        allStealPicks: [],
      });

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/predictions',
        authorizerContext: { username: 'user1' },
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({
        myPredictions: [
          {
            username: 'user1',
            alias: 'User One',
            matchId: 'wc26-m001',
            homeGoals: 2,
            awayGoals: 1,
            updatedAt: '2026-06-05T12:00:00.000Z',
            pointsCommon: null,
          },
        ],
        allPredictions: [
          {
            username: 'user1',
            alias: 'User One',
            matchId: 'wc26-m001',
            homeGoals: 2,
            awayGoals: 1,
            updatedAt: '2026-06-05T12:00:00.000Z',
            pointsCommon: null,
          },
        ],
        myStealPick: {
          calendarDate: '2026-06-07',
          stealerUsername: 'user1',
          victimUsername: 'other-user',
          matchId: 'wc26-m003',
          stolenPoints: 0,
        },
        allStealPicks: [],
      });
      expect(getPredictions).toHaveBeenCalledWith('user1');
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/predictions',
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
