function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const environment = {
  usersTableName: getRequiredEnv('USERS_TABLE_NAME'),
  matchesTableName: getRequiredEnv('MATCHES_TABLE_NAME'),
  predictionsTableName: getRequiredEnv('PREDICTIONS_TABLE_NAME'),
  dayEventsTableName: getRequiredEnv('DAY_EVENTS_TABLE_NAME'),
  stealersTableName: getRequiredEnv('STEALERS_TABLE_NAME'),
  blockedVictimsTableName: getRequiredEnv('BLOCKED_VICTIMS_TABLE_NAME'),
  stealPicksTableName: getRequiredEnv('STEAL_PICKS_TABLE_NAME'),
  lineupPicksTableName: getRequiredEnv('LINEUP_PICKS_TABLE_NAME'),
  jwtSecret: getRequiredEnv('JWT_SECRET'),
};
