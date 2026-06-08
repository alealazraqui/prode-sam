/**
 * Seed de escenario de prueba de robo de puntos.
 *
 * Limpia datos mock previos, luego crea:
 *   - 3 partidos mock para hoy (kickoffAt pasado, listos para upload-matches)
 *   - Predicciones para stealers y victims
 *   - Stealers, BlockedVictims y StealPicks
 *   - DayEvent de hoy como 'robo'
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/seed-steal-test-scenario.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const MATCHES_TABLE = process.env.MATCHES_TABLE_NAME ?? 'Matches';
const PREDICTIONS_TABLE = process.env.PREDICTIONS_TABLE_NAME ?? 'Predictions';
const STEAL_PICKS_TABLE = process.env.STEAL_PICKS_TABLE_NAME ?? 'StealPicks';
const STEALERS_TABLE = process.env.STEALERS_TABLE_NAME ?? 'Stealers';
const BLOCKED_VICTIMS_TABLE = process.env.BLOCKED_VICTIMS_TABLE_NAME ?? 'BlockedVictims';
const DAY_EVENTS_TABLE = process.env.DAY_EVENTS_TABLE_NAME ?? 'DayEvents';

// Fecha de hoy en Argentina (UTC-3)
const TODAY = new Date().toLocaleDateString('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
});

// 3 partidos mock para hoy — kickoffAt en el pasado para que upload-matches los procese
const MOCK_MATCHES = [
  {
    matchId: 'mock-today-1',
    homeTeamName: 'Argentina',
    homeTeamCode: 'ARG',
    awayTeamName: 'Brasil',
    awayTeamCode: 'BRA',
    homeGoals: null,
    awayGoals: null,
    kickoffAt: `${TODAY}T14:00:00.000Z`,
    status: 1,
    isFirstRound: false,
  },
  {
    matchId: 'mock-today-2',
    homeTeamName: 'España',
    homeTeamCode: 'ESP',
    awayTeamName: 'Francia',
    awayTeamCode: 'FRA',
    homeGoals: null,
    awayGoals: null,
    kickoffAt: `${TODAY}T16:00:00.000Z`,
    status: 1,
    isFirstRound: false,
  },
  {
    matchId: 'mock-today-3',
    homeTeamName: 'Alemania',
    homeTeamCode: 'GER',
    awayTeamName: 'Italia',
    awayTeamCode: 'ITA',
    homeGoals: null,
    awayGoals: null,
    kickoffAt: `${TODAY}T18:00:00.000Z`,
    status: 1,
    isFirstRound: false,
  },
];

// Stealers → Victims (para cada matchId)
const STEAL_SCENARIO = [
  {
    stealer: 'alejandro.alazraqui',
    victim: 'marco.munoz',
    matchId: 'mock-today-1',
  },
  {
    stealer: 'bruno.munoz',
    victim: 'nicolas.sanchez',
    matchId: 'mock-today-2',
  },
  {
    stealer: 'simbad.peralta',
    victim: 'thomas.colagiovanni',
    matchId: 'mock-today-3',
  },
];

// Predicciones de los 11 jugadores para los 3 partidos (33 en total)
// Las predicciones de las víctimas son las que determinarán el stolenPoints
const PREDICTIONS: Array<{
  username: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
}> = [
  // --- mock-today-1: Argentina vs Brasil ---
  // marco.munoz es víctima de alejandro → predicción clave para stolenPoints
  { username: 'alejandro.alazraqui', matchId: 'mock-today-1', homeGoals: 2, awayGoals: 0 },
  { username: 'bruno.munoz', matchId: 'mock-today-1', homeGoals: 1, awayGoals: 0 },
  { username: 'marco.munoz', matchId: 'mock-today-1', homeGoals: 1, awayGoals: 0 },
  { username: 'simbad.peralta', matchId: 'mock-today-1', homeGoals: 2, awayGoals: 1 },
  { username: 'sebastian.pasarin', matchId: 'mock-today-1', homeGoals: 0, awayGoals: 0 },
  { username: 'nicolas.sanchez', matchId: 'mock-today-1', homeGoals: 3, awayGoals: 1 },
  { username: 'franco.dicarlo', matchId: 'mock-today-1', homeGoals: 2, awayGoals: 0 },
  { username: 'thomas.colagiovanni', matchId: 'mock-today-1', homeGoals: 1, awayGoals: 1 },
  { username: 'julian.borgo', matchId: 'mock-today-1', homeGoals: 0, awayGoals: 1 },
  { username: 'agustin.martinez', matchId: 'mock-today-1', homeGoals: 2, awayGoals: 0 },
  { username: 'daniel.golluscio', matchId: 'mock-today-1', homeGoals: 1, awayGoals: 2 },

  // --- mock-today-2: España vs Francia ---
  // nicolas.sanchez es víctima de bruno → predicción clave para stolenPoints
  { username: 'alejandro.alazraqui', matchId: 'mock-today-2', homeGoals: 1, awayGoals: 0 },
  { username: 'bruno.munoz', matchId: 'mock-today-2', homeGoals: 1, awayGoals: 1 },
  { username: 'marco.munoz', matchId: 'mock-today-2', homeGoals: 2, awayGoals: 0 },
  { username: 'simbad.peralta', matchId: 'mock-today-2', homeGoals: 0, awayGoals: 1 },
  { username: 'sebastian.pasarin', matchId: 'mock-today-2', homeGoals: 1, awayGoals: 0 },
  { username: 'nicolas.sanchez', matchId: 'mock-today-2', homeGoals: 2, awayGoals: 1 },
  { username: 'franco.dicarlo', matchId: 'mock-today-2', homeGoals: 1, awayGoals: 1 },
  { username: 'thomas.colagiovanni', matchId: 'mock-today-2', homeGoals: 0, awayGoals: 0 },
  { username: 'julian.borgo', matchId: 'mock-today-2', homeGoals: 1, awayGoals: 2 },
  { username: 'agustin.martinez', matchId: 'mock-today-2', homeGoals: 2, awayGoals: 0 },
  { username: 'daniel.golluscio', matchId: 'mock-today-2', homeGoals: 0, awayGoals: 1 },

  // --- mock-today-3: Alemania vs Italia ---
  // thomas.colagiovanni es víctima de simbad → predicción clave para stolenPoints
  { username: 'alejandro.alazraqui', matchId: 'mock-today-3', homeGoals: 1, awayGoals: 0 },
  { username: 'bruno.munoz', matchId: 'mock-today-3', homeGoals: 2, awayGoals: 1 },
  { username: 'marco.munoz', matchId: 'mock-today-3', homeGoals: 0, awayGoals: 0 },
  { username: 'simbad.peralta', matchId: 'mock-today-3', homeGoals: 0, awayGoals: 0 },
  { username: 'sebastian.pasarin', matchId: 'mock-today-3', homeGoals: 1, awayGoals: 1 },
  { username: 'nicolas.sanchez', matchId: 'mock-today-3', homeGoals: 2, awayGoals: 0 },
  { username: 'franco.dicarlo', matchId: 'mock-today-3', homeGoals: 1, awayGoals: 0 },
  { username: 'thomas.colagiovanni', matchId: 'mock-today-3', homeGoals: 1, awayGoals: 2 },
  { username: 'julian.borgo', matchId: 'mock-today-3', homeGoals: 0, awayGoals: 0 },
  { username: 'agustin.martinez', matchId: 'mock-today-3', homeGoals: 3, awayGoals: 0 },
  { username: 'daniel.golluscio', matchId: 'mock-today-3', homeGoals: 0, awayGoals: 1 },
];

async function scanAll<T>(tableName: string): Promise<T[]> {
  const response = await client.send(new ScanCommand({ TableName: tableName }));
  return (response.Items as T[]) ?? [];
}

async function cleanMockData(): Promise<void> {
  console.log('Limpiando datos mock previos...');

  const [matches, predictions, stealPicks, stealers, blocked] = await Promise.all([
    scanAll<{ matchId: string }>(MATCHES_TABLE),
    scanAll<{ username: string; matchId: string }>(PREDICTIONS_TABLE),
    scanAll<{ calendarDate: string; stealerUsername: string }>(STEAL_PICKS_TABLE),
    scanAll<{ dayId: string; stealerUsername: string }>(STEALERS_TABLE),
    scanAll<{ username: string }>(BLOCKED_VICTIMS_TABLE),
  ]);

  const mockMatches = matches.filter((m) => m.matchId.startsWith('mock-'));
  const mockPredictions = predictions.filter((p) => p.matchId.startsWith('mock-'));
  const allStealPicks = stealPicks;
  const allStealers = stealers;
  const allBlocked = blocked;

  await Promise.all([
    ...mockMatches.map((m) =>
      client.send(new DeleteCommand({ TableName: MATCHES_TABLE, Key: { matchId: m.matchId } })),
    ),
    ...mockPredictions.map((p) =>
      client.send(
        new DeleteCommand({
          TableName: PREDICTIONS_TABLE,
          Key: { username: p.username, matchId: p.matchId },
        }),
      ),
    ),
    ...allStealPicks.map((sp) =>
      client.send(
        new DeleteCommand({
          TableName: STEAL_PICKS_TABLE,
          Key: { calendarDate: sp.calendarDate, stealerUsername: sp.stealerUsername },
        }),
      ),
    ),
    ...allStealers.map((s) =>
      client.send(
        new DeleteCommand({
          TableName: STEALERS_TABLE,
          Key: { dayId: s.dayId, stealerUsername: s.stealerUsername },
        }),
      ),
    ),
    ...allBlocked.map((b) =>
      client.send(
        new DeleteCommand({ TableName: BLOCKED_VICTIMS_TABLE, Key: { username: b.username } }),
      ),
    ),
  ]);

  console.log(
    `  Eliminados: ${mockMatches.length} matches, ${mockPredictions.length} predictions, ` +
      `${allStealPicks.length} steal picks, ${allStealers.length} stealers, ${allBlocked.length} blocked victims`,
  );
}

async function seedMatches(): Promise<void> {
  console.log(`\nCreando 3 partidos mock para hoy (${TODAY})...`);
  await Promise.all(
    MOCK_MATCHES.map((m) => client.send(new PutCommand({ TableName: MATCHES_TABLE, Item: m }))),
  );
  for (const m of MOCK_MATCHES) {
    console.log(`  ✓ ${m.matchId}: ${m.homeTeamName} vs ${m.awayTeamName} @ ${m.kickoffAt}`);
  }
}

async function seedPredictions(): Promise<void> {
  console.log('\nCreando predicciones...');
  const now = new Date().toISOString();
  const kickoffByMatchId = Object.fromEntries(MOCK_MATCHES.map((m) => [m.matchId, m.kickoffAt]));

  await Promise.all(
    PREDICTIONS.map((p) =>
      client.send(
        new PutCommand({
          TableName: PREDICTIONS_TABLE,
          Item: {
            username: p.username,
            matchId: p.matchId,
            homeGoals: p.homeGoals,
            awayGoals: p.awayGoals,
            updatedAt: now,
            kickoffAt: kickoffByMatchId[p.matchId],
            pointsCommon: null,
          },
        }),
      ),
    ),
  );

  for (const p of PREDICTIONS) {
    console.log(`  ✓ ${p.username} → ${p.matchId}: ${p.homeGoals}-${p.awayGoals}`);
  }
}

async function seedStealScenario(): Promise<void> {
  console.log('\nCreando Stealers, BlockedVictims y StealPicks...');

  await Promise.all(
    STEAL_SCENARIO.flatMap((s) => [
      // Stealer registrado para hoy
      client.send(
        new PutCommand({
          TableName: STEALERS_TABLE,
          Item: {
            dayId: TODAY,
            stealerUsername: s.stealer,
            matchId: s.matchId,
            victimUsername: s.victim,
          },
        }),
      ),
      // Victim bloqueada para hoy
      client.send(
        new PutCommand({
          TableName: BLOCKED_VICTIMS_TABLE,
          Item: { username: s.victim },
        }),
      ),
      // StealPick con stolenPoints = 0 (se actualizará con upload-matches)
      client.send(
        new PutCommand({
          TableName: STEAL_PICKS_TABLE,
          Item: {
            calendarDate: TODAY,
            stealerUsername: s.stealer,
            victimUsername: s.victim,
            matchId: s.matchId,
            stolenPoints: 0,
          },
        }),
      ),
    ]),
  );

  for (const s of STEAL_SCENARIO) {
    console.log(`  ✓ ${s.stealer} roba a ${s.victim} en ${s.matchId}`);
  }
}

async function seedDayEvent(): Promise<void> {
  console.log(`\nCreando DayEvent para hoy (${TODAY}) como 'robo'...`);
  await client.send(
    new PutCommand({
      TableName: DAY_EVENTS_TABLE,
      Item: { date: TODAY, eventType: 'robo' },
    }),
  );
  console.log(`  ✓ DayEvent ${TODAY}: robo`);
}

async function main(): Promise<void> {
  console.log(`=== Setup escenario de robo (${TODAY}) ===\n`);

  await cleanMockData();
  await seedMatches();
  await seedPredictions();
  await seedStealScenario();
  await seedDayEvent();

  console.log('\n=== Escenario listo ===');
  console.log('\nResumen:');
  console.log(
    `  Partidos:   mock-today-1 (ARG vs BRA), mock-today-2 (ESP vs FRA), mock-today-3 (GER vs ITA)`,
  );
  console.log(`  StealPicks: alejandro.alazraqui → marco.munoz (mock-today-1)`);
  console.log(`              bruno.munoz → nicolas.sanchez (mock-today-2)`);
  console.log(`              simbad.peralta → thomas.colagiovanni (mock-today-3)`);
  console.log(`\nAhora podés ejecutar upload-matches con los resultados de hoy.`);
  console.log(
    `Los kickoffAt de los 3 partidos son anteriores a la hora actual, asi que serán procesados.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
