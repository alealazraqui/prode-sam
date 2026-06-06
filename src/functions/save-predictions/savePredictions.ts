import { parseSavePredictionsBody } from './parseSavePredictionsBody';
import { fetchMatchesForPredictions } from './fetchMatchesForPredictions';
import { validateBatch } from './validateBatch';
import { upsertPredictions } from './upsertPredictions';

export async function savePredictions(username: string, body: unknown): Promise<void> {
  const predictions = parseSavePredictionsBody(body);
  const matchLookup = await fetchMatchesForPredictions(predictions);
  validateBatch(predictions, matchLookup);
  await upsertPredictions(username, predictions, matchLookup);
}
