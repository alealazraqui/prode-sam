/**
 * Limpieza de datos mock en DynamoDB + re-seed de DayEvents.
 *
 * Elimina:
 *   - Matches con matchId que empieza con "mock-"
 *   - Predictions con matchId que empieza con "mock-"
 *   - Stealers con matchId que empieza con "mock-"
 *   - StealPicks con matchId que empieza con "mock-"
 *   - TODOS los DayEvents (para re-generarlos)
 *
 * Luego re-genera DayEvents a partir de los matches reales restantes.
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/cleanup-mock-data.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DayEventType } from '../src/shared/types/dayEventType';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const MATCHES_TABLE = process.env.MATCHES_TABLE_NAME ?? 'Matches';
const PREDICTIONS_TABLE = process.env.PREDICTIONS_TABLE_NAME ?? 'Predictions';
const STEALERS_TABLE = process.env.STEALERS_TABLE_NAME ?? 'Stealers';
const STEAL_PICKS_TABLE = process.env.STEAL_PICKS_TABLE_NAME ?? 'StealPicks';
const DAY_EVENTS_TABLE = process.env.DAY_EVENTS_TABLE_NAME ?? 'DayEvents';

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

async function deleteMockStealers(): Promise<number> {
  const all = await scanAll<{ dayId: string; stealerUsername: string; matchId?: string }>(
    STEALERS_TABLE,
  );
  const mock = all.filter((s) => s.matchId?.startsWith('mock-'));

  await Promise.all(
    mock.map((s) =>
      client.send(
        new DeleteCommand({
          TableName: STEALERS_TABLE,
          Key: { dayId: s.dayId, stealerUsername: s.stealerUsername },
        }),
      ),
    ),
  );

  return mock.length;
}

async function deleteMockStealPicks(): Promise<number> {
  const all = await scanAll<{ calendarDate: string; stealerUsername: string; matchId?: string }>(
    STEAL_PICKS_TABLE,
  );
  const mock = all.filter((sp) => sp.matchId?.startsWith('mock-'));

  await Promise.all(
    mock.map((sp) =>
      client.send(
        new DeleteCommand({
          TableName: STEAL_PICKS_TABLE,
          Key: { calendarDate: sp.calendarDate, stealerUsername: sp.stealerUsername },
        }),
      ),
    ),
  );

  return mock.length;
}

async function deleteAllDayEvents(): Promise<number> {
  const all = await scanAll<{ date: string }>(DAY_EVENTS_TABLE);

  await Promise.all(
    all.map((e) =>
      client.send(new DeleteCommand({ TableName: DAY_EVENTS_TABLE, Key: { date: e.date } })),
    ),
  );

  return all.length;
}

function pickRandomDayType(): DayEventType {
  const r = Math.random();
  if (r < 1 / 3) return DayEventType.Comun;
  if (r < 2 / 3) return DayEventType.Robo;
  return DayEventType.Jugadores;
}

async function reseedDayEvents(): Promise<number> {
  const matches = await scanAll<{ kickoffAt?: string }>(MATCHES_TABLE);

  const dates = new Set<string>();
  for (const m of matches) {
    if (m.kickoffAt) dates.add(m.kickoffAt.slice(0, 10));
  }

  const sorted = [...dates].sort();

  for (const date of sorted) {
    const eventType = pickRandomDayType();
    await client.send(
      new PutCommand({ TableName: DAY_EVENTS_TABLE, Item: { date, eventType } }),
    );
    console.log(`  Seeded day event: ${date} (${eventType})`);
  }

  return sorted.length;
}

async function main(): Promise<void> {
  console.log('=== Limpieza de datos mock ===\n');

  console.log('Eliminando mock matches...');
  const matches = await deleteMockMatches();
  console.log(`  ${matches} mock match(es) eliminados.`);

  console.log('Eliminando mock predictions...');
  const predictions = await deleteMockPredictions();
  console.log(`  ${predictions} mock prediction(s) eliminadas.`);

  console.log('Eliminando mock stealers...');
  const stealers = await deleteMockStealers();
  console.log(`  ${stealers} mock stealer(s) eliminados.`);

  console.log('Eliminando mock steal picks...');
  const stealPicks = await deleteMockStealPicks();
  console.log(`  ${stealPicks} mock steal pick(s) eliminados.`);

  console.log('\nEliminando todos los DayEvents...');
  const dayEvents = await deleteAllDayEvents();
  console.log(`  ${dayEvents} day event(s) eliminados.`);

  console.log('\nRe-generando DayEvents desde matches reales...');
  const seeded = await reseedDayEvents();
  console.log(`\nDone. ${seeded} day event(s) re-generados.`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
