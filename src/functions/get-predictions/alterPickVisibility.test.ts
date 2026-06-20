import { describe, expect, it } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import { resolveAlterPickVisibility } from './alterPickVisibility';

const BASE_MATCH: MatchItem = {
  matchId: 'wc26-m001',
  homeTeamName: 'Argentina',
  homeTeamCode: 'ARG',
  awayTeamName: 'Brasil',
  awayTeamCode: 'BRA',
  homeGoals: null,
  awayGoals: null,
  kickoffAt: '2026-06-21T18:00:00.000Z',
  status: 1,
  isFirstRound: true,
};

describe('resolveAlterPickVisibility', () => {
  it('keeps alterations hidden before kickoff', () => {
    expect(
      resolveAlterPickVisibility(BASE_MATCH, new Date('2026-06-21T17:59:59.000Z').getTime()),
    ).toBe('hidden');
  });

  it('reveals the actor and victim from kickoff while the match is not finished', () => {
    expect(
      resolveAlterPickVisibility(BASE_MATCH, new Date('2026-06-21T18:00:00.000Z').getTime()),
    ).toBe('revealedWithoutDetails');
  });

  it('reveals full details when the match is finished', () => {
    expect(
      resolveAlterPickVisibility(
        {
          ...BASE_MATCH,
          homeGoals: 2,
          awayGoals: 1,
          status: 2,
        },
        new Date('2026-06-21T17:00:00.000Z').getTime(),
      ),
    ).toBe('revealedWithDetails');
  });

  it('keeps alterations hidden when the match cannot be resolved', () => {
    expect(resolveAlterPickVisibility(undefined, Date.now())).toBe('hidden');
  });
});
