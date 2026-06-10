/**
 * Escenario de prueba de sumatoria de puntajes para el 2026-06-08.
 *
 * - Predicciones aleatorias para mock-jun08-1 (URU 2-1 COL) y mock-jun08-2 (MEX 0-0 CHI)
 * - LineupPicks del día con jugadores de URU/COL/MEX/CHI y points=null
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/seed-jun08-scoring-test.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

import type { MatchItem } from '../src/functions/get-matches/types';
import { scoreCalculator } from '../src/shared/scoring/scoreCalculator';
import type { LineupPickItem } from '../src/shared/types/lineupPickItem';
import type { PredictionItem } from '../src/shared/types/predictionItem';
import type { UserItem } from '../src/shared/types/userItem';

const EVENT_DAY = '2026-06-08';

const USERS_TABLE = process.env.USERS_TABLE_NAME ?? 'Users';
const PREDICTIONS_TABLE = process.env.PREDICTIONS_TABLE_NAME ?? 'Predictions';
const LINEUP_PICKS_TABLE = process.env.LINEUP_PICKS_TABLE_NAME ?? 'LineupPicks';

const MATCH_IDS = ['mock-jun08-1', 'mock-jun08-2'] as const;

const MATCHES: MatchItem[] = [
  {
    matchId: 'mock-jun08-1',
    homeTeamName: 'Uruguay',
    homeTeamCode: 'URU',
    awayTeamName: 'Colombia',
    awayTeamCode: 'COL',
    homeGoals: 2,
    awayGoals: 1,
    kickoffAt: '2026-06-08T18:00:00.000Z',
    status: 2,
    isFirstRound: false,
  },
  {
    matchId: 'mock-jun08-2',
    homeTeamName: 'México',
    homeTeamCode: 'MEX',
    awayTeamName: 'Chile',
    awayTeamCode: 'CHI',
    homeGoals: 0,
    awayGoals: 0,
    kickoffAt: '2026-06-09T00:00:00.000Z',
    status: 2,
    isFirstRound: false,
  },
];

const DEFENSORS = [
  'José María Giménez',
  'Ronald Araújo',
  'Davinson Sánchez',
  'César Montes',
  'Gary Medel',
  'Sebastián Coates',
  'Jorge Sánchez',
  'Paulo Díaz',
  'Matías Viñuela',
  'Gabriel Suazo',
];

const MEDIOCAMPISTAS = [
  'Federico Valverde',
  'James Rodríguez',
  'Edson Álvarez',
  'Arturo Vidal',
  'Rodrigo Bentancur',
  'Jefferson Lerma',
  'Luis Chávez',
  'Charles Aránguiz',
  'Manuel Ugarte',
  'Jhon Arias',
];

const DELANTEROS = [
  'Luis Suárez',
  'Luis Díaz',
  'Raúl Jiménez',
  'Alexis Sánchez',
  'Darwin Núñez',
  'Rafael Santos Borré',
  'Santiago Giménez',
  'Eduardo Vargas',
  'Hirving Lozano',
  'Miguel Borja',
  'Facundo Pellistri',
];

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

function randomGoals(max = 3): number {
  return Math.floor(Math.random() * (max + 1));
}

function pickFromPool<T>(pool: T[], index: number, offset = 0): T {
  return pool[(index + offset) % pool.length]!;
}

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

async function getLineupPicksForDay(): Promise<LineupPickItem[]> {
  const response = await client.send(
    new QueryCommand({
      TableName: LINEUP_PICKS_TABLE,
      KeyConditionExpression: 'eventDay = :eventDay',
      ExpressionAttributeValues: { ':eventDay': EVENT_DAY },
    }),
  );

  return (response.Items as LineupPickItem[]) ?? [];
}

function buildPrediction(username: string, match: MatchItem, updatedAt: string): PredictionItem {
  const homeGoals = randomGoals();
  const awayGoals = randomGoals();
  const prediction: PredictionItem = {
    username,
    matchId: match.matchId,
    homeGoals,
    awayGoals,
    updatedAt,
    kickoffAt: match.kickoffAt,
  };

  return {
    ...prediction,
    pointsCommon: scoreCalculator(prediction, {
      status: 2,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
    }).pointsCommon,
  };
}

async function seedPredictions(users: UserItem[]): Promise<void> {
  const updatedAt = new Date().toISOString();
  let total = 0;

  for (const match of MATCHES) {
    for (const user of users) {
      const item = buildPrediction(user.username, match, updatedAt);
      await client.send(
        new PutCommand({
          TableName: PREDICTIONS_TABLE,
          Item: item,
        }),
      );
      total += 1;
      console.log(
        `  ✓ ${user.username} @ ${match.matchId}: ${item.homeGoals}-${item.awayGoals} → ${item.pointsCommon} pts`,
      );
    }
  }

  console.log(`\n${total} prediction(s) escritas en "${PREDICTIONS_TABLE}".`);
}

async function updateLineupPicks(picks: LineupPickItem[]): Promise<void> {
  const sorted = [...picks].sort((a, b) => a.username.localeCompare(b.username));

  for (const [index, pick] of sorted.entries()) {
    const defensor = pickFromPool(DEFENSORS, index);
    const mediocampista = pickFromPool(MEDIOCAMPISTAS, index, 2);
    const delantero = pickFromPool(DELANTEROS, index, 4);

    await client.send(
      new UpdateCommand({
        TableName: LINEUP_PICKS_TABLE,
        Key: { eventDay: pick.eventDay, username: pick.username },
        UpdateExpression:
          'SET defensor = :defensor, mediocampista = :mediocampista, delantero = :delantero, #points = :points',
        ExpressionAttributeNames: { '#points': 'points' },
        ExpressionAttributeValues: {
          ':defensor': defensor,
          ':mediocampista': mediocampista,
          ':delantero': delantero,
          ':points': null,
        },
      }),
    );

    console.log(
      `  ✓ ${pick.alias}: ${defensor} / ${mediocampista} / ${delantero} → null pts`,
    );
  }

  console.log(`\n${sorted.length} lineup pick(s) actualizado(s).`);
}

async function main(): Promise<void> {
  console.log(`=== Seed scoring test (${EVENT_DAY}) ===\n`);

  const users = await scanAll<UserItem>(USERS_TABLE);
  if (users.length === 0) {
    throw new Error(`No users found in "${USERS_TABLE}".`);
  }

  console.log(`Generando predicciones aleatorias (${MATCH_IDS.join(', ')})...`);
  await seedPredictions(users);

  const picks = await getLineupPicksForDay();
  if (picks.length === 0) {
    throw new Error(`No lineup picks found for ${EVENT_DAY}.`);
  }

  console.log(`\nActualizando LineupPicks (${picks.length}) con jugadores URU/COL/MEX/CHI...`);
  await updateLineupPicks(picks);

  console.log('\n=== Listo ===');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
