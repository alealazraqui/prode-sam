/**
 * Seed de 3 partidos mock con fecha de hoy + predicciones aleatorias para todos los jugadores.
 *
 * Uso:
 *   AWS_PROFILE=prode-dev npm run seed:today-mock
 */

import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { MatchItem } from '../seed-matches/types';

const MATCHES_FILE = resolve(__dirname, 'mock-today-matches.csv');
const USERS_FILE = resolve(__dirname, '../seed-users/users.json');

type SeedPredictionItem = {
  username: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  updatedAt: string;
  kickoffAt: string;
  pointsCommon: null;
};

async function main(): Promise<void> {
  const matchesTable = resolveTableName('MATCHES_TABLE_NAME', 'Matches');
  const predictionsTable = resolveTableName('PREDICTIONS_TABLE_NAME', 'Predictions');
  const users = loadUsers();
  const matches = await loadMatchesFromCsv(MATCHES_FILE);
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const updatedAt = new Date().toISOString();

  for (const match of matches) {
    await putMatch(client, matchesTable, match);
    console.log(`Seeded match: ${match.matchId} (${match.homeTeamName} vs ${match.awayTeamName})`);
  }

  let predictionCount = 0;
  for (const match of matches) {
    for (const username of users) {
      const prediction = buildRandomPrediction(username, match, updatedAt);
      await putPrediction(client, predictionsTable, prediction);
      predictionCount += 1;
    }
    console.log(`Seeded ${users.length} random predictions for ${match.matchId}`);
  }

  console.log(
    `Done. ${matches.length} match(es) and ${predictionCount} prediction(s) written.`,
  );
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
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    items.push(parseMatchRow(row));
  }

  return items;
}

async function readCsvLines(filePath: string): Promise<string[]> {
  return new Promise((resolvePromise, reject) => {
    const lines: string[] = [];
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    rl.on('line', (line) => lines.push(line));
    rl.on('close', () => resolvePromise(lines));
    rl.on('error', reject);
  });
}

function parseCsvLine(line: string): string[] {
  return line.split(',').map((value) => value.trim());
}

function parseMatchRow(row: Record<string, string>): MatchItem {
  const matchId = row['matchId'];
  if (!matchId) throw new Error('Invalid row: matchId is required');

  const kickoffAt = row['kickoffAt'];
  if (!kickoffAt) throw new Error(`Invalid row: kickoffAt is required (matchId=${matchId})`);

  const status = Number(row['status']);
  if (!Number.isInteger(status) || (status !== 1 && status !== 2)) {
    throw new Error(`Invalid status "${row['status']}" for matchId=${matchId}. Expected 1 or 2.`);
  }

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
    isFirstRound: row['isFirstRound'] === 'true',
  };
}

function nullableString(value: string | undefined): string | null {
  return value === '' || value === undefined ? null : value;
}

function nullableNumber(value: string | undefined): number | null {
  if (value === '' || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveTableName(envKey: string, example: string): string {
  const tableName = process.env[envKey];
  if (!tableName) {
    throw new Error(`Missing ${envKey} (e.g. ${example}).`);
  }
  return tableName;
}

function loadUsers(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require(USERS_FILE) as Array<{ username: string }>;
  return raw.map((user) => user.username);
}

function buildRandomPrediction(
  username: string,
  match: MatchItem,
  updatedAt: string,
): SeedPredictionItem {
  return {
    username,
    matchId: match.matchId,
    homeGoals: randomGoal(),
    awayGoals: randomGoal(),
    updatedAt,
    kickoffAt: match.kickoffAt,
    pointsCommon: null,
  };
}

function randomGoal(): number {
  return Math.floor(Math.random() * 4);
}

async function putMatch(
  client: DynamoDBDocumentClient,
  tableName: string,
  item: MatchItem,
): Promise<void> {
  await client.send(new PutCommand({ TableName: tableName, Item: item }));
}

async function putPrediction(
  client: DynamoDBDocumentClient,
  tableName: string,
  item: SeedPredictionItem,
): Promise<void> {
  await client.send(new PutCommand({ TableName: tableName, Item: item }));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exit(1);
});
