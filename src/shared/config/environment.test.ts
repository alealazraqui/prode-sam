import { describe, expect, it, vi } from 'vitest';

const REQUIRED_ENV = {
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

type RequiredEnvName = keyof typeof REQUIRED_ENV;

async function withRawEnv<T>(
  vars: Partial<Record<RequiredEnvName, string>>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const previous = new Map<RequiredEnvName, string | undefined>();

  for (const key of Object.keys(REQUIRED_ENV) as RequiredEnvName[]) {
    previous.set(key, process.env[key]);

    const value = vars[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
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

    vi.resetModules();
  }
}

function withoutEnv(name: RequiredEnvName): Partial<Record<RequiredEnvName, string>> {
  const vars: Partial<Record<RequiredEnvName, string>> = { ...REQUIRED_ENV };
  delete vars[name];
  return vars;
}

describe('environment', () => {
  it('exposes the alter table names when required env vars are present', async () => {
    await withRawEnv(REQUIRED_ENV, async () => {
      vi.resetModules();
      const { environment } = await import('./environment');

      expect(environment).toMatchObject({
        alterAssignmentsTableName: 'AlterAssignments',
        alterPicksTableName: 'AlterPicks',
        alterVictimLocksTableName: 'AlterVictimLocks',
      });
    });
  });

  it.each([
    'ALTER_ASSIGNMENTS_TABLE_NAME',
    'ALTER_PICKS_TABLE_NAME',
    'ALTER_VICTIM_LOCKS_TABLE_NAME',
  ] as const)('fails early when %s is missing', async (name) => {
    await withRawEnv(withoutEnv(name), async () => {
      vi.resetModules();

      await expect(import('./environment')).rejects.toThrow(
        `Missing required environment variable: ${name}`,
      );
    });
  });
});
