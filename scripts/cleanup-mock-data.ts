/**
 * Limpieza de datos mock en DynamoDB y reset de arranque.
 *
 * Elimina:
 *   1. Matches con matchId que empieza con "mock-"
 *   2. Predictions con matchId que empieza con "mock-"
 *   3. TODOS los Stealers
 *   4. TODOS los BlockedVictims
 *   5. TODOS los StealPicks
 *   6. TODOS los LineupPicks
 *
 * Resetea usuarios:
 *   - score = 0
 *   - rankingDif = 0
 *   - rankingPosition = shuffle único del 1 al N
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/cleanup-mock-data.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { LineupPickItem } from '../src/shared/types/lineupPickItem';
import type { UserItem } from '../src/shared/types/userItem';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const USERS_TABLE = process.env.USERS_TABLE_NAME ?? 'Users';
const MATCHES_TABLE = process.env.MATCHES_TABLE_NAME ?? 'Matches';
const PREDICTIONS_TABLE = process.env.PREDICTIONS_TABLE_NAME ?? 'Predictions';
const STEALERS_TABLE = process.env.STEALERS_TABLE_NAME ?? 'Stealers';
const STEAL_PICKS_TABLE = process.env.STEAL_PICKS_TABLE_NAME ?? 'StealPicks';
const BLOCKED_VICTIMS_TABLE = process.env.BLOCKED_VICTIMS_TABLE_NAME ?? 'BlockedVictims';
const LINEUP_PICKS_TABLE = process.env.LINEUP_PICKS_TABLE_NAME ?? 'LineupPicks';

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

async function deleteAllLineupPicks(): Promise<number> {
  const all = await scanAll<LineupPickItem>(LINEUP_PICKS_TABLE);

  await Promise.all(
    all.map((pick) =>
      client.send(
        new DeleteCommand({
          TableName: LINEUP_PICKS_TABLE,
          Key: { eventDay: pick.eventDay, username: pick.username },
        }),
      ),
    ),
  );

  return all.length;
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

async function resetUsers(): Promise<number> {
  const users = await scanAll<UserItem>(USERS_TABLE);
  const rankingPositions = assignUniqueRankingPositions(users.length);

  await Promise.all(
    users.map((user, index) =>
      client.send(
        new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { username: user.username },
          UpdateExpression:
            'SET score = :score, rankingPosition = :rankingPosition, rankingDif = :rankingDif',
          ExpressionAttributeValues: {
            ':score': 0,
            ':rankingPosition': rankingPositions[index],
            ':rankingDif': 0,
          },
        }),
      ),
    ),
  );

  for (let i = 0; i < users.length; i += 1) {
    console.log(`  ${users[i].username}: score=0, rankingPosition=${rankingPositions[i]}`);
  }

  return users.length;
}

async function main(): Promise<void> {
  console.log('=== Limpieza de datos mock y reset de arranque ===\n');

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

  console.log('Eliminando lineup picks...');
  const lineupPicks = await deleteAllLineupPicks();
  console.log(`  ${lineupPicks} lineup pick(s) eliminados.`);

  console.log('\nReseteando usuarios (score=0, ranking aleatorio 1-N)...');
  const users = await resetUsers();
  console.log(`  ${users} usuario(s) actualizados.`);

  console.log('\n=== Listo ===');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
