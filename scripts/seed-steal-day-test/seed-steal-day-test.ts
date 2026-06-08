/**
 * Configura DynamoDB para probar la funcionalidad de robo en el día de hoy (Argentina):
 * - DayEvents: eventType robo
 * - Stealers: alejandro.alazraqui (sin pick) y sebastian.pasarin (ya robó a marco.munoz)
 * - BlockedVictims: bruno.munoz y marco.munoz
 * - 3 partidos de hoy: uno terminado (robo de sebastian → marco), uno a las 18:00 ART y otro a las 21:00 ART
 * - StealPick + predicciones asociadas
 *
 * Uso:
 *   AWS_PROFILE=prode-dev npm run seed:steal-test
 */

import { resolve } from 'node:path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { MatchItem } from '../seed-matches/types';
import type { DayEventItem } from '../../src/shared/types/dayEvent';
import type { StealPickItem } from '../../src/shared/types/stealPickItem';
import type { BlockedVictimItem, StealerItem } from '../../src/shared/types/stealer';
import type { PredictionItem } from '../../src/shared/types/predictionItem';
import { loadEnvLocal } from '../load-env-local';

const USERS_FILE = resolve(__dirname, '../seed-users/users.json');
const FINISHED_MATCH_ID = 'mock-today-finished';
const EVENING_MATCH_ID = 'mock-today-18h';
const LATE_MATCH_ID = 'mock-today-21h';
const MARCO_STOLEN_POINTS = 3;

function getArgentinaTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/** Hora local Argentina (ART, UTC-3) → ISO UTC. */
function buildArgentinaKickoffIso(date: string, hour: number, minute = 0): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0)).toISOString();
}

function loadUsers(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require(USERS_FILE) as Array<{ username: string }>;
  return raw.map((user) => user.username);
}

function buildTodayMatches(today: string): MatchItem[] {
  return [
    {
      matchId: FINISHED_MATCH_ID,
      homeTeamName: 'Chile',
      homeTeamCode: 'CL',
      awayTeamName: 'Paraguay',
      awayTeamCode: 'PY',
      homeGoals: 2,
      awayGoals: 1,
      kickoffAt: buildArgentinaKickoffIso(today, 11, 0),
      status: 2,
      isFirstRound: true,
    },
    {
      matchId: EVENING_MATCH_ID,
      homeTeamName: 'Argentina',
      homeTeamCode: 'AR',
      awayTeamName: 'Bolivia',
      awayTeamCode: 'BO',
      homeGoals: null,
      awayGoals: null,
      kickoffAt: buildArgentinaKickoffIso(today, 18, 0),
      status: 1,
      isFirstRound: true,
    },
    {
      matchId: LATE_MATCH_ID,
      homeTeamName: 'Brasil',
      homeTeamCode: 'BR',
      awayTeamName: 'Uruguay',
      awayTeamCode: 'UY',
      homeGoals: null,
      awayGoals: null,
      kickoffAt: buildArgentinaKickoffIso(today, 21, 0),
      status: 1,
      isFirstRound: true,
    },
  ];
}

function buildPredictions(matches: MatchItem[], users: string[], updatedAt: string): PredictionItem[] {
  const predictions: PredictionItem[] = [];

  for (const match of matches) {
    for (const username of users) {
      const isFinishedMatch = match.status === 2;
      const isMarcoOnFinished = isFinishedMatch && username === 'marco.munoz';

      predictions.push({
        username,
        matchId: match.matchId,
        homeGoals: isMarcoOnFinished ? 2 : randomGoal(),
        awayGoals: isMarcoOnFinished ? 1 : randomGoal(),
        updatedAt,
        kickoffAt: match.kickoffAt,
        pointsCommon: isMarcoOnFinished ? MARCO_STOLEN_POINTS : null,
      });
    }
  }

  return predictions;
}

function randomGoal(): number {
  return Math.floor(Math.random() * 4);
}

