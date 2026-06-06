import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchItem } from '@/functions/get-matches/types';
import { ConflictError } from '@/shared/errors/ConflictError';
import { validateBatch } from './validateBatch';
import type { SavePredictionInput } from './types';

const FUTURE_KICKOFF = '2099-01-01T12:00:00.000Z';
const PAST_KICKOFF = '2020-01-01T12:00:00.000Z';

function buildMatchLookup(entries: Record<string, string>): Map<string, MatchItem> {
  return new Map(
    Object.entries(entries).map(([matchId, kickoffAt]) => [
      matchId,
      {
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
      },
    ]),
  );
}

describe('validateBatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not throw when all matches are not started yet', () => {
    const predictions: SavePredictionInput[] = [
      { matchId: 'wc26-m001', homeGoals: 1, awayGoals: 0 },
    ];
    const matchLookup = buildMatchLookup({ 'wc26-m001': FUTURE_KICKOFF });

    expect(() => validateBatch(predictions, matchLookup)).not.toThrow();
  });

  it('throws ConflictError when a match is locked', () => {
    const predictions: SavePredictionInput[] = [
      { matchId: 'wc26-m001', homeGoals: 1, awayGoals: 0 },
    ];
    const matchLookup = buildMatchLookup({ 'wc26-m001': PAST_KICKOFF });

    expect(() => validateBatch(predictions, matchLookup)).toThrow(ConflictError);
    expect(() => validateBatch(predictions, matchLookup)).toThrow(
      'Predictions locked for matches: wc26-m001',
    );
  });

  it('rejects the entire batch when one match is locked', () => {
    const predictions: SavePredictionInput[] = [
      { matchId: 'wc26-m001', homeGoals: 1, awayGoals: 0 },
      { matchId: 'wc26-m002', homeGoals: 2, awayGoals: 2 },
    ];
    const matchLookup = buildMatchLookup({
      'wc26-m001': FUTURE_KICKOFF,
      'wc26-m002': PAST_KICKOFF,
    });

    expect(() => validateBatch(predictions, matchLookup)).toThrow(ConflictError);
    expect(() => validateBatch(predictions, matchLookup)).toThrow('wc26-m002');
  });
});
