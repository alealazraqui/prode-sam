import { describe, expect, it } from 'vitest';
import { UnauthorizedError } from '@/shared/errors/UnauthorizedError';
import { mockApiGatewayEvent } from '@/shared/test/mockApiGatewayEvent';
import { extractAuthenticatedUsername } from './extractAuthenticatedUsername';

describe('extractAuthenticatedUsername', () => {
  it('returns username from authorizer lambda context', () => {
    const event = mockApiGatewayEvent({
      authorizerContext: { username: 'alejandro' },
    });

    expect(extractAuthenticatedUsername(event)).toBe('alejandro');
  });

  it('throws UnauthorizedError when authorizer context has no username', () => {
    const event = mockApiGatewayEvent();

    expect(() => extractAuthenticatedUsername(event)).toThrow(UnauthorizedError);
  });
});
