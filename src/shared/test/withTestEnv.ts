const TEST_ENV_DEFAULTS: Record<string, string> = {
  JWT_SECRET: 'test-secret',
  USERS_TABLE_NAME: 'Users',
  MATCHES_TABLE_NAME: 'Matches',
  PREDICTIONS_TABLE_NAME: 'Predictions',
  DAY_EVENTS_TABLE_NAME: 'DayEvents',
  STEALERS_TABLE_NAME: 'Stealers',
  BLOCKED_VICTIMS_TABLE_NAME: 'BlockedVictims',
  STEAL_PICKS_TABLE_NAME: 'StealPicks',
  LINEUP_PICKS_TABLE_NAME: 'LineupPicks',
  ALTER_ASSIGNMENTS_TABLE_NAME: 'AlterAssignments',
  ALTER_PICKS_TABLE_NAME: 'AlterPicks',
  ALTER_VICTIM_LOCKS_TABLE_NAME: 'AlterVictimLocks',
};

export async function withTestEnv<T>(
  vars: Record<string, string>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries({ ...TEST_ENV_DEFAULTS, ...vars })) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
