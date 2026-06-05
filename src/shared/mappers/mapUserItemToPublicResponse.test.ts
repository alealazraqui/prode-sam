import { describe, expect, it } from 'vitest';
import { mapUserItemToPublicResponse } from './mapUserItemToPublicResponse';

describe('mapUserItemToPublicResponse', () => {
  it('maps user fields and omits password', () => {
    const result = mapUserItemToPublicResponse({
      username: 'alejandro',
      alias: 'Ale',
      password: 'secret',
      score: 42,
      rankingPosition: 3,
    });

    expect(result).toEqual({
      username: 'alejandro',
      alias: 'Ale',
      score: 42,
      rankingPosition: 3,
    });
    expect(result).not.toHaveProperty('password');
  });

  it('uses username as alias fallback and defaults score and rankingPosition to 0', () => {
    expect(
      mapUserItemToPublicResponse({
        username: 'demo',
        password: 'secret',
        rankingPosition: 5,
      }),
    ).toEqual({
      username: 'demo',
      alias: 'demo',
      score: 0,
      rankingPosition: 5,
    });
  });
});
