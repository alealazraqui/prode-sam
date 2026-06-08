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
  STEALERS_TABLE_NAME: 'Stealers',
  BLOCKED_VICTIMS_TABLE_NAME: 'BlockedVictims',
  STEAL_PICKS_TABLE_NAME: 'StealPicks',
};

vi.mock('./processStealPick', () => ({
  processStealPick: vi.fn(),
}));

vi.mock('./deleteStealPick', () => ({
  deleteStealPick: vi.fn(),
}));

describe('steal-picks handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for a valid authenticated request', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { processStealPick } = await import('./processStealPick');
      vi.mocked(processStealPick).mockResolvedValue(undefined);
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/steal-picks',
        authorizerContext: { username: 'stealer.user' },
        body: JSON.stringify({
          calendarDate: '2026-06-07',
          victimUsername: 'victim.user',
          matchId: 'wc26-m010',
        }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({ ok: true });
      expect(processStealPick).toHaveBeenCalledWith('stealer.user', {
        calendarDate: '2026-06-07',
        victimUsername: 'victim.user',
        matchId: 'wc26-m010',
      });
    });
  });

  it('returns 409 when victim is blocked', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { ConflictError } = await import('@/shared/errors/ConflictError');
      const { processStealPick } = await import('./processStealPick');
      vi.mocked(processStealPick).mockRejectedValue(
        new ConflictError('Victim is blocked: victim.user'),
      );
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/steal-picks',
        authorizerContext: { username: 'stealer.user' },
        body: JSON.stringify({
          calendarDate: '2026-06-07',
          victimUsername: 'victim.user',
          matchId: 'wc26-m010',
        }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(409);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'CONFLICT',
        message: 'Victim is blocked: victim.user',
      });
    });
  });

  it('returns 400 when kickoff has passed', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { BadRequestError } = await import('@/shared/errors/BadRequestError');
      const { processStealPick } = await import('./processStealPick');
      vi.mocked(processStealPick).mockRejectedValue(
        new BadRequestError('Kickoff has passed for match wc26-m010'),
      );
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/steal-picks',
        authorizerContext: { username: 'stealer.user' },
        body: JSON.stringify({
          calendarDate: '2026-06-07',
          victimUsername: 'victim.user',
          matchId: 'wc26-m010',
        }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(400);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'BAD_REQUEST',
        message: 'Kickoff has passed for match wc26-m010',
      });
    });
  });

  it('returns 200 for DELETE and calls deleteStealPick for the authenticated user', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { deleteStealPick } = await import('./deleteStealPick');
      vi.mocked(deleteStealPick).mockResolvedValue(undefined);
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'DELETE',
        path: '/steal-picks',
        authorizerContext: { username: 'stealer.user' },
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({ ok: true });
      expect(deleteStealPick).toHaveBeenCalledWith('stealer.user');
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/steal-picks',
        body: JSON.stringify({
          calendarDate: '2026-06-07',
          victimUsername: 'victim.user',
          matchId: 'wc26-m010',
        }),
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
