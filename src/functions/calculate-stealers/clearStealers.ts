import { environment } from '@/shared/config/environment';
import { deleteItem } from '@/shared/dynamo/deleteItem';
import { queryTable } from '@/shared/dynamo/queryTable';
import type { StealerItem } from '@/shared/types/stealer';

export async function clearStealers(dayId: string): Promise<void> {
  const stealers = await queryTable<StealerItem>(environment.stealersTableName, {
    KeyConditionExpression: 'dayId = :dayId',
    ExpressionAttributeValues: { ':dayId': dayId },
  });

  await Promise.all(
    stealers.map((stealer) =>
      deleteItem(environment.stealersTableName, {
        dayId: stealer.dayId,
        stealerUsername: stealer.stealerUsername,
      }),
    ),
  );
}
