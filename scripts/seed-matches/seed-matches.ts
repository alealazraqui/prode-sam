import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { MatchItem } from './types';

const DEFAULT_MATCHES_FILE = resolve(__dirname, 'matches.csv');

async function main(): Promise<void> {
  const { tableName: cliTable, matchesFile } = parseArgs(process.argv.slice(2));
  const tableName = resolveTableName(cliTable);
  await seedMatches(tableName, matchesFile);
}

function parseArgs(argv: string[]): { tableName?: string; matchesFile: string } {
  let tableName: string | undefined;
  let matchesFile = DEFAULT_MATCHES_FILE;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--table' && argv[i + 1]) {
      tableName = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--table=')) {
      tableName = arg.slice('--table='.length);
    } else if (arg === '--file' && argv[i + 1]) {
      matchesFile = resolve(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--file=')) {
      matchesFile = resolve(arg.slice('--file='.length));
    }
  }

  return { tableName, matchesFile };
}

function resolveTableName(cliTable?: string): string {
  const tableName = cliTable ?? process.env.MATCHES_TABLE_NAME;
  if (!tableName) {
    throw new Error(
      'Missing table name. Set MATCHES_TABLE_NAME or pass --table <name> (e.g. Matches).',
    );
  }
  return tableName;
}

async function seedMatches(tableName: string, matchesFile: string): Promise<void> {
  const matches = await loadMatchesFromCsv(matchesFile);
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

  for (const item of matches) {
    await putMatch(client, tableName, item);
    console.log(`Seeded match: ${item.matchId} (${item.homeTeamName} vs ${item.awayTeamName})`);
  }

  console.log(`Done. ${matches.length} match(es) written to table "${tableName}".`);
}

async function loadMatchesFromCsv(filePath: string): Promise<MatchItem[]> {
  const lines = await readCsvLines(filePath);

  if (lines.length < 2) {
    throw new Error(`CSV file "${filePath}" is empty or missing data rows.`);
  }

  const headers = parseCsvLine(lines[0]);
  const items: MatchItem[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((h, idx) => [h, values[idx] ?? '']));
    items.push(parseMatchRow(row));
  }

  return items;
}

async function readCsvLines(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    rl.on('line', (line) => lines.push(line));
    rl.on('close', () => resolve(lines));
    rl.on('error', reject);
  });
}

function parseCsvLine(line: string): string[] {
  return line.split(',').map((v) => v.trim());
}

export function parseMatchRow(row: Record<string, string>): MatchItem {
  const matchId = row['matchId'];
  if (!matchId) throw new Error(`Invalid row: matchId is required`);

  const kickoffAt = row['kickoffAt'];
  if (!kickoffAt) throw new Error(`Invalid row: kickoffAt is required (matchId=${matchId})`);

  const statusRaw = row['status'];
  const status = Number(statusRaw);
  if (!Number.isInteger(status) || (status !== 1 && status !== 2)) {
    throw new Error(`Invalid status "${statusRaw}" for matchId=${matchId}. Expected 1 or 2.`);
  }

  const isFirstRound = row['isFirstRound'] === 'true';

  return {
    matchId,
    homeTeamName: row['homeTeamName'] ?? '',
    homeTeamCode: nullableString(row['homeTeamCode']),
    awayTeamName: row['awayTeamName'] ?? '',
    awayTeamCode: nullableString(row['awayTeamCode']),
    homeGoals: nullableNumber(row['homeGoals']),
    awayGoals: nullableNumber(row['awayGoals']),
    kickoffAt,
    status,
    isFirstRound,
  };
}

function nullableString(value: string | undefined): string | null {
  return value === '' || value === undefined ? null : value;
}

function nullableNumber(value: string | undefined): number | null {
  if (value === '' || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function putMatch(
  client: DynamoDBDocumentClient,
  tableName: string,
  item: MatchItem,
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
