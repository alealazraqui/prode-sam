import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { StealDayResponse } from './types';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
  STEALERS_TABLE_NAME: 'Stealers',
  BLOCKED_VICTIMS_TABLE_NAME: 'BlockedVictims',
};

vi.mock('./getStealDay', () => ({
  getStealDay: vi.fn(),
}));

describe('get-steal-day handler', () => {
  it('returns 200 with empty steal context on a common day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getStealDay } = await import('./getStealDay');
      const { handler } = await import('./handler');

      const stealDay: StealDayResponse = {
        eventType: 'common',
        stealers: [],
        blockedUsernames: [],
        currentUserIsSteal: false,
      };
      vi.mocked(getStealDay).mockResolvedValue(stealDay);

      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/steal-day',
        authorizerContext: { username: 'alejandro' },
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual(stealDay);
      expect(getStealDay).toHaveBeenCalledWith('alejandro');
    });
  });

  it('returns 200 with full steal context on a steal day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getStealDay } = await import('./getStealDay');
      const { handler } = await import('./handler');

      const stealDay: StealDayResponse = {
        eventType: 'steal',
        stealers: [{ stealerUsername: 'alejandro', matchId: 'match-1' }],
        blockedUsernames: ['blocked-user'],
        currentUserIsSteal: true,
      };
      vi.mocked(getStealDay).mockResolvedValue(stealDay);

      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/steal-day',
        authorizerContext: { username: 'alejandro' },
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual(stealDay);
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/steal-day',
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
