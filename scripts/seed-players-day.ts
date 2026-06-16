/**
 * Seed de día mock tipo jugadores para mañana (Argentina).
 *
 * - DayEvent: mañana → jugadores
 * - Matches: España vs Francia y Argentina vs Brasil @ 15:00 AR (sin jugar)
 *
 * Uso:
 *   $env:AWS_PROFILE = "prode-dev"
 *   npx tsx scripts/seed-players-day.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DayEventType } from '../src/shared/types/dayEventType';
import type { MatchItem } from '../src/functions/get-matches/types';

const MATCHES_TABLE = process.env.MATCHES_TABLE_NAME ?? 'Matches';
const DAY_EVENTS_TABLE = process.env.DAY_EVENTS_TABLE_NAME ?? 'DayEvents';

const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

const TODAY = new Date().toLocaleDateString('en-CA', {
  timeZone: ARGENTINA_TIME_ZONE,
});

function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day + days);
  return new Date(utc).toISOString().slice(0, 10);
}

const EVENT_DAY = addDaysToDateString(TODAY, 1);

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

const KICKOFF_15H = argentinaLocalToUtcIso(EVENT_DAY, 15);

const MOCK_MATCHES: MatchItem[] = [
  {
    matchId: 'mock-jun10-1',
    homeTeamName: 'España',
    homeTeamCode: 'ESP',
    awayTeamName: 'Francia',
    awayTeamCode: 'FRA',
    homeGoals: null,
    awayGoals: null,
    kickoffAt: KICKOFF_15H,
    status: 1,
    isFirstRound: false,
  },
  {
    matchId: 'mock-jun10-2',
    homeTeamName: 'Argentina',
    homeTeamCode: 'ARG',
    awayTeamName: 'Brasil',
    awayTeamCode: 'BRA',
    homeGoals: null,
    awayGoals: null,
    kickoffAt: KICKOFF_15H,
    status: 1,
    isFirstRound: false,
  },
];

async function seedDayEvent(): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: DAY_EVENTS_TABLE,
      Item: { date: EVENT_DAY, eventType: DayEventType.Jugadores },
    }),
  );
  console.log(`  ✓ DayEvent ${EVENT_DAY}: jugadores`);
}

async function seedMatches(): Promise<void> {
  await Promise.all(
    MOCK_MATCHES.map((match) =>
      client.send(new PutCommand({ TableName: MATCHES_TABLE, Item: match })),
    ),
  );

  for (const match of MOCK_MATCHES) {
    console.log(
      `  ✓ ${match.matchId}: ${match.homeTeamName} vs ${match.awayTeamName} @ ${match.kickoffAt} (15:00 AR, status=1, sin resultado)`,
    );
  }
}

async function main(): Promise<void> {
  console.log(`=== Seed día jugadores (${EVENT_DAY}) ===\n`);

  console.log('Configurando DayEvent...');
  await seedDayEvent();

  console.log('\nCargando partidos mock...');
  await seedMatches();

  console.log('\n=== Listo ===');
  console.log(
    `Día ${EVENT_DAY} configurado como jugadores con ESP-FRA y ARG-BRA a las 15:00 (Argentina).`,
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
