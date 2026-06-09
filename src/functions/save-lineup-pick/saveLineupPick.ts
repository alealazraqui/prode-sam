import { fetchMatchesForEventDay } from './fetchMatchesForEventDay';
import { parseSaveLineupPickBody } from './parseSaveLineupPickBody';
import { upsertLineupPick } from './upsertLineupPick';
import { validateLineupPickLock } from './validateLineupPickLock';

export async function saveLineupPick(username: string, body: unknown): Promise<void> {
  const input = parseSaveLineupPickBody(body);
  const dayMatches = await fetchMatchesForEventDay(input.eventDay);
  validateLineupPickLock(input.eventDay, dayMatches);
  await upsertLineupPick(username, input);
}
