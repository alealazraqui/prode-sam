import { runScoringRecalculation } from './runScoringRecalculation';
import { saveMatches } from './saveMatches';
import type { UploadMatchesEvent } from './types';

export async function handler(
  event: UploadMatchesEvent,
): Promise<{ statusCode: number; body: string }> {
  const matches = event.matches ?? [];

  await saveMatches(matches);
  await runScoringRecalculation(matches);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
}
