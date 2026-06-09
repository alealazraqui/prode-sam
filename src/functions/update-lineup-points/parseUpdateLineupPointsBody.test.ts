import { describe, expect, it } from 'vitest';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import { parseUpdateLineupPointsBody } from './parseUpdateLineupPointsBody';

describe('parseUpdateLineupPointsBody', () => {
  it('parses a valid non-empty array', () => {
    const result = parseUpdateLineupPointsBody([
      { eventDay: '2026-06-15', username: 'user1', points: 3 },
      { eventDay: '2026-06-15', username: 'user2', points: 6 },
    ]);

    expect(result).toEqual([
      { eventDay: '2026-06-15', username: 'user1', points: 3 },
      { eventDay: '2026-06-15', username: 'user2', points: 6 },
    ]);
  });

  it('throws when body is not an array', () => {
    expect(() => parseUpdateLineupPointsBody({ eventDay: '2026-06-15' })).toThrow(BadRequestError);
  });

  it('throws when array is empty', () => {
    expect(() => parseUpdateLineupPointsBody([])).toThrow(BadRequestError);
  });

  it('throws when eventDay is missing', () => {
    expect(() => parseUpdateLineupPointsBody([{ username: 'user1', points: 3 }])).toThrow(
      BadRequestError,
    );
  });

  it('throws when username is missing', () => {
    expect(() => parseUpdateLineupPointsBody([{ eventDay: '2026-06-15', points: 3 }])).toThrow(
      BadRequestError,
    );
  });

  it('throws when points is not an integer between 1 and 6', () => {
    expect(() =>
      parseUpdateLineupPointsBody([{ eventDay: '2026-06-15', username: 'user1', points: 0 }]),
    ).toThrow(BadRequestError);

    expect(() =>
      parseUpdateLineupPointsBody([{ eventDay: '2026-06-15', username: 'user1', points: 7 }]),
    ).toThrow(BadRequestError);

    expect(() =>
      parseUpdateLineupPointsBody([{ eventDay: '2026-06-15', username: 'user1', points: 2.5 }]),
    ).toThrow(BadRequestError);
  });
});
