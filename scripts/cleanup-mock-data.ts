/**
 * Limpieza de datos mock en DynamoDB.
 *
 * Elimina:
 *   1. Matches con matchId que empieza con "mock-"
 *   2. Predictions con matchId que empieza con "mock-" (solo mocks, no toca el resto)
 *   3. TODOS los Stealers
 *   4. TODOS los BlockedVictims
 *   5. TODOS los StealPicks
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/cleanup-mock-data.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const MATCHES_TABLE = process.env.MATCHES_TABLE_NAME ?? 'Matches';
const PREDICTIONS_TABLE = process.env.PREDICTIONS_TABLE_NAME ?? 'Predictions';
const STEALERS_TABLE = process.env.STEALERS_TABLE_NAME ?? 'Stealers';
const STEAL_PICKS_TABLE = process.env.STEAL_PICKS_TABLE_NAME ?? 'StealPicks';
const BLOCKED_VICTIMS_TABLE = process.env.BLOCKED_VICTIMS_TABLE_NAME ?? 'BlockedVictims';

async function scanAll<T>(tableName: string): Promise<T[]> {
  const items: T[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({ TableName: tableName, ExclusiveStartKey: lastKey }),
    );
    items.push(...((response.Items as T[]) ?? []));
    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey !== undefined);

  return items;
}

async function deleteMockMatches(): Promise<number> {
  const all = await scanAll<{ matchId: string }>(MATCHES_TABLE);
  const mock = all.filter((m) => m.matchId.startsWith('mock-'));

  await Promise.all(
    mock.map((m) =>
      client.send(new DeleteCommand({ TableName: MATCHES_TABLE, Key: { matchId: m.matchId } })),
    ),
  );

  return mock.length;
}

async function deleteMockPredictions(): Promise<number> {
  const all = await scanAll<{ username: string; matchId: string }>(PREDICTIONS_TABLE);
  const mock = all.filter((p) => p.matchId.startsWith('mock-'));

  await Promise.all(
    mock.map((p) =>
      client.send(
        new DeleteCommand({
          TableName: PREDICTIONS_TABLE,
          Key: { username: p.username, matchId: p.matchId },
        }),
      ),
    ),
  );

  return mock.length;
}

async function deleteAllStealers(): Promise<number> {
  const all = await scanAll<{ dayId: string; stealerUsername: string }>(STEALERS_TABLE);

  await Promise.all(
    all.map((s) =>
      client.send(
        new DeleteCommand({
          TableName: STEALERS_TABLE,
          Key: { dayId: s.dayId, stealerUsername: s.stealerUsername },
        }),
      ),
    ),
  );

  return all.length;
}

async function deleteAllBlockedVictims(): Promise<number> {
  const all = await scanAll<{ username: string }>(BLOCKED_VICTIMS_TABLE);

  await Promise.all(
    all.map((b) =>
      client.send(
        new DeleteCommand({ TableName: BLOCKED_VICTIMS_TABLE, Key: { username: b.username } }),
      ),
    ),
  );

  return all.length;
}

async function deleteAllStealPicks(): Promise<number> {
  const all = await scanAll<{ calendarDate: string; stealerUsername: string }>(STEAL_PICKS_TABLE);

  await Promise.all(
    all.map((sp) =>
      client.send(
        new DeleteCommand({
          TableName: STEAL_PICKS_TABLE,
          Key: { calendarDate: sp.calendarDate, stealerUsername: sp.stealerUsername },
        }),
      ),
    ),
  );

  return all.length;
}

async function main(): Promise<void> {
  console.log('=== Limpieza de datos mock ===\n');

  console.log('Eliminando mock matches...');
  const matches = await deleteMockMatches();
  console.log(`  ${matches} mock match(es) eliminados.`);

  console.log('Eliminando mock predictions...');
  const predictions = await deleteMockPredictions();
  console.log(`  ${predictions} mock prediction(s) eliminadas.`);

  console.log('Eliminando stealers...');
  const stealers = await deleteAllStealers();
  console.log(`  ${stealers} stealer(s) eliminados.`);

  console.log('Eliminando blocked victims...');
  const blockedVictims = await deleteAllBlockedVictims();
  console.log(`  ${blockedVictims} blocked victim(s) eliminados.`);

  console.log('Eliminando steal picks...');
  const stealPicks = await deleteAllStealPicks();
  console.log(`  ${stealPicks} steal pick(s) eliminados.`);

  console.log('\nDone.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
