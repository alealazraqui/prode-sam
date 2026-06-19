/**
 * Seed de asignaciones de alteracion.
 *
 * PowerShell:
 *   $env:AWS_PROFILE='prode-dev'; npm run seed:alter-assignments -- --users-table Users --alter-assignments-table AlterAssignments --dry-run
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { AlterAssignmentItem } from '../../src/shared/types/alteration';
import type { UserItem } from '../../src/shared/types/userItem';
import { assignAlterationDates, assertDateInAlterationRange } from './assignAlterationDates';

type SeedAlterAssignmentsOptions = {
  usersTable: string;
  alterAssignmentsTable: string;
  dryRun: boolean;
  overwrite: boolean;
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  await seedAlterAssignments(options);
}

function parseArgs(argv: string[]): SeedAlterAssignmentsOptions {
  let usersTable: string | undefined;
  let alterAssignmentsTable: string | undefined;
  let dryRun = false;
  let overwrite = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--users-table' && argv[i + 1]) {
      usersTable = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--users-table=')) {
      usersTable = arg.slice('--users-table='.length);
    } else if (arg === '--alter-assignments-table' && argv[i + 1]) {
      alterAssignmentsTable = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--alter-assignments-table=')) {
      alterAssignmentsTable = arg.slice('--alter-assignments-table='.length);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--overwrite') {
      overwrite = true;
    }
  }

  return {
    usersTable: resolveUsersTableName(usersTable),
    alterAssignmentsTable: resolveAlterAssignmentsTableName(alterAssignmentsTable),
    dryRun,
    overwrite,
  };
}

function resolveUsersTableName(cliTable?: string): string {
  const tableName = cliTable ?? process.env.USERS_TABLE_NAME;

  if (!tableName) {
    throw new Error('Missing users table name. Set USERS_TABLE_NAME or pass --users-table <name>.');
  }

  return tableName;
}

function resolveAlterAssignmentsTableName(cliTable?: string): string {
  const tableName = cliTable ?? process.env.ALTER_ASSIGNMENTS_TABLE_NAME;

  if (!tableName) {
    throw new Error(
      'Missing alter assignments table name. Set ALTER_ASSIGNMENTS_TABLE_NAME or pass --alter-assignments-table <name>.',
    );
  }

  return tableName;
}

async function seedAlterAssignments(options: SeedAlterAssignmentsOptions): Promise<void> {
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const users = await scanUsers(client, options.usersTable);

  if (users.length === 0) {
    console.log(`No users found in table "${options.usersTable}". Nothing to seed.`);
    return;
  }

  const existingAssignments = await scanAlterAssignments(client, options.alterAssignmentsTable);
  const existingByUsername = new Map(
    existingAssignments.map((assignment) => [assignment.username, assignment]),
  );
  const createdAt = new Date().toISOString();
  const assignments = assignAlterationDates(users).map((assignment) => ({
    ...assignment,
    createdAt,
  }));

  for (const assignment of assignments) {
    assertDateInAlterationRange(assignment.calendarDate);
    await processAssignment(
      client,
      options,
      assignment,
      existingByUsername.get(assignment.username),
    );
  }

  console.log(
    `Done. ${assignments.length} alter assignment(s) processed for table "${options.alterAssignmentsTable}".`,
  );
}

async function processAssignment(
  client: DynamoDBDocumentClient,
  options: SeedAlterAssignmentsOptions,
  assignment: AlterAssignmentItem,
  existingAssignment: AlterAssignmentItem | undefined,
): Promise<void> {
  if (existingAssignment && !options.overwrite) {
    console.log(
      `Skipped existing alter assignment: ${assignment.username} -> ${existingAssignment.calendarDate}`,
    );
    return;
  }

  if (options.dryRun) {
    const action = existingAssignment ? 'Would overwrite' : 'Would seed';
    console.log(`[dry-run] ${action}: ${assignment.username} -> ${assignment.calendarDate}`);
    return;
  }

  if (existingAssignment && existingAssignment.calendarDate !== assignment.calendarDate) {
    await deleteAlterAssignment(client, options.alterAssignmentsTable, existingAssignment);
  }

  await putAlterAssignment(client, options.alterAssignmentsTable, assignment);
  console.log(`Seeded alter assignment: ${assignment.username} -> ${assignment.calendarDate}`);
}

async function scanUsers(
  client: DynamoDBDocumentClient,
  tableName: string,
): Promise<Pick<UserItem, 'username'>[]> {
  const response = await client.send(
    new ScanCommand({
      TableName: tableName,
      ProjectionExpression: 'username',
    }),
  );

  return (response.Items as Pick<UserItem, 'username'>[] | undefined) ?? [];
}

async function scanAlterAssignments(
  client: DynamoDBDocumentClient,
  tableName: string,
): Promise<AlterAssignmentItem[]> {
  const response = await client.send(
    new ScanCommand({
      TableName: tableName,
    }),
  );

  return (response.Items as AlterAssignmentItem[] | undefined) ?? [];
}

async function putAlterAssignment(
  client: DynamoDBDocumentClient,
  tableName: string,
  item: AlterAssignmentItem,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
}

async function deleteAlterAssignment(
  client: DynamoDBDocumentClient,
  tableName: string,
  item: AlterAssignmentItem,
): Promise<void> {
  await client.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        calendarDate: item.calendarDate,
        username: item.username,
      },
    }),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Seed failed: ${message}`);
  process.exit(1);
});
