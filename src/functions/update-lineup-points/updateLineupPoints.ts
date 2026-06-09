import { parseUpdateLineupPointsBody } from './parseUpdateLineupPointsBody';
import { updateLineupPickPoints } from './updateLineupPickPoints';

export async function updateLineupPoints(body: unknown): Promise<void> {
  const items = parseUpdateLineupPointsBody(body);
  await Promise.all(items.map((item) => updateLineupPickPoints(item)));
}
