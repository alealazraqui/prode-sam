import { describe, expect, it } from 'vitest';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { parseLoginInput, validateLoginInput } from './loginValidation';

describe('parseLoginInput', () => {
  it('parses valid username and password from request body', () => {
    const event = mockApiGatewayEvent({
      body: JSON.stringify({ username: 'alejandro', password: '1234' }),
    });

    expect(parseLoginInput(event)).toEqual({
      username: 'alejandro',
      password: '1234',
    });
  });

  it('throws BadRequestError when body is missing', () => {
    const event = mockApiGatewayEvent({ body: null });

    expect(() => parseLoginInput(event)).toThrow(BadRequestError);
    expect(() => parseLoginInput(event)).toThrow('Request body is required');
  });

  it('throws BadRequestError when body is invalid JSON', () => {
    const event = mockApiGatewayEvent({ body: 'not-json' });

    expect(() => parseLoginInput(event)).toThrow(BadRequestError);
    expect(() => parseLoginInput(event)).toThrow('Invalid JSON body');
  });

  it('returns empty strings for missing or invalid fields', () => {
    const event = mockApiGatewayEvent({
      body: JSON.stringify({ username: 123, password: null }),
    });

    expect(parseLoginInput(event)).toEqual({
      username: '',
      password: '',
    });
  });
});

describe('validateLoginInput', () => {
  it('throws BadRequestError when username is empty', () => {
    expect(() => validateLoginInput({ username: '', password: '1234' })).toThrow(BadRequestError);
    expect(() => validateLoginInput({ username: '   ', password: '1234' })).toThrow(
      'username and password are required',
    );
  });

  it('throws BadRequestError when password is empty', () => {
    expect(() => validateLoginInput({ username: 'alejandro', password: '' })).toThrow(
      BadRequestError,
    );
    expect(() => validateLoginInput({ username: 'alejandro', password: '   ' })).toThrow(
      'username and password are required',
    );
  });

  it('passes when username and password are non-empty', () => {
    expect(() => validateLoginInput({ username: 'alejandro', password: '1234' })).not.toThrow();
  });
});
