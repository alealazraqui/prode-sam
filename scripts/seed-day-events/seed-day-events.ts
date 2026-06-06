import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { DayEventItem, DayType } from '../../src/shared/types/dayEvent';

type MatchKickoffRow = {
  kickoffAt: string;
};

async function main(): Promise<void> {
  const { matchesTable, dayEventsTable } = parseArgs(process.argv.slice(2));
  await seedDayEvents(matchesTable, dayEventsTable);
}

function parseArgs(argv: string[]): { matchesTable: string; dayEventsTable: string } {
  let matchesTable: string | undefined;
  let dayEventsTable: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--matches-table' && argv[i + 1]) {
      matchesTable = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--matches-table=')) {
      matchesTable = arg.slice('--matches-table='.length);
    } else if (arg === '--day-events-table' && argv[i + 1]) {
      dayEventsTable = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--day-events-table=')) {
      dayEventsTable = arg.slice('--day-events-table='.length);
    }
  }

  return {
    matchesTable: resolveMatchesTableName(matchesTable),
    dayEventsTable: resolveDayEventsTableName(dayEventsTable),
  };
}

function resolveMatchesTableName(cliTable?: string): string {
  const tableName = cliTable ?? process.env.MATCHES_TABLE_NAME;
  if (!tableName) {
    throw new Error(
      'Missing matches table name. Set MATCHES_TABLE_NAME or pass --matches-table <name>.',
    );
  }
  return tableName;
}

function resolveDayEventsTableName(cliTable?: string): string {
  const tableName = cliTable ?? process.env.DAY_EVENTS_TABLE_NAME;
  if (!tableName) {
    throw new Error(
      'Missing day events table name. Set DAY_EVENTS_TABLE_NAME or pass --day-events-table <name>.',
    );
  }
  return tableName;
}

async function seedDayEvents(matchesTable: string, dayEventsTable: string): Promise<void> {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const matches = await scanMatches(client, matchesTable);
  const uniqueDates = extractUniqueDates(matches);

  if (uniqueDates.length === 0) {
    console.log(`No kickoff dates found in table "${matchesTable}". Nothing to seed.`);
    return;
  }

  for (const date of uniqueDates) {
    const item: DayEventItem = {
      date,
      eventType: pickRandomDayType(),
    };
    await putDayEvent(client, dayEventsTable, item);
    console.log(`Seeded day event: ${date} (${item.eventType})`);
  }

  console.log(`Done. ${uniqueDates.length} day event(s) written to table "${dayEventsTable}".`);
}

async function scanMatches(
  client: DynamoDBDocumentClient,
  tableName: string,
): Promise<MatchKickoffRow[]> {
  const response = await client.send(
    new ScanCommand({
      TableName: tableName,
    }),
  );

  return (response.Items as MatchKickoffRow[] | undefined) ?? [];
}

function extractUniqueDates(matches: MatchKickoffRow[]): string[] {
  const dates = new Set<string>();

  for (const match of matches) {
    if (!match.kickoffAt) continue;
    dates.add(match.kickoffAt.slice(0, 10));
  }

  return [...dates].sort();
}

function pickRandomDayType(): DayType {
  const r = Math.random();
  if (r < 1 / 3) return 'common';
  if (r < 2 / 3) return 'robo';
  return 'players';
}

async function putDayEvent(
  client: DynamoDBDocumentClient,
  tableName: string,
  item: DayEventItem,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exit(1);
});
