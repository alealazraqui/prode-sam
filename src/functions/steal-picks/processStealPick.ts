import { environment } from '@/shared/config/environment';
import { getItem } from '@/shared/dynamo/getItem';
import type { StealPickItem } from '@/shared/types/stealPickItem';
import { editStealPick } from './editStealPick';
import { saveStealPick } from './saveStealPick';
import type { StealPickRequest } from './types';
import { validateStealPick } from './validateStealPick';

export async function processStealPick(
  stealerUsername: string,
  request: StealPickRequest,
): Promise<void> {
  await validateStealPick(stealerUsername, request);

  const existingPick = await getItem<StealPickItem>(environment.stealPicksTableName, {
    calendarDate: request.calendarDate,
    stealerUsername,
  });

  if (existingPick) {
    await editStealPick(stealerUsername, request, existingPick);
    return;
  }

  await saveStealPick(stealerUsername, request);
}
