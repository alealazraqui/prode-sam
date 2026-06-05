import type { PublicUserResponse } from '@/shared/types/publicUserResponse';
import type { UserItem } from '@/shared/types/userItem';

export function mapUserItemToPublicResponse(user: UserItem): PublicUserResponse {
  return {
    username: user.username,
    alias: user.alias ?? user.username,
    score: user.score ?? 0,
    rankingPosition: user.rankingPosition ?? 0,
  };
}
