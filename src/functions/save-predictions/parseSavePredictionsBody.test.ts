import { describe, expect, it } from 'vitest';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import { parseSavePredictionsBody } from './parseSavePredictionsBody';

describe('parseSavePredictionsBody', () => {
  it('returns typed predictions for a valid non-empty array', () => {
    const result = parseSavePredictionsBody([{ matchId: 'wc26-m001', homeGoals: 1, awayGoals: 0 }]);

    expect(result).toEqual([{ matchId: 'wc26-m001', homeGoals: 1, awayGoals: 0 }]);
  });

  it('throws BadRequestError for an empty array', () => {
    expect(() => parseSavePredictionsBody([])).toThrow(BadRequestError);
    expect(() => parseSavePredictionsBody([])).toThrow('At least one prediction is required');
  });

  it('throws BadRequestError when matchId is empty', () => {
    expect(() => parseSavePredictionsBody([{ matchId: '', homeGoals: 0, awayGoals: 0 }])).toThrow(
      BadRequestError,
    );
    expect(() => parseSavePredictionsBody([{ matchId: '', homeGoals: 0, awayGoals: 0 }])).toThrow(
      'predictions[0].matchId must be a non-empty string',
    );
  });

  it('throws BadRequestError when homeGoals is negative', () => {
    expect(() =>
      parseSavePredictionsBody([{ matchId: 'wc26-m001', homeGoals: -1, awayGoals: 0 }]),
    ).toThrow(BadRequestError);
    expect(() =>
      parseSavePredictionsBody([{ matchId: 'wc26-m001', homeGoals: -1, awayGoals: 0 }]),
    ).toThrow('predictions[0].homeGoals must be a non-negative integer');
  });

  it('throws BadRequestError when awayGoals is not an integer', () => {
    expect(() =>
      parseSavePredictionsBody([{ matchId: 'wc26-m001', homeGoals: 0, awayGoals: 1.5 }]),
    ).toThrow(BadRequestError);
    expect(() =>
      parseSavePredictionsBody([{ matchId: 'wc26-m001', homeGoals: 0, awayGoals: 1.5 }]),
    ).toThrow('predictions[0].awayGoals must be a non-negative integer');
  });
});
