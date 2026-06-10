/**
 * Limpieza de datos del 2026-06-08 (Uruguay-Colombia y México-Chile).
 *
 * Elimina:
 *   1. Predictions de mock-jun08-1 y mock-jun08-2
 *   2. Los dos matches
 *   3. DayEvent del 2026-06-08
 *   4. Todos los LineupPicks del 2026-06-08
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/cleanup-jun08.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const EVENT_DAY = '2026-06-08';
const MATCH_IDS = ['mock-jun08-1', 'mock-jun08-2'] as const;

const MATCHES_TABLE = process.env.MATCHES_TABLE_NAME ?? 'Matches';
const PREDICTIONS_TABLE = process.env.PREDICTIONS_TABLE_NAME ?? 'Predictions';
const DAY_EVENTS_TABLE = process.env.DAY_EVENTS_TABLE_NAME ?? 'DayEvents';
const LINEUP_PICKS_TABLE = process.env.LINEUP_PICKS_TABLE_NAME ?? 'LineupPicks';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

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

async function deletePredictions(): Promise<number> {
  const all = await scanAll<{ username: string; matchId: string }>(PREDICTIONS_TABLE);
  const toDelete = all.filter((p) => MATCH_IDS.includes(p.matchId as (typeof MATCH_IDS)[number]));

  await Promise.all(
    toDelete.map((p) =>
      client.send(
        new DeleteCommand({
          TableName: PREDICTIONS_TABLE,
          Key: { username: p.username, matchId: p.matchId },
        }),
      ),
    ),
  );

  return toDelete.length;
}

async function deleteMatches(): Promise<number> {
  await Promise.all(
    MATCH_IDS.map((matchId) =>
      client.send(new DeleteCommand({ TableName: MATCHES_TABLE, Key: { matchId } })),
    ),
  );

  return MATCH_IDS.length;
}

async function deleteDayEvent(): Promise<boolean> {
  await client.send(
    new DeleteCommand({
      TableName: DAY_EVENTS_TABLE,
      Key: { date: EVENT_DAY },
    }),
  );

  return true;
}

async function deleteLineupPicks(): Promise<number> {
  const response = await client.send(
    new QueryCommand({
      TableName: LINEUP_PICKS_TABLE,
      KeyConditionExpression: 'eventDay = :eventDay',
      ExpressionAttributeValues: { ':eventDay': EVENT_DAY },
    }),
  );

  const picks = (response.Items as { eventDay: string; username: string }[]) ?? [];

  await Promise.all(
    picks.map((pick) =>
      client.send(
        new DeleteCommand({
          TableName: LINEUP_PICKS_TABLE,
          Key: { eventDay: pick.eventDay, username: pick.username },
        }),
      ),
    ),
  );

  return picks.length;
}

async function main(): Promise<void> {
  console.log(`=== Limpieza ${EVENT_DAY} (${MATCH_IDS.join(', ')}) ===\n`);

  console.log('Eliminando predictions...');
  const predictions = await deletePredictions();
  console.log(`  ${predictions} prediction(s) eliminadas.`);

  console.log('Eliminando matches...');
  const matches = await deleteMatches();
  console.log(`  ${matches} match(es) eliminados.`);

  console.log('Eliminando DayEvent...');
  await deleteDayEvent();
  console.log(`  DayEvent ${EVENT_DAY} eliminado.`);

  console.log('Eliminando LineupPicks...');
  const lineupPicks = await deleteLineupPicks();
  console.log(`  ${lineupPicks} lineup pick(s) eliminados.`);

  console.log('\nDone.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
