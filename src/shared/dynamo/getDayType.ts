import { environment } from '@/shared/config/environment';
import type { DayEventItem } from '@/shared/types/dayEvent';
import { DayEventType } from '@/shared/types/dayEventType';
import { getItem } from './getItem';

export async function getDayType(date: string): Promise<DayEventType> {
  const item = await getItem<DayEventItem>(environment.dayEventsTableName, { date });
  return item?.eventType ?? DayEventType.Comun;
}
