import { describe, expect, it } from 'vitest';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import { parseAlterPickBody } from './parseAlterPickBody';

describe('parseAlterPickBody', () => {
  it('parses a valid alter pick request', () => {
    const result = parseAlterPickBody({
      calendarDate: '2026-06-21',
      matchId: 'wc26-m010',
      victimUsername: 'victim.user',
      side: 'home',
      delta: 1,
    });

    expect(result).toEqual({
      calendarDate: '2026-06-21',
      matchId: 'wc26-m010',
      victimUsername: 'victim.user',
      side: 'home',
      delta: 1,
    });
  });

  it('throws when body is not an object', () => {
    expect(() => parseAlterPickBody(null)).toThrow(BadRequestError);
    expect(() => parseAlterPickBody('invalid')).toThrow(BadRequestError);
  });

  it('throws when required strings are empty', () => {
    expect(() =>
      parseAlterPickBody({
        calendarDate: '',
        matchId: 'wc26-m010',
        victimUsername: 'victim.user',
        side: 'home',
        delta: 1,
      }),
    ).toThrow('calendarDate must be a non-empty string');

    expect(() =>
      parseAlterPickBody({
        calendarDate: '2026-06-21',
        matchId: '',
        victimUsername: 'victim.user',
        side: 'home',
        delta: 1,
      }),
    ).toThrow('matchId must be a non-empty string');

    expect(() =>
      parseAlterPickBody({
        calendarDate: '2026-06-21',
        matchId: 'wc26-m010',
        victimUsername: '',
        side: 'home',
        delta: 1,
      }),
    ).toThrow('victimUsername must be a non-empty string');
  });

  it('throws when side is not home or away', () => {
    expect(() =>
      parseAlterPickBody({
        calendarDate: '2026-06-21',
        matchId: 'wc26-m010',
        victimUsername: 'victim.user',
        side: 'draw',
        delta: 1,
      }),
    ).toThrow('side must be home or away');
  });

  it('throws when delta is not 1 or -1', () => {
    expect(() =>
      parseAlterPickBody({
        calendarDate: '2026-06-21',
        matchId: 'wc26-m010',
        victimUsername: 'victim.user',
        side: 'home',
        delta: 2,
      }),
    ).toThrow('delta must be 1 or -1');
  });
});
