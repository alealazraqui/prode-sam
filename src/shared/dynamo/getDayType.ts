import { environment } from '@/shared/config/environment';
import type { DayEventItem, DayType } from '@/shared/types/dayEvent';
import { getItem } from './getItem';

export async function getDayType(date: string): Promise<DayType> {
  const item = await getItem<DayEventItem>(environment.dayEventsTableName, { date });
  return item?.eventType ?? 'common';
}
