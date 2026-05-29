import { describe, expect, it } from 'vitest';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import { parseJsonBody } from './parseJsonBody';

describe('parseJsonBody', () => {
  it('parses valid JSON body', () => {
    const result = parseJsonBody<{ username: string; password: string }>(
      '{"username":"alejandro","password":"1234"}',
    );

    expect(result).toEqual({ username: 'alejandro', password: '1234' });
  });

  it('throws BadRequestError when body is null', () => {
    expect(() => parseJsonBody(null)).toThrow(BadRequestError);
    expect(() => parseJsonBody(null)).toThrow('Request body is required');
  });

  it('throws BadRequestError when body is invalid JSON', () => {
    expect(() => parseJsonBody('not-json')).toThrow(BadRequestError);
    expect(() => parseJsonBody('not-json')).toThrow('Invalid JSON body');
  });
});
