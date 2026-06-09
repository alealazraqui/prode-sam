import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  LINEUP_PICKS_TABLE_NAME: 'LineupPicks',
};

vi.mock('./saveLineupPick', () => ({
  saveLineupPick: vi.fn(),
}));

describe('save-lineup-pick handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for a valid authenticated request', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { saveLineupPick } = await import('./saveLineupPick');
      vi.mocked(saveLineupPick).mockResolvedValue(undefined);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/lineup-picks',
        authorizerContext: { username: 'user1' },
        body: JSON.stringify({
          eventDay: '2026-06-15',
          defensor: 'Def A',
          mediocampista: 'Mid B',
          delantero: 'Fwd C',
        }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({});
      expect(saveLineupPick).toHaveBeenCalledWith('user1', {
        eventDay: '2026-06-15',
        defensor: 'Def A',
        mediocampista: 'Mid B',
        delantero: 'Fwd C',
      });
    });
  });

  it('returns 400 when validation fails', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { BadRequestError } = await import('@/shared/errors/BadRequestError');
      const { saveLineupPick } = await import('./saveLineupPick');
      vi.mocked(saveLineupPick).mockRejectedValue(new BadRequestError('Invalid input'));
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/lineup-picks',
        authorizerContext: { username: 'user1' },
        body: JSON.stringify({}),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(400);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'BAD_REQUEST',
        message: 'Invalid input',
      });
    });
  });

  it('returns 409 when lineup picks are locked', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { ConflictError } = await import('@/shared/errors/ConflictError');
      const { saveLineupPick } = await import('./saveLineupPick');
      vi.mocked(saveLineupPick).mockRejectedValue(
        new ConflictError('Lineup picks locked for event day: 2026-06-05'),
      );
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/lineup-picks',
        authorizerContext: { username: 'user1' },
        body: JSON.stringify({
          eventDay: '2026-06-05',
          defensor: 'Def A',
          mediocampista: 'Mid B',
          delantero: 'Fwd C',
        }),
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(409);
      expect(parseHttpResponseBody(response.body)).toEqual({
        code: 'CONFLICT',
        message: 'Lineup picks locked for event day: 2026-06-05',
      });
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'POST',
        path: '/lineup-picks',
        body: JSON.stringify({
          eventDay: '2026-06-15',
          defensor: 'Def A',
          mediocampista: 'Mid B',
          delantero: 'Fwd C',
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
