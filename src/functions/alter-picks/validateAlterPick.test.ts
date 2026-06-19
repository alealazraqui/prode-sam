import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import { withTestEnv } from '@/shared/test/withTestEnv';
import type { AlterAssignmentItem } from '@/shared/types/alteration';
import type { AlterPickRequest } from './types';

const REQUEST: AlterPickRequest = {
  calendarDate: '2026-06-21',
  matchId: 'wc26-m010',
  victimUsername: 'victim.user',
  side: 'home',
  delta: 1,
};

const ASSIGNMENT: AlterAssignmentItem = {
  calendarDate: REQUEST.calendarDate,
  username: 'alterer.user',
  createdAt: '2026-06-19T21:47:36.754Z',
};

const FUTURE_MATCH: MatchItem = {
  matchId: REQUEST.matchId,
  homeTeamName: 'Home',
  homeTeamCode: 'HOM',
  awayTeamName: 'Away',
  awayTeamCode: 'AWY',
  homeGoals: null,
  awayGoals: null,
  kickoffAt: '2026-06-21T21:00:00.000Z',
  status: 1,
  isFirstRound: true,
};

vi.mock('@/shared/dynamo/getItem', () => ({
  getItem: vi.fn(),
}));

describe('validateAlterPick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-21T15:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when caller tries to alter themselves', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { validateAlterPick } = await import('./validateAlterPick');

      await expect(
        validateAlterPick('alterer.user', {
          ...REQUEST,
          victimUsername: 'alterer.user',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Cannot alter yourself',
      });
    });
  });

  it('throws when calendarDate is not today in Argentina', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { validateAlterPick } = await import('./validateAlterPick');

      await expect(
        validateAlterPick('alterer.user', {
          ...REQUEST,
          calendarDate: '2026-06-22',
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Alterations are only allowed for today',
      });
    });
  });

  it('throws without revealing future assignment when caller is not assigned today', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateAlterPick } = await import('./validateAlterPick');

      vi.mocked(getItem).mockResolvedValue(null);

      await expect(validateAlterPick('alterer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Alteration is not available today',
      });

      expect(getItem).toHaveBeenCalledWith('AlterAssignments', {
        calendarDate: REQUEST.calendarDate,
        username: 'alterer.user',
      });
    });
  });

  it('throws when matchId is unknown', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateAlterPick } = await import('./validateAlterPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'AlterAssignments') return ASSIGNMENT;
        return null;
      });

      await expect(validateAlterPick('alterer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Unknown matchId: wc26-m010',
      });
    });
  });

  it('throws when match does not belong to the requested calendarDate in Argentina', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateAlterPick } = await import('./validateAlterPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'AlterAssignments') return ASSIGNMENT;
        if (tableName === 'Matches') {
          return {
            ...FUTURE_MATCH,
            kickoffAt: '2026-06-22T21:00:00.000Z',
          };
        }
        return null;
      });

      await expect(validateAlterPick('alterer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Match wc26-m010 does not belong to calendar date 2026-06-21',
      });
    });
  });

  it('throws when kickoff has passed', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateAlterPick } = await import('./validateAlterPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'AlterAssignments') return ASSIGNMENT;
        if (tableName === 'Matches') {
          return {
            ...FUTURE_MATCH,
            kickoffAt: '2026-06-21T12:00:00.000Z',
          };
        }
        return null;
      });

      await expect(validateAlterPick('alterer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Kickoff has passed for match wc26-m010',
      });
    });
  });

  it('throws when match is finalized', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateAlterPick } = await import('./validateAlterPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'AlterAssignments') return ASSIGNMENT;
        if (tableName === 'Matches') {
          return {
            ...FUTURE_MATCH,
            status: 2,
          };
        }
        return null;
      });

      await expect(validateAlterPick('alterer.user', REQUEST)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Match wc26-m010 is finalized',
      });
    });
  });

  it('does not throw when all validations pass', async () => {
    await withTestEnv({}, async () => {
      vi.resetModules();
      const { getItem } = await import('@/shared/dynamo/getItem');
      const { validateAlterPick } = await import('./validateAlterPick');

      vi.mocked(getItem).mockImplementation(async (tableName) => {
        if (tableName === 'AlterAssignments') return ASSIGNMENT;
        if (tableName === 'Matches') return FUTURE_MATCH;
        return null;
      });

      await expect(validateAlterPick('alterer.user', REQUEST)).resolves.toBeUndefined();
    });
  });
});
