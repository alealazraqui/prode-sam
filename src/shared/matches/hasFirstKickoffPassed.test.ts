import { describe, expect, it } from 'vitest';

import type { MatchItem } from '@/functions/get-matches/types';

import { hasFirstKickoffPassed } from './hasFirstKickoffPassed';

function buildMatch(kickoffAt: string): MatchItem {
  return {
    matchId: 'm1',
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

describe('hasFirstKickoffPassed', () => {
  it('returns false when there are no matches', () => {
    expect(hasFirstKickoffPassed([], new Date('2026-06-10T15:00:00.000Z'))).toBe(false);
  });

  it('returns false before the earliest kickoff', () => {
    const matches = [buildMatch('2026-06-10T18:00:00.000Z')];

    expect(hasFirstKickoffPassed(matches, new Date('2026-06-10T12:00:00.000Z'))).toBe(false);
  });

  it('returns true at or after the earliest kickoff', () => {
    const matches = [
      buildMatch('2026-06-10T21:00:00.000Z'),
      buildMatch('2026-06-10T12:00:00.000Z'),
    ];

    expect(hasFirstKickoffPassed(matches, new Date('2026-06-10T12:00:00.000Z'))).toBe(true);
    expect(hasFirstKickoffPassed(matches, new Date('2026-06-10T20:00:00.000Z'))).toBe(true);
  });
});
