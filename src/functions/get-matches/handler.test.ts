import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseHttpResponseBody } from '@/shared/test/parseHttpResponseBody';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { MatchItem } from './types';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
};

const mockMatch: MatchItem = {
  matchId: 'wc26-m001',
  homeTeamName: 'Argentina',
  homeTeamCode: 'AR',
  awayTeamName: 'Canadá',
  awayTeamCode: 'CA',
  homeGoals: null,
  awayGoals: null,
  kickoffAt: '2026-06-11T19:00:00.000Z',
  status: 1,
  isFirstRound: true,
};

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

describe('get-matches handler', () => {
  it('returns 200 with mapped matches for authenticated request', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable).mockResolvedValue([mockMatch]);

      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/matches',
        authorizerContext: { username: 'alejandro' },
      });

      const response = (await handler(event)) as APIGatewayProxyStructuredResultV2;

      expect(response.statusCode).toBe(200);
      expect(parseHttpResponseBody(response.body)).toEqual([
        {
          matchId: 'wc26-m001',
          homeTeam: { name: 'Argentina', code: 'AR' },
          awayTeam: { name: 'Canadá', code: 'CA' },
          homeGoals: null,
          awayGoals: null,
          kickoffAt: '2026-06-11T19:00:00.000Z',
          status: 1,
          isFirstRound: true,
        },
      ]);
    });
  });

  it('returns 401 when authorizer context has no username', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { handler } = await import('./handler');
      const event = mockApiGatewayEvent({
        method: 'GET',
        path: '/matches',
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