async function main(): Promise<void> {
  loadEnvLocal();
  const dayEventsTable = resolveTableName('DAY_EVENTS_TABLE_NAME', 'DayEvents');
  const stealersTable = resolveTableName('STEALERS_TABLE_NAME', 'Stealers');
  const blockedVictimsTable = resolveTableName('BLOCKED_VICTIMS_TABLE_NAME', 'BlockedVictims');
  const stealPicksTable = resolveTableName('STEAL_PICKS_TABLE_NAME', 'StealPicks');
  const matchesTable = resolveTableName('MATCHES_TABLE_NAME', 'Matches');
  const predictionsTable = resolveTableName('PREDICTIONS_TABLE_NAME', 'Predictions');
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const today = getArgentinaTodayDateString();
  const updatedAt = new Date().toISOString();
  const users = loadUsers();
  const matches = buildTodayMatches(today);

  const dayEvent: DayEventItem = {
    date: today,
    eventType: 'robo',
  };

  await client.send(new PutCommand({ TableName: dayEventsTable, Item: dayEvent }));
  console.log(`✓ Día ${today} marcado como robo en ${dayEventsTable}`);

  const stealers: StealerItem[] = [
    { dayId: today, stealerUsername: 'alejandro.alazraqui' },
    {
      dayId: today,
      stealerUsername: 'sebastian.pasarin',
      matchId: FINISHED_MATCH_ID,
      victimUsername: 'marco.munoz',
    },
  ];

  for (const stealer of stealers) {
    await client.send(new PutCommand({ TableName: stealersTable, Item: stealer }));
    console.log(`✓ Stealer: ${stealer.stealerUsername}`);
  }

  const blockedVictims: BlockedVictimItem[] = [
    { username: 'bruno.munoz' },
    { username: 'marco.munoz' },
  ];

  for (const victim of blockedVictims) {
    await client.send(new PutCommand({ TableName: blockedVictimsTable, Item: victim }));
    console.log(`✓ BlockedVictim: ${victim.username}`);
  }

  const stealPick: StealPickItem = {
    calendarDate: today,
    stealerUsername: 'sebastian.pasarin',
    victimUsername: 'marco.munoz',
    matchId: FINISHED_MATCH_ID,
    stolenPoints: MARCO_STOLEN_POINTS,
  };

  await client.send(new PutCommand({ TableName: stealPicksTable, Item: stealPick }));
  console.log(
    `✓ StealPick: sebastian.pasarin → marco.munoz (${MARCO_STOLEN_POINTS} pts) en ${FINISHED_MATCH_ID}`,
  );

  for (const match of matches) {
    await client.send(new PutCommand({ TableName: matchesTable, Item: match }));
    console.log(
      `✓ Partido ${match.matchId}: ${match.homeTeamName} vs ${match.awayTeamName} (${describeMatchSchedule(match)})`,
    );
  }

  const predictions = buildPredictions(matches, users, updatedAt);
  for (const prediction of predictions) {
    await client.send(new PutCommand({ TableName: predictionsTable, Item: prediction }));
  }
  console.log(`✓ ${predictions.length} predicciones escritas en ${predictionsTable}`);

  console.log('\nListo para probar:');
  console.log(`  - Fecha calendario: ${today}`);
  console.log(`  - Login como alejandro.alazraqui → robar en ${EVENING_MATCH_ID} (18:00) o ${LATE_MATCH_ID} (21:00), no en ambos`);
  console.log(`  - bruno.munoz y marco.munoz aparecen bloqueados en el selector`);
  console.log(`  - Partido terminado ${FINISHED_MATCH_ID}: sebastian robó ${MARCO_STOLEN_POINTS} pts a marco`);
}

function describeMatchSchedule(match: MatchItem): string {
  if (match.status === 2) return 'terminado';
  if (match.matchId === EVENING_MATCH_ID) return '18:00 ART';
  if (match.matchId === LATE_MATCH_ID) return '21:00 ART';
  return 'programado';
}

function resolveTableName(envKey: string, example: string): string {
  const tableName = process.env[envKey];
  if (!tableName) {
    throw new Error(`Missing ${envKey} (e.g. ${example}).`);
  }
  return tableName;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exit(1);
});
