import { getArgentinaDateStringFromIso } from '@/functions/steal-picks/getArgentinaDateStringFromIso';
import type { MatchItem } from '@/functions/get-matches/types';
import { environment } from '@/shared/config/environment';
import { scanTable } from '@/shared/dynamo/scanTable';

export async function fetchMatchesForEventDay(eventDay: string): Promise<MatchItem[]> {
  const matches = await scanTable<MatchItem>(environment.matchesTableName);

  return matches.filter((match) => getArgentinaDateStringFromIso(match.kickoffAt) === eventDay);
}
