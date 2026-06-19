import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';
import { withTestEnv } from '@/shared/test/withTestEnv';

vi.mock('./confirmAlterPick', () => ({
  confirmAlterPick: vi.fn(),
}));

describe('alter-picks handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for a valid authenticated request', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { confirmAlterPick } = await import('./confirmAlterPick');
      vi.mocked(confirmAlterPick).mockResolvedValue(undefined);
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/alter-picks',
        authorizerContext: { username: 'alterer.user' },
        body: JSON.stringify({
          calendarDate: '2026-06-21',
          matchId: 'wc26-m010',
          victimUsername: 'victim.user',
          side: 'home',
          delta: 1,
        }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({ ok: true });
      expect(confirmAlterPick).toHaveBeenCalledWith('alterer.user', {
        calendarDate: '2026-06-21',
        matchId: 'wc26-m010',
        victimUsername: 'victim.user',
        side: 'home',
        delta: 1,
      });
    });
  });

  it('returns 400 when body format is invalid', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { confirmAlterPick } = await import('./confirmAlterPick');
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/alter-picks',
        authorizerContext: { username: 'alterer.user' },
        body: JSON.stringify({
          calendarDate: '2026-06-21',
          matchId: 'wc26-m010',
          victimUsername: 'victim.user',
          side: 'draw',
          delta: 1,
        }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(400);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'BAD_REQUEST',
        message: 'side must be home or away',
      });
      expect(confirmAlterPick).not.toHaveBeenCalled();
    });
  });

  it('returns 409 when the alteration cannot be confirmed', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { ConflictError } = await import('@/shared/errors/ConflictError');
      const { confirmAlterPick } = await import('./confirmAlterPick');
      vi.mocked(confirmAlterPick).mockRejectedValue(
        new ConflictError('Alteration cannot be confirmed'),
      );
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/alter-picks',
        authorizerContext: { username: 'alterer.user' },
        body: JSON.stringify({
          calendarDate: '2026-06-21',
          matchId: 'wc26-m010',
          victimUsername: 'victim.user',
          side: 'home',
          delta: 1,
        }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(409);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'CONFLICT',
        message: 'Alteration cannot be confirmed',
      });
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');

      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/alter-picks',
        body: JSON.stringify({
          calendarDate: '2026-06-21',
          matchId: 'wc26-m010',
          victimUsername: 'victim.user',
          side: 'home',
          delta: 1,
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
