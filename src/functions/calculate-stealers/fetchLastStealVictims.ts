import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import type { StealPickItem } from '@/shared/types/stealPickItem';

import { resolveLatestStealVictims } from './resolveLatestStealVictims';

export { resolveLatestStealVictims } from './resolveLatestStealVictims';

export async function fetchLastStealVictims(): Promise<string[]> {
  const stealPicks = await scanTable<StealPickItem>(environment.stealPicksTableName);
  return resolveLatestStealVictims(stealPicks);
}
