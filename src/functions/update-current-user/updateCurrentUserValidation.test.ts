import { describe, expect, it } from 'vitest';
import { BadRequestError } from '@/shared/errors/BadRequestError';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import {
  parseUpdateCurrentUserInput,
  validateUpdateCurrentUserInput,
} from './updateCurrentUserValidation';

describe('parseUpdateCurrentUserInput', () => {
  it('parses alias and password when both are non-empty strings', () => {
    const event = mockApiGatewayEvent({
      method: 'PATCH',
      path: '/users/me',
      body: JSON.stringify({ alias: 'Nuevo', password: 'secret2' }),
    });

    expect(parseUpdateCurrentUserInput(event)).toEqual({
      alias: 'Nuevo',
      password: 'secret2',
    });
  });

  it('parses only alias when password is empty', () => {
    const event = mockApiGatewayEvent({
      method: 'PATCH',
      path: '/users/me',
      body: JSON.stringify({ alias: 'Nuevo', password: '' }),
    });

    expect(parseUpdateCurrentUserInput(event)).toEqual({ alias: 'Nuevo' });
  });

  it('parses only password when alias is empty', () => {
    const event = mockApiGatewayEvent({
      method: 'PATCH',
      path: '/users/me',
      body: JSON.stringify({ alias: '', password: 'secret2' }),
    });

    expect(parseUpdateCurrentUserInput(event)).toEqual({ password: 'secret2' });
  });

  it('ignores username and name in body', () => {
    const event = mockApiGatewayEvent({
      method: 'PATCH',
      path: '/users/me',
      body: JSON.stringify({
        username: 'other',
        name: 'Other Name',
        alias: 'Nuevo',
      }),
    });

    expect(parseUpdateCurrentUserInput(event)).toEqual({ alias: 'Nuevo' });
  });

  it('trims alias and password values', () => {
    const event = mockApiGatewayEvent({
      method: 'PATCH',
      path: '/users/me',
      body: JSON.stringify({ alias: '  Nuevo  ', password: '  secret2  ' }),
    });

    expect(parseUpdateCurrentUserInput(event)).toEqual({
      alias: 'Nuevo',
      password: 'secret2',
    });
  });

  it('throws BadRequestError when body is missing', () => {
    const event = mockApiGatewayEvent({ method: 'PATCH', path: '/users/me', body: null });

    expect(() => parseUpdateCurrentUserInput(event)).toThrow(BadRequestError);
    expect(() => parseUpdateCurrentUserInput(event)).toThrow('Request body is required');
  });

  it('throws BadRequestError when body is invalid JSON', () => {
    const event = mockApiGatewayEvent({
      method: 'PATCH',
      path: '/users/me',
      body: 'not-json',
    });

    expect(() => parseUpdateCurrentUserInput(event)).toThrow(BadRequestError);
    expect(() => parseUpdateCurrentUserInput(event)).toThrow('Invalid JSON body');
  });

  it('throws BadRequestError when alias is not a string', () => {
    const event = mockApiGatewayEvent({
      method: 'PATCH',
      path: '/users/me',
      body: JSON.stringify({ alias: 123 }),
    });

    expect(() => parseUpdateCurrentUserInput(event)).toThrow(BadRequestError);
    expect(() => parseUpdateCurrentUserInput(event)).toThrow('alias must be a string');
  });

  it('throws BadRequestError when password is not a string', () => {
    const event = mockApiGatewayEvent({
      method: 'PATCH',
      path: '/users/me',
      body: JSON.stringify({ password: null }),
    });

    expect(() => parseUpdateCurrentUserInput(event)).toThrow(BadRequestError);
    expect(() => parseUpdateCurrentUserInput(event)).toThrow('password must be a string');
  });
});

describe('validateUpdateCurrentUserInput', () => {
  it('throws BadRequestError when no applicable fields are present', () => {
    expect(() => validateUpdateCurrentUserInput({})).toThrow(BadRequestError);
    expect(() => validateUpdateCurrentUserInput({})).toThrow(
      'At least one of alias or password must be provided',
    );
  });
});
