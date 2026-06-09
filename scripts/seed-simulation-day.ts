/**
 * Seed de día de simulación.
 *
 * - Users: score=0, rankingPosition por alias alfabético
 * - Matches: 4 partidos mock de hoy (status=1, goles null — sin jugar)
 * - DayEvent: hoy como 'robo'
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/seed-simulation-day.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DayEventType } from '../src/shared/types/dayEventType';
import type { UserItem } from '../src/shared/types/userItem';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const USERS_TABLE = process.env.USERS_TABLE_NAME ?? 'Users';
const MATCHES_TABLE = process.env.MATCHES_TABLE_NAME ?? 'Matches';
const PREDICTIONS_TABLE = process.env.PREDICTIONS_TABLE_NAME ?? 'Predictions';
const DAY_EVENTS_TABLE = process.env.DAY_EVENTS_TABLE_NAME ?? 'DayEvents';

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const TODAY = new Date().toLocaleDateString('en-CA', {
  timeZone: ARGENTINA_TIME_ZONE,
});

/** Convierte hora local Argentina (HH:mm) a ISO UTC para almacenar en DynamoDB. */
function argentinaLocalToUtcIso(date: string, hour: number, minute = 0): string {
  const [year, month, day] = date.split('-').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(utcGuess));
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const offsetMinutes =
    (hour - get('hour')) * 60 + (minute - get('minute')) + (day - get('day')) * 24 * 60;

  return new Date(utcGuess + offsetMinutes * 60_000).toISOString();
}

const MOCK_MATCHES = [
  {
    matchId: 'mock-today-1',
    homeTeamName: 'Azerbaiyán',
    homeTeamCode: 'AZE',
    awayTeamName: 'San Marino',
    awayTeamCode: 'SMR',
    homeGoals: null,
    awayGoals: null,
    kickoffAt: argentinaLocalToUtcIso(TODAY, 15),
    status: 1,
    isFirstRound: false,
  },
  {
    matchId: 'mock-today-2',
    homeTeamName: 'Arabia Saudita',
    homeTeamCode: 'KSA',
    awayTeamName: 'Senegal',
    awayTeamCode: 'SEN',
    homeGoals: null,
    awayGoals: null,
    kickoffAt: argentinaLocalToUtcIso(TODAY, 20),
    status: 1,
    isFirstRound: false,
  },
  {
    matchId: 'mock-today-3',
    homeTeamName: 'Argentina',
    homeTeamCode: 'ARG',
    awayTeamName: 'Islandia',
    awayTeamCode: 'ISL',
    homeGoals: null,
    awayGoals: null,
    kickoffAt: argentinaLocalToUtcIso(TODAY, 22),
    status: 1,
    isFirstRound: false,
  },
  {
    matchId: 'mock-today-4',
    homeTeamName: 'Irak',
    homeTeamCode: 'IRQ',
    awayTeamName: 'Venezuela',
    awayTeamCode: 'VEN',
    homeGoals: null,
    awayGoals: null,
    kickoffAt: argentinaLocalToUtcIso(TODAY, 22),
    status: 1,
    isFirstRound: false,
  },
];

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

async function resetUsers(): Promise<void> {
  const users = await scanAll<UserItem>(USERS_TABLE);
  const sorted = [...users].sort((a, b) =>
    (a.alias ?? a.username).localeCompare(b.alias ?? b.username, 'es'),
  );

  await Promise.all(
    sorted.map((user, index) => {
      const item: UserItem = {
        ...user,
        score: 0,
        rankingPosition: index + 1,
      };
      return client.send(new PutCommand({ TableName: USERS_TABLE, Item: item }));
    }),
  );

  for (let i = 0; i < sorted.length; i += 1) {
    const user = sorted[i];
    console.log(`  ✓ ${user.alias ?? user.username}: score=0, rankingPosition=${i + 1}`);
  }
}

async function seedMatches(): Promise<void> {
  await Promise.all(
    MOCK_MATCHES.map((match) =>
      client.send(new PutCommand({ TableName: MATCHES_TABLE, Item: match })),
    ),
  );

  for (const match of MOCK_MATCHES) {
    console.log(
      `  ✓ ${match.matchId}: ${match.homeTeamName} vs ${match.awayTeamName} @ ${match.kickoffAt} (status=1, sin resultado)`,
    );
  }
}

async function syncMockPredictionsKickoffAt(): Promise<void> {
  const kickoffByMatchId = Object.fromEntries(MOCK_MATCHES.map((m) => [m.matchId, m.kickoffAt]));
  const predictions = await scanAll<{ username: string; matchId: string }>(PREDICTIONS_TABLE);
  const mockPredictions = predictions.filter((p) => p.matchId.startsWith('mock-'));

  await Promise.all(
    mockPredictions.map((p) => {
      const kickoffAt = kickoffByMatchId[p.matchId];
      if (!kickoffAt) return Promise.resolve();
      return client.send(
        new UpdateCommand({
          TableName: PREDICTIONS_TABLE,
          Key: { username: p.username, matchId: p.matchId },
          UpdateExpression: 'SET kickoffAt = :kickoffAt',
          ExpressionAttributeValues: { ':kickoffAt': kickoffAt },
        }),
      );
    }),
  );

  console.log(
    `  ${mockPredictions.length} prediction(s) mock actualizadas con kickoffAt correcto.`,
  );
}

async function seedDayEvent(): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: DAY_EVENTS_TABLE,
      Item: { date: TODAY, eventType: DayEventType.Robo },
    }),
  );
  console.log(`  ✓ DayEvent ${TODAY}: robo`);
}

function parseArgs(argv: string[]): { matchesOnly: boolean } {
  return { matchesOnly: argv.includes('--matches-only') };
}

async function main(): Promise<void> {
  const { matchesOnly } = parseArgs(process.argv.slice(2));
  console.log(`=== Seed simulación (${TODAY}) ===\n`);

  if (!matchesOnly) {
    console.log('Reseteando users (score=0, ranking alfabético por alias)...');
    await resetUsers();
  }

  console.log('\nCargando partidos mock (status=1, goles null)...');
  await seedMatches();

  console.log('\nSincronizando kickoffAt en predictions mock...');
  await syncMockPredictionsKickoffAt();

  if (!matchesOnly) {
    console.log('\nConfigurando DayEvent de hoy...');
    await seedDayEvent();
  }

  console.log('\n=== Listo ===');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
