import { describe, expect, it, vi } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { AlterPickItem } from '@/shared/types/alteration';
import type { PredictionItem } from '@/shared/types/predictionItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
};

vi.mock('./fetchMyPredictions', () => ({
  fetchMyPredictions: vi.fn(),
}));

vi.mock('./fetchOthersPredictions', () => ({
  fetchOthersPredictions: vi.fn(),
}));

vi.mock('./fetchMyStealPick', () => ({
  fetchMyStealPick: vi.fn(),
}));

vi.mock('./fetchPastStealPicks', () => ({
  fetchPastStealPicks: vi.fn(),
}));

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

const mockUsers = [
  { username: 'user1', alias: 'User One', password: 'hash' },
  { username: 'other-user', password: 'hash' },
  { username: 'victim-user', alias: 'Victim', password: 'hash' },
];

function mockScanTables(
  scanTable: <TItem>(tableName: string) => Promise<TItem[]>,
  options: {
    users?: typeof mockUsers;
    alterPicks?: AlterPickItem[];
    matches?: MatchItem[];
  } = {},
): void {
  vi.mocked(scanTable).mockImplementation(async <TItem>(tableName: string) => {
    if (tableName === 'Users') return (options.users ?? mockUsers) as TItem[];
    if (tableName === 'AlterPicks') return (options.alterPicks ?? []) as TItem[];
    if (tableName === 'Matches') return (options.matches ?? []) as TItem[];
    return [] as TItem[];
  });
}

const ownFutureKickoff: PredictionItem = {
  username: 'user1',
  matchId: 'wc26-m002',
  homeGoals: 1,
  awayGoals: 1,
  updatedAt: '2026-06-05T12:00:00.000Z',
  kickoffAt: '2099-01-01T00:00:00.000Z',
};

const ownPastKickoff: PredictionItem = {
  username: 'user1',
  matchId: 'wc26-m001',
  homeGoals: 2,
  awayGoals: 0,
  updatedAt: '2026-06-05T12:00:00.000Z',
  kickoffAt: '2020-01-01T00:00:00.000Z',
  pointsCommon: 3,
};

const otherPastKickoff: PredictionItem = {
  username: 'other-user',
  matchId: 'wc26-m001',
  homeGoals: 1,
  awayGoals: 1,
  updatedAt: '2026-06-05T12:00:00.000Z',
  kickoffAt: '2020-01-01T00:00:00.000Z',
};

const otherWithoutPoints: PredictionItem = {
  username: 'other-user',
  matchId: 'wc26-m003',
  homeGoals: 0,
  awayGoals: 0,
  updatedAt: '2026-06-05T12:00:00.000Z',
  kickoffAt: '2020-01-01T00:00:00.000Z',
};

const victimPrediction: PredictionItem = {
  username: 'victim-user',
  matchId: 'wc26-m010',
  homeGoals: 0,
  awayGoals: 1,
  updatedAt: '2026-06-21T12:00:00.000Z',
  kickoffAt: '2026-06-21T18:00:00.000Z',
};

const alterPick: AlterPickItem = {
  altererUsername: 'user1',
  victimUsername: 'victim-user',
  calendarDate: '2026-06-21',
  matchId: 'wc26-m010',
  side: 'home',
  delta: 1,
  createdAt: '2026-06-21T12:30:00.000Z',
};

const futureAlterMatch: MatchItem = {
  matchId: 'wc26-m010',
  homeTeamName: 'Argentina',
  homeTeamCode: 'ARG',
  awayTeamName: 'Brasil',
  awayTeamCode: 'BRA',
  homeGoals: null,
  awayGoals: null,
  kickoffAt: '2030-06-21T18:00:00.000Z',
  status: 1,
  isFirstRound: true,
};

const startedAlterMatch: MatchItem = {
  ...futureAlterMatch,
  kickoffAt: '2020-06-21T18:00:00.000Z',
};

const finishedAlterMatch: MatchItem = {
  ...startedAlterMatch,
  homeGoals: 1,
  awayGoals: 1,
  status: 2,
};

