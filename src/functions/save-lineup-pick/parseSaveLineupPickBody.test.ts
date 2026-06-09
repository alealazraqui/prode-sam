import { describe, expect, it, vi } from 'vitest';
import { withTestEnv } from '@/shared/test/withTestEnv';

const TEST_ENV = {
  JWT_SECRET: 'test-secret',
};

describe('parseSaveLineupPickBody', () => {
  it('parses a valid body with all required fields', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { parseSaveLineupPickBody } = await import('./parseSaveLineupPickBody');

      expect(
        parseSaveLineupPickBody({
          eventDay: '2026-06-15',
          defensor: 'Defensor A',
          mediocampista: 'Medio B',
          delantero: 'Delantero C',
        }),
      ).toEqual({
        eventDay: '2026-06-15',
        defensor: 'Defensor A',
        mediocampista: 'Medio B',
        delantero: 'Delantero C',
      });
    });
  });

  it('throws BadRequestError when body is not an object', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { BadRequestError } = await import('@/shared/errors/BadRequestError');
      const { parseSaveLineupPickBody } = await import('./parseSaveLineupPickBody');

      expect(() => parseSaveLineupPickBody(null)).toThrow(BadRequestError);
      expect(() => parseSaveLineupPickBody([])).toThrow(BadRequestError);
    });
  });

  it('throws BadRequestError when a required field is empty', async () => {
    await withTestEnv(TEST_ENV, async () => {
      vi.resetModules();
      const { parseSaveLineupPickBody } = await import('./parseSaveLineupPickBody');

      expect(() =>
        parseSaveLineupPickBody({
          eventDay: '2026-06-15',
          defensor: '',
          mediocampista: 'Medio B',
          delantero: 'Delantero C',
        }),
      ).toThrow(
        expect.objectContaining({
          statusCode: 400,
          code: 'BAD_REQUEST',
          message: 'defensor must be a non-empty string',
        }),
      );
    });
  });
});
