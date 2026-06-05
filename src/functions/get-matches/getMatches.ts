import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';
import { mapMatchItemToResponse } from './mapMatchItemToResponse';
import type { MatchItem, MatchResponse } from './types';

export async function getMatches(): Promise<MatchResponse[]> {
  const matches = await scanTable<MatchItem>(environment.matchesTableName);
  return matches.map(mapMatchItemToResponse);
}
