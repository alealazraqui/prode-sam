import type { AlterAssignmentItem } from '../../src/shared/types/alteration';
import type { UserItem } from '../../src/shared/types/userItem';

export const ALTERATION_START_DATE = '2026-06-21';
export const ALTERATION_END_DATE = '2026-06-27';

const ALTERATION_DATES = buildDateRange(ALTERATION_START_DATE, ALTERATION_END_DATE);

export type AlterAssignmentDraft = Pick<AlterAssignmentItem, 'calendarDate' | 'username'>;

export function assignAlterationDates(users: Pick<UserItem, 'username'>[]): AlterAssignmentDraft[] {
  const usernames = users.map((user) => user.username.trim()).sort((a, b) => a.localeCompare(b));
  assertUniqueUsernames(usernames);

  return usernames.map((username, index) => {
    const calendarDate = ALTERATION_DATES[index % ALTERATION_DATES.length];
    assertDateInAlterationRange(calendarDate);

    return {
      calendarDate,
      username,
    };
  });
}

export function assertDateInAlterationRange(calendarDate: string): void {
  if (calendarDate < ALTERATION_START_DATE || calendarDate > ALTERATION_END_DATE) {
    throw new Error(
      `Alter assignment date ${calendarDate} is outside ${ALTERATION_START_DATE}..${ALTERATION_END_DATE}`,
    );
  }
}

function assertUniqueUsernames(usernames: string[]): void {
  const seen = new Set<string>();

  for (const username of usernames) {
    if (!username) {
      throw new Error('Alter assignments require non-empty usernames');
    }

    if (seen.has(username)) {
      throw new Error(`Duplicate username for alter assignment: ${username}`);
    }

    seen.add(username);
  }
}

function buildDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}
