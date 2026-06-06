import { describe, expect, it } from 'vitest';
import { totalScore } from './totalScore';

describe('totalScore', () => {
  it('returns pointsCommon as the total while only common rule exists', () => {
    expect(totalScore({ pointsCommon: 7 })).toBe(7);
  });
});
