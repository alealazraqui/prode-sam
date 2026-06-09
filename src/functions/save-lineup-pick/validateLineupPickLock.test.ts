import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
};

const FIXED_NOW = new Date('2026-06-07T15:00:00.000Z');

function buildMatch(matchId: string, kickoffAt: string): MatchItem {
  return {
    matchId,
    homeTeamName: 'Home',
    homeTeamCode: 'HOM',
    awayTeamName: 'Away',
    awayTeamCode: 'AWY',
    homeGoals: null,
    awayGoals: null,
    kickoffAt,
    status: 1,
    isFirstRound: true,
  };
}

describe('validateLineupPickLock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows a future event day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { validateLineupPickLock } = await import('./validateLineupPickLock');

      expect(() => validateLineupPickLock('2026-06-10', [], FIXED_NOW)).not.toThrow();
    });
  });

  it('rejects a past event day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { validateLineupPickLock } = await import('./validateLineupPickLock');

      expect(() => validateLineupPickLock('2026-06-06', [], FIXED_NOW)).toThrow(
        expect.objectContaining({
          statusCode: 409,
          code: 'CONFLICT',
          message: 'Lineup picks locked for event day: 2026-06-06',
        }),
      );
    });
  });

  it('allows today before the first kickoff', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { validateLineupPickLock } = await import('./validateLineupPickLock');
      const dayMatches = [buildMatch('wc26-m001', '2026-06-07T21:00:00.000Z')];

      expect(() => validateLineupPickLock('2026-06-07', dayMatches, FIXED_NOW)).not.toThrow();
    });
  });

  it('rejects today after the first kickoff', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { validateLineupPickLock } = await import('./validateLineupPickLock');
      const dayMatches = [buildMatch('wc26-m001', '2026-06-07T12:00:00.000Z')];

      expect(() => validateLineupPickLock('2026-06-07', dayMatches, FIXED_NOW)).toThrow(
        expect.objectContaining({
          statusCode: 409,
          code: 'CONFLICT',
          message: 'Lineup picks locked for event day: 2026-06-07',
        }),
      );
    });
  });

  it('uses the earliest kickoff when multiple matches exist on the same day', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { validateLineupPickLock } = await import('./validateLineupPickLock');
      const dayMatches = [
        buildMatch('wc26-m002', '2026-06-07T21:00:00.000Z'),
        buildMatch('wc26-m001', '2026-06-07T12:00:00.000Z'),
      ];

      expect(() => validateLineupPickLock('2026-06-07', dayMatches, FIXED_NOW)).toThrow(
        expect.objectContaining({
          statusCode: 409,
          code: 'CONFLICT',
          message: 'Lineup picks locked for event day: 2026-06-07',
        }),
      );
    });
  });
});
