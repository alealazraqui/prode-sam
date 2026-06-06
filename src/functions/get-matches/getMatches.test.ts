import { describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { MatchItem } from './types';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
};

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

const mockMatches: MatchItem[] = [
  {
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
  },
  {
    matchId: 'wc26-m002',
    homeTeamName: 'TBD',
    homeTeamCode: null,
    awayTeamName: 'Brasil',
    awayTeamCode: 'BR',
    homeGoals: 2,
    awayGoals: 1,
    kickoffAt: '2026-06-12T22:00:00.000Z',
    status: 2,
    isFirstRound: false,
  },
];

describe('getMatches', () => {
  it('returns mapped list with nested teams and camelCase API shape', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable).mockResolvedValue(mockMatches);

      const { getMatches } = await import('./getMatches');
      const result = await getMatches();

      expect(result).toEqual([
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
        {
          matchId: 'wc26-m002',
          homeTeam: { name: 'TBD', code: null },
          awayTeam: { name: 'Brasil', code: 'BR' },
          homeGoals: 2,
          awayGoals: 1,
          kickoffAt: '2026-06-12T22:00:00.000Z',
          status: 2,
          isFirstRound: false,
        },
      ]);
      expect(result.every((match) => !('homeTeamName' in match))).toBe(true);
    });
  });

  it('returns empty array when scan has no items', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(scanTable).mockResolvedValue([]);

      const { getMatches } = await import('./getMatches');
      const result = await getMatches();

      expect(result).toEqual([]);
    });
  });
});