describe('getPredictions', () => {
  it('returns all own predictions in myPredictions regardless of kickoffAt', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(fetchMyPredictions).mockResolvedValue([ownFutureKickoff, ownPastKickoff]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      mockScanTables(scanTable);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.myStealPick).toBeNull();
      expect(result.allStealPicks).toEqual([]);
      expect(result.myPredictions).toEqual([
        {
          username: 'user1',
          alias: 'User One',
          matchId: 'wc26-m002',
          homeGoals: 1,
          awayGoals: 1,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: null,
        },
        {
          username: 'user1',
          alias: 'User One',
          matchId: 'wc26-m001',
          homeGoals: 2,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: 3,
        },
      ]);
    });
  });

  it('excludes other users predictions with future kickoff from allPredictions', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(fetchMyPredictions).mockResolvedValue([ownPastKickoff]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      mockScanTables(scanTable);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.allPredictions).toEqual([
        {
          username: 'user1',
          alias: 'User One',
          matchId: 'wc26-m001',
          homeGoals: 2,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: 3,
        },
      ]);
    });
  });

  it('includes other users predictions with past kickoff in allPredictions', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(fetchMyPredictions).mockResolvedValue([ownPastKickoff]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([otherPastKickoff]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      mockScanTables(scanTable);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.allPredictions).toEqual([
        {
          username: 'user1',
          alias: 'User One',
          matchId: 'wc26-m001',
          homeGoals: 2,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: 3,
        },
        {
          username: 'other-user',
          alias: 'other-user',
          matchId: 'wc26-m001',
          homeGoals: 1,
          awayGoals: 1,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: null,
        },
      ]);
    });
  });

  it('maps pointsCommon as null when absent and numeric when present', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      vi.mocked(fetchMyPredictions).mockResolvedValue([]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([ownPastKickoff, otherWithoutPoints]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      mockScanTables(scanTable);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.allPredictions).toEqual([
        {
          username: 'user1',
          alias: 'User One',
          matchId: 'wc26-m001',
          homeGoals: 2,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: 3,
        },
        {
          username: 'other-user',
          alias: 'other-user',
          matchId: 'wc26-m003',
          homeGoals: 0,
          awayGoals: 0,
          updatedAt: '2026-06-05T12:00:00.000Z',
          pointsCommon: null,
        },
      ]);
    });
  });

  it('returns myStealPick and allStealPicks alongside predictions', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');

      const myStealPick = {
        calendarDate: '2026-06-07',
        stealerUsername: 'user1',
        victimUsername: 'other-user',
        matchId: 'wc26-m003',
        stolenPoints: 0,
      };
      const allStealPicks = [
        {
          calendarDate: '2026-06-05',
          stealerUsername: 'other-user',
          victimUsername: 'user1',
          matchId: 'wc26-m001',
          stolenPoints: 0,
        },
      ];

      vi.mocked(fetchMyPredictions).mockResolvedValue([]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(myStealPick);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: allStealPicks,
        activeStealMatchIds: [],
      });
      mockScanTables(scanTable);

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.myStealPick).toEqual(myStealPick);
      expect(result.allStealPicks).toEqual(allStealPicks);
      expect(result.activeStealMatchIds).toEqual([]);
      expect(result.myAlterPick).toBeNull();
      expect(result.allAlterPicks).toEqual([]);
    });
  });

  it('returns myAlterPick for the actor before kickoff without exposing it publicly', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');

      vi.mocked(fetchMyPredictions).mockResolvedValue([]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      mockScanTables(scanTable, {
        alterPicks: [alterPick],
        matches: [futureAlterMatch],
      });

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('user1');

      expect(result.myAlterPick).toEqual({
        altererUsername: 'user1',
        victimUsername: 'victim-user',
        calendarDate: '2026-06-21',
        matchId: 'wc26-m010',
        side: 'home',
        delta: 1,
      });
      expect(result.allAlterPicks).toEqual([]);
    });
  });

  it('reveals public alter picks from kickoff without side or delta', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');

      vi.mocked(fetchMyPredictions).mockResolvedValue([]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([victimPrediction]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      mockScanTables(scanTable, {
        alterPicks: [alterPick],
        matches: [startedAlterMatch],
      });

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('other-user');

      expect(result.myAlterPick).toBeNull();
      expect(result.allAlterPicks).toEqual([
        {
          altererUsername: 'user1',
          victimUsername: 'victim-user',
          calendarDate: '2026-06-21',
          matchId: 'wc26-m010',
        },
      ]);
      expect(result.allAlterPicks[0]).not.toHaveProperty('side');
      expect(result.allAlterPicks[0]).not.toHaveProperty('delta');
    });
  });

  it('reveals alteration details and effective points when the match is finalized', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { fetchMyPredictions } = await import('./fetchMyPredictions');
      const { fetchOthersPredictions } = await import('./fetchOthersPredictions');
      const { fetchMyStealPick } = await import('./fetchMyStealPick');
      const { fetchPastStealPicks } = await import('./fetchPastStealPicks');
      const { scanTable } = await import('@/shared/dynamo/scanTable');

      vi.mocked(fetchMyPredictions).mockResolvedValue([]);
      vi.mocked(fetchOthersPredictions).mockResolvedValue([victimPrediction]);
      vi.mocked(fetchMyStealPick).mockResolvedValue(null);
      vi.mocked(fetchPastStealPicks).mockResolvedValue({
        pastStealPicks: [],
        activeStealMatchIds: [],
      });
      mockScanTables(scanTable, {
        alterPicks: [alterPick],
        matches: [finishedAlterMatch],
      });

      const { getPredictions } = await import('./getPredictions');
      const result = await getPredictions('other-user');

      expect(result.allAlterPicks).toEqual([
        {
          altererUsername: 'user1',
          victimUsername: 'victim-user',
          calendarDate: '2026-06-21',
          matchId: 'wc26-m010',
          side: 'home',
          delta: 1,
          predictionOriginal: {
            homeGoals: 0,
            awayGoals: 1,
          },
          predictionEffective: {
            homeGoals: 1,
            awayGoals: 1,
          },
          pointsCommon: 3,
        },
      ]);
    });
  });
});
