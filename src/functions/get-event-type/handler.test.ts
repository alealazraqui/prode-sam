import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { EventTypeResponse } from './types';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
  STEALERS_TABLE_NAME: 'Stealers',
  BLOCKED_VICTIMS_TABLE_NAME: 'BlockedVictims',
};

vi.mock('./getEventType', () => ({
  getEventType: vi.fn(),
}));

describe('get-event-type handler', () => {
  it('returns 200 with event type context on a common day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getEventType } = await import('./getEventType');
      const { handler } = await import('./handler');

      const eventTypeResponse: EventTypeResponse = {
        eventType: 'common',
        currentUserIsSteal: false,
        blockedUsernames: [],
      };
      vi.mocked(getEventType).mockResolvedValue(eventTypeResponse);

      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/event-type',
        authorizerContext: { username: 'alejandro' },
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual(eventTypeResponse);
      expect(getEventType).toHaveBeenCalledWith('alejandro');
    });
  });

  it('returns 200 with currentUserIsSteal true on a steal day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getEventType } = await import('./getEventType');
      const { handler } = await import('./handler');

      const eventTypeResponse: EventTypeResponse = {
        eventType: 'steal',
        currentUserIsSteal: true,
        blockedUsernames: ['blocked-user'],
      };
      vi.mocked(getEventType).mockResolvedValue(eventTypeResponse);

      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/event-type',
        authorizerContext: { username: 'alejandro' },
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual(eventTypeResponse);
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/event-type',
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
