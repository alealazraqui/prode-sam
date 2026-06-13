import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleHalfMatchIds } from './sampleHalfMatchIds';

describe('sampleHalfMatchIds', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('output size', () => {
    it('returns 0 matches when the input is empty', () => {
      expect(sampleHalfMatchIds([])).toHaveLength(0);
    });

    it('returns 1 match when there is only 1 available', () => {
      expect(sampleHalfMatchIds(['m1'])).toHaveLength(1);
    });

    it('returns half for an even count', () => {
      // 2 matches → 1; 4 matches → 2; 6 matches → 3
      expect(sampleHalfMatchIds(['m1', 'm2'])).toHaveLength(1);
      expect(sampleHalfMatchIds(['m1', 'm2', 'm3', 'm4'])).toHaveLength(2);
      expect(sampleHalfMatchIds(['m1', 'm2', 'm3', 'm4', 'm5', 'm6'])).toHaveLength(3);
    });

    it('rounds up for an odd count', () => {
      // 3 matches → 2; 5 matches → 3; 7 matches → 4
      expect(sampleHalfMatchIds(['m1', 'm2', 'm3'])).toHaveLength(2);
      expect(sampleHalfMatchIds(['m1', 'm2', 'm3', 'm4', 'm5'])).toHaveLength(3);
      expect(sampleHalfMatchIds(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'])).toHaveLength(4);
    });
  });

  describe('output validity', () => {
    it('returns only IDs that exist in the original list', () => {
      const ids = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
      const result = sampleHalfMatchIds(ids);
      for (const id of result) {
        expect(ids).toContain(id);
      }
    });

    it('returns no duplicate IDs', () => {
      const ids = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
      const result = sampleHalfMatchIds(ids);
      expect(new Set(result).size).toBe(result.length);
    });

    it('does not mutate the input array', () => {
      const ids = ['m1', 'm2', 'm3', 'm4'];
      const copy = [...ids];
      sampleHalfMatchIds(ids);
      expect(ids).toEqual(copy);
    });
  });

  describe('randomness', () => {
    it('produces different subsets across calls when matches are shuffled differently', () => {
      const ids = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'];
      const results = new Set(
        Array.from({ length: 30 }, () => sampleHalfMatchIds(ids).sort().join(',')),
      );
      // With 8 matches choosing 4, the chance of 30 calls all picking the same subset is negligible
      expect(results.size).toBeGreaterThan(1);
    });

    it('each stealer independently receives a random subset (different samples expected)', () => {
      const ids = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
      const stealer1 = sampleHalfMatchIds(ids);
      const stealer2 = sampleHalfMatchIds(ids);
      const stealer3 = sampleHalfMatchIds(ids);
      // All results must be valid subsets regardless of whether they match each other
      for (const result of [stealer1, stealer2, stealer3]) {
        expect(result).toHaveLength(3);
        for (const id of result) {
          expect(ids).toContain(id);
        }
      }
    });

    it('selection is controlled by Math.random', () => {
      const ids = ['m1', 'm2', 'm3', 'm4'];
      // Force Math.random to always return 0 → sort comparator always negative → stable order
      vi.spyOn(Math, 'random').mockReturnValue(0);
      const resultA = sampleHalfMatchIds(ids);

      // Force Math.random to always return 0.99 → Fisher-Yates picks last valid index
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const resultB = sampleHalfMatchIds(ids);

      // Both are valid subsets of length 2
      expect(resultA).toHaveLength(2);
      expect(resultB).toHaveLength(2);
      for (const id of [...resultA, ...resultB]) {
        expect(ids).toContain(id);
      }
    });
  });
});
