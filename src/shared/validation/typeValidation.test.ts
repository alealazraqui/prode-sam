import { describe, expect, it } from 'vitest';
import { asOptionalString, isNonEmptyString, isString } from './typeValidation';

describe('typeValidation', () => {
  describe('isString', () => {
    it('returns true for strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
    });

    it('returns false for non-strings', () => {
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString(123)).toBe(false);
      expect(isString({})).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('returns true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
    });

    it('returns false for empty or non-string values', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
    });
  });

  describe('asOptionalString', () => {
    it('returns the string when value is a string', () => {
      expect(asOptionalString('Ale')).toBe('Ale');
      expect(asOptionalString('')).toBe('');
    });

    it('returns undefined for non-string values', () => {
      expect(asOptionalString(null)).toBeUndefined();
      expect(asOptionalString(undefined)).toBeUndefined();
      expect(asOptionalString(123)).toBeUndefined();
    });
  });
});
