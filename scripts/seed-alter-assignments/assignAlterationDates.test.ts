import { describe, expect, it } from 'vitest';
import {
  ALTERATION_END_DATE,
  ALTERATION_START_DATE,
  assignAlterationDates,
} from './assignAlterationDates';

const FixedUser = {
  AlejandroAlazraqui: 'alejandro.alazraqui',
  BrunoMunoz: 'bruno.munoz',
  MarcoMunoz: 'marco.munoz',
  AgustinMartinez: 'agustin.martinez',
  FrancoDicarlo: 'franco.dicarlo',
  NicolasSanchez: 'nicolas.sanchez',
  SimbadPeralta: 'simbad.peralta',
  SebastianPasarin: 'sebastian.pasarin',
  JulianBorgo: 'julian.borgo',
  ThomasColagiovanni: 'thomas.colagiovanni',
  DanielGolluscio: 'daniel.golluscio',
} as const;

function user(username: string): { username: string } {
  return { username };
}

describe('assignAlterationDates', () => {
  it('assigns one alteration date per user', () => {
    const assignments = assignAlterationDates([
      user(FixedUser.AlejandroAlazraqui),
      user(FixedUser.BrunoMunoz),
      user(FixedUser.MarcoMunoz),
    ]);

    expect(assignments).toHaveLength(3);
    expect(assignments.map((assignment) => assignment.username).sort()).toEqual([
      FixedUser.AlejandroAlazraqui,
      FixedUser.BrunoMunoz,
      FixedUser.MarcoMunoz,
    ]);
  });

  it('keeps every assignment inside the closed alteration date range', () => {
    const assignments = assignAlterationDates(Object.values(FixedUser).map(user));

    expect(
      assignments.every((assignment) => assignment.calendarDate >= ALTERATION_START_DATE),
    ).toBe(true);
    expect(assignments.every((assignment) => assignment.calendarDate <= ALTERATION_END_DATE)).toBe(
      true,
    );
  });

  it('allows dates to repeat when there are more users than available dates', () => {
    const assignments = assignAlterationDates(Object.values(FixedUser).map(user));
    const uniqueDates = new Set(assignments.map((assignment) => assignment.calendarDate));

    expect(assignments).toHaveLength(11);
    expect(uniqueDates.size).toBeLessThan(assignments.length);
  });

  it('rejects duplicate usernames', () => {
    expect(() =>
      assignAlterationDates([
        user(FixedUser.AlejandroAlazraqui),
        user(FixedUser.AlejandroAlazraqui),
      ]),
    ).toThrow(`Duplicate username for alter assignment: ${FixedUser.AlejandroAlazraqui}`);
  });
});
