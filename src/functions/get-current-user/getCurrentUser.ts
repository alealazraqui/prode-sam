import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import { NotFoundError } from '@/shared/errors/NotFoundError';
import { mapUserItemToPublicResponse } from '@/shared/mappers/mapUserItemToPublicResponse';
import type { PublicUserResponse } from '@/shared/types/publicUserResponse';
import type { UserItem } from '@/shared/types/userItem';

const USER_NOT_FOUND_MESSAGE = 'Usuario no encontrado.';

export async function getCurrentUser(username: string): Promise<PublicUserResponse> {
  const user = await getItem<UserItem>(environment.usersTableName, { username });

  if (!user) {
    throw new NotFoundError(USER_NOT_FOUND_MESSAGE);
  }

  return mapUserItemToPublicResponse(user);
}
