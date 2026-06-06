import { describe, expect, it } from 'vitest';
import { sumPredictionScores } from './sumPredictionScores';

describe('sumPredictionScores', () => {
  it('returns zero when the list is empty', () => {
    expect(sumPredictionScores([])).toEqual({ pointsCommon: 0 });
  });

  it('sums pointsCommon across multiple prediction scores', () => {
    expect(
      sumPredictionScores([{ pointsCommon: 3 }, { pointsCommon: 1 }, { pointsCommon: 0 }]),
    ).toEqual({ pointsCommon: 4 });
  });
});
