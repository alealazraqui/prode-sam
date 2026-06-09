import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  LINEUP_PICKS_TABLE_NAME: 'LineupPicks',
};

vi.mock('./getLineupPicks', () => ({
  getLineupPicks: vi.fn(),
}));

describe('get-lineup-picks handler', () => {
  it('returns 200 with segregated lineup picks for authenticated request', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { getLineupPicks } = await import('./getLineupPicks');
      vi.mocked(getLineupPicks).mockResolvedValue({
        allPastPicks: [
          {
            eventDay: '2026-06-04',
            username: 'other-user',
            alias: 'Other User',
            defensor: 'Def A',
            mediocampista: 'Mid A',
            delantero: 'Fwd A',
            points: 2,
          },
        ],
        myFuturePicks: [
          {
            eventDay: '2026-06-07',
            username: 'user1',
            alias: 'User One',
            defensor: 'Def B',
            mediocampista: 'Mid B',
            delantero: 'Fwd B',
            points: null,
          },
        ],
      });

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/lineup-picks',
        authorizerContext: { username: 'user1' },
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual({
        allPastPicks: [
          {
            eventDay: '2026-06-04',
            username: 'other-user',
            alias: 'Other User',
            defensor: 'Def A',
            mediocampista: 'Mid A',
            delantero: 'Fwd A',
            points: 2,
          },
        ],
        myFuturePicks: [
          {
            eventDay: '2026-06-07',
            username: 'user1',
            alias: 'User One',
            defensor: 'Def B',
            mediocampista: 'Mid B',
            delantero: 'Fwd B',
            points: null,
          },
        ],
      });
      expect(getLineupPicks).toHaveBeenCalledWith('user1');
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/lineup-picks',
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
