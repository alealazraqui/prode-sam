import { describe, expect, it } from 'vitest';
import { comparePassword } from './comparePassword';

describe('comparePassword', () => {
  it('returns true when passwords match', () => {
    expect(comparePassword('secret', 'secret')).toBe(true);
  });

  it('returns false when passwords differ', () => {
    expect(comparePassword('secret', 'wrong')).toBe(false);
  });
});
