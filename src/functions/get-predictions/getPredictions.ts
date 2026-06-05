import { fetchMyPredictions } from './fetchMyPredictions';
import { fetchOthersPredictions } from './fetchOthersPredictions';
import { mapPredictionToResponse } from './mapPredictionToResponse';
import type { GetPredictionsResponse } from './types';

export async function getPredictions(authUsername: string): Promise<GetPredictionsResponse> {
  const [myItems, othersItems] = await Promise.all([
    fetchMyPredictions(authUsername),
    fetchOthersPredictions(authUsername),
  ]);

  const myPredictions = myItems.map(mapPredictionToResponse);
  const othersPredictions = othersItems.map(mapPredictionToResponse);

  return {
    myPredictions,
    allPredictions: [...myPredictions, ...othersPredictions],
  };
}
