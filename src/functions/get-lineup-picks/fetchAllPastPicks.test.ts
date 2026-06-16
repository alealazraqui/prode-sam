import { describe, expect, it, vi } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { LineupPickItem } from '@/shared/types/lineupPickItem';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  LINEUP_PICKS_TABLE_NAME: 'LineupPicks',
};

const TODAY = '2026-06-05';
const BEFORE_KICKOFF = new Date('2026-06-05T10:00:00.000Z');
const AFTER_KICKOFF = new Date('2026-06-05T18:00:00.000Z');

const pastPickUser1: LineupPickItem = {
  eventDay: '2026-06-04',
  username: 'user1',
  alias: 'user1',
  defensor: 'Def A',
  mediocampista: 'Mid A',
  delantero: 'Fwd A',
  points: 5,
};

const pastPickUser2: LineupPickItem = {
  eventDay: '2026-06-03',
  username: 'other-user',
  alias: 'other-user',
  defensor: 'Def B',
  mediocampista: 'Mid B',
  delantero: 'Fwd B',
  points: null,
};

const todayPickUser1: LineupPickItem = {
  eventDay: TODAY,
  username: 'user1',
  alias: 'user1',
  defensor: 'Def C',
  mediocampista: 'Mid C',
  delantero: 'Fwd C',
  points: null,
};

const futurePickUser2: LineupPickItem = {
  eventDay: '2026-06-07',
  username: 'other-user',
  alias: 'other-user',
  defensor: 'Def D',
  mediocampista: 'Mid D',
  delantero: 'Fwd D',
  points: null,
};

const todayMatch: MatchItem = {
  matchId: 'wc26-m001',
  homeTeamName: 'Home',
  homeTeamCode: 'HOM',
  awayTeamName: 'Away',
  awayTeamCode: 'AWY',
  homeGoals: null,
  awayGoals: null,
  kickoffAt: '2026-06-05T15:00:00.000Z',
  status: 1,
  isFirstRound: true,
};

vi.mock('@/shared/dynamo/scanTable', () => ({
  scanTable: vi.fn(),
}));

vi.mock('@/functions/get-event-type/getArgentinaTodayDateString', () => ({
  getArgentinaTodayDateString: vi.fn(() => TODAY),
}));

vi.mock('@/functions/save-lineup-pick/fetchMatchesForEventDay', () => ({
  fetchMatchesForEventDay: vi.fn(),
}));

describe('fetchAllPastPicks', () => {
  it('returns past days and excludes today before the first kickoff', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { fetchMatchesForEventDay } =
        await import('@/functions/save-lineup-pick/fetchMatchesForEventDay');
      vi.mocked(scanTable).mockResolvedValue([
        pastPickUser1,
        pastPickUser2,
        todayPickUser1,
        futurePickUser2,
      ]);
      vi.mocked(fetchMatchesForEventDay).mockResolvedValue([todayMatch]);

      const { fetchAllPastPicks } = await import('./fetchAllPastPicks');
      const result = await fetchAllPastPicks(BEFORE_KICKOFF);

      expect(fetchMatchesForEventDay).toHaveBeenCalledWith(TODAY);
      expect(result).toEqual([pastPickUser1, pastPickUser2]);
    });
  });

  it('includes today after the first kickoff', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { fetchMatchesForEventDay } =
        await import('@/functions/save-lineup-pick/fetchMatchesForEventDay');
      vi.mocked(scanTable).mockResolvedValue([
        pastPickUser1,
        pastPickUser2,
        todayPickUser1,
        futurePickUser2,
      ]);
      vi.mocked(fetchMatchesForEventDay).mockResolvedValue([todayMatch]);

      const { fetchAllPastPicks } = await import('./fetchAllPastPicks');
      const result = await fetchAllPastPicks(AFTER_KICKOFF);

      expect(result).toEqual([pastPickUser1, pastPickUser2, todayPickUser1]);
    });
  });

  it('excludes today when there are no matches on the calendar day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { fetchMatchesForEventDay } =
        await import('@/functions/save-lineup-pick/fetchMatchesForEventDay');
      vi.mocked(scanTable).mockResolvedValue([todayPickUser1, futurePickUser2]);
      vi.mocked(fetchMatchesForEventDay).mockResolvedValue([]);

      const { fetchAllPastPicks } = await import('./fetchAllPastPicks');
      const result = await fetchAllPastPicks(AFTER_KICKOFF);

      expect(result).toEqual([]);
    });
  });

  it('returns empty array when every pick is from a future day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { scanTable } = await import('@/shared/dynamo/scanTable');
      const { fetchMatchesForEventDay } =
        await import('@/functions/save-lineup-pick/fetchMatchesForEventDay');
      vi.mocked(scanTable).mockResolvedValue([futurePickUser2]);
      vi.mocked(fetchMatchesForEventDay).mockResolvedValue([]);

      const { fetchAllPastPicks } = await import('./fetchAllPastPicks');
      const result = await fetchAllPastPicks(AFTER_KICKOFF);

      expect(result).toEqual([]);
    });
  });
});
