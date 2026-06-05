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
  jwtSecret: getRequiredEnv('JWT_SECRET'),
};
