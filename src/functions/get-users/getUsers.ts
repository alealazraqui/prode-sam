import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import { mapUserItemToPublicResponse } from '@/shared/mappers/mapUserItemToPublicResponse';
import type { PublicUserResponse } from '@/shared/types/publicUserResponse';
import type { UserItem } from '@/shared/types/userItem';

export async function getUsers(): Promise<PublicUserResponse[]> {
  const users = await scanTable<UserItem>(environment.usersTableName);
  return users.map(mapUserItemToPublicResponse);
}
