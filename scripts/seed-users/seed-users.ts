import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { SeedUserInput, SeedUserItem } from './types';

const DEFAULT_USERS_FILE = resolve(__dirname, 'users.json');
const INITIAL_SCORE = 0;

async function main(): Promise<void> {
  const { tableName: cliTable, usersFile } = parseArgs(process.argv.slice(2));
  const tableName = resolveTableName(cliTable);
  await seedUsers(tableName, usersFile);
}

function parseArgs(argv: string[]): { tableName?: string; usersFile: string } {
  let tableName: string | undefined;
  let usersFile = DEFAULT_USERS_FILE;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--table' && argv[i + 1]) {
      tableName = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--table=')) {
      tableName = arg.slice('--table='.length);
    } else if (arg === '--file' && argv[i + 1]) {
      usersFile = resolve(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--file=')) {
      usersFile = resolve(arg.slice('--file='.length));
    }
  }

  return { tableName, usersFile };
}

function resolveTableName(cliTable?: string): string {
  const tableName = cliTable ?? process.env.USERS_TABLE_NAME;
  if (!tableName) {
    throw new Error(
      'Missing table name. Set USERS_TABLE_NAME or pass --table <name> (e.g. Users).',
    );
  }
  return tableName;
}

async function seedUsers(tableName: string, usersFile: string): Promise<void> {
  const users = loadUsers(usersFile);
  const rankingPositions = assignUniqueRankingPositions(users.length);
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  for (let i = 0; i < users.length; i += 1) {
    const item = toSeedItem(users[i], rankingPositions[i]);
    await putUser(client, tableName, item);
    console.log(
      `Seeded user: ${item.username} (score=${item.score}, rankingPosition=${item.rankingPosition})`,
    );
  }

  console.log(`Done. ${users.length} user(s) written to table "${tableName}".`);
}

function loadUsers(filePath: string): SeedUserInput[] {
  const raw = readFileSync(filePath, 'utf8');
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected a JSON array in ${filePath}`);
  }

  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Invalid user at index ${index}: expected an object`);
    }
    const { username, alias, password } = entry as Record<string, unknown>;
    if (typeof username !== 'string' || !username.trim()) {
      throw new Error(`Invalid username at index ${index}`);
    }
    if (typeof alias !== 'string' || !alias.trim()) {
      throw new Error(`Invalid alias at index ${index}`);
    }
    if (typeof password !== 'string' || !password.trim()) {
      throw new Error(`Invalid password at index ${index}`);
    }
    return { username: username.trim(), alias: alias.trim(), password };
  });
}

function assignUniqueRankingPositions(userCount: number): number[] {
  const positions = Array.from({ length: userCount }, (_, index) => index + 1);
  shuffle(positions);
  return positions;
}

function shuffle(values: number[]): void {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
}

function toSeedItem(user: SeedUserInput, rankingPosition: number): SeedUserItem {
  return { ...user, score: INITIAL_SCORE, rankingPosition };
}

async function putUser(
  client: DynamoDBDocumentClient,
  tableName: string,
  item: SeedUserItem,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exit(1);
});
