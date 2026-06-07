/**
 * Configura DynamoDB para probar la funcionalidad de robo:
 * - Marca el día de hoy como día de robo en DayEventsTable
 * - Crea 2 stealers (alejandro y bruno) en StealersTable
 * - Ejecuta seed:today-mock para crear partidos y predicciones
 *
 * Uso:
 *   AWS_PROFILE=prode-dev npm run seed:steal-test
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DayEventItem } from '../../src/shared/types/dayEvent';
import type { StealerItem } from '../../src/shared/types/stealer';
import { loadEnvLocal } from '../load-env-local';

function getArgentinaTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

async function main(): Promise<void> {
  loadEnvLocal();
  const dayEventsTable = resolveTableName('DAY_EVENTS_TABLE_NAME', 'DayEvents');
  const stealersTable = resolveTableName('STEALERS_TABLE_NAME', 'Stealers');
  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const today = getArgentinaTodayDateString();

  // 1. Marcar hoy como día de robo
  const dayEvent: DayEventItem = {
    date: today,
    eventType: 'robo',
  };

  await client.send(
    new PutCommand({
      TableName: dayEventsTable,
      Item: dayEvent,
    }),
  );

  console.log(`✓ Día ${today} marcado como día de robo en ${dayEventsTable}`);

  // 2. Crear 2 stealers (alejandro y bruno) sin elección aún
  const stealers: StealerItem[] = [
    {
      calendarDate: today,
      stealerUsername: 'alejandro.alazraqui',
    },
    {
      calendarDate: today,
      stealerUsername: 'bruno.munoz',
    },
  ];

  for (const stealer of stealers) {
    await client.send(
      new PutCommand({
        TableName: stealersTable,
        Item: stealer,
      }),
    );
    console.log(`✓ Stealer creado: ${stealer.stealerUsername}`);
  }

  console.log('\nAhora ejecuta el seed de partidos y predicciones:');
  console.log('  AWS_PROFILE=prode-dev npm run seed:today-mock\n');
  console.log('Los dos primeros partidos están terminados con resultados.');
  console.log('alejandro.alazraqui y bruno.munoz son los stealers del día.');
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
