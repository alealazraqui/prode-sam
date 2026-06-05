# Arquitectura Backend - Prode Mundial

## 1. Objetivo

El backend será una aplicación serverless construida con AWS SAM, Lambda TypeScript, API Gateway HTTP API y DynamoDB.

La aplicación está pensada para ser usada durante el Mundial por un grupo reducido de amigos. No se espera que tenga una vida útil prolongada luego del torneo.

Por este motivo, la arquitectura priorizará:

- Velocidad de desarrollo.
- Bajo costo operativo.
- Simplicidad de despliegue.
- Facilidad para modificar reglas rápidamente.
- Orden suficiente sin sobreingeniería.
- Evitar servicios con costo fijo.

---

## 2. Stack propuesto

- AWS SAM
- AWS Lambda
- TypeScript
- Node.js
- API Gateway HTTP API
- DynamoDB
- AWS SDK v3
- esbuild para build de Lambdas TypeScript

---

## 3. Arquitectura general

```txt
Frontend React
  ↓
API Gateway HTTP API
  ↓
AWS Lambda TypeScript
  ↓
DynamoDB
```

Para tareas eventuales de actualización automática de resultados:

```txt
EventBridge Scheduler
  ↓
Lambda sync-results
  ↓
API externa de resultados
  ↓
DynamoDB
```

La actualización automática de resultados no será obligatoria para el MVP. Inicialmente se priorizará carga manual desde un panel admin.

---

## 4. Criterio arquitectónico

La arquitectura backend será pragmática.

No se buscará una arquitectura enterprise ni una separación estricta por capas del estilo:

```txt
controllers/
services/
repositories/
dao/
```

En su lugar, el código se organizará por Lambda / caso de uso.

Cada función Lambda deberá contener cerca de sí misma los pasos necesarios para resolver su responsabilidad.

Ejemplo:

```txt
functions/
  get-leaderboard/
    handler.ts
    getLeaderboard.ts
    fetchFinishedMatches.ts
    fetchPredictions.ts
    calculateLeaderboard.ts
    sortLeaderboard.ts
    types.ts
```

---

## 5. Infraestructura SAM

Se utilizará un único `template.yaml` global.

Este archivo definirá:

- API Gateway HTTP API.
- Funciones Lambda.
- Tablas DynamoDB.
- Permisos IAM.
- Variables de entorno.
- Configuración común de runtime, timeout y memoria.

No se utilizará un template separado por Lambda en el MVP.

Motivos:

- Menor complejidad.
- Mejor visibilidad de toda la arquitectura.
- Deploy más simple.
- Menos fricción para desarrollo rápido.

---

## 6. Lambda Layer

No se utilizará Lambda Layer inicialmente.

El código compartido vivirá en:

```txt
src/shared/
```

Cada Lambda podrá importar utilidades desde `src/shared/`.

SAM + esbuild incluirá en el bundle final de cada Lambda el código alcanzable desde sus imports.

No se copiará manualmente `shared/` dentro de cada Lambda.

No se incluirá toda la carpeta `shared` por defecto, sino únicamente el código importado por cada función.

Se evaluaría usar Lambda Layer solamente si aparece una necesidad clara en el futuro, por ejemplo:

- Dependencias pesadas compartidas entre muchas Lambdas.
- Utilidades transversales muy estables.
- Necesidad de versionar código común de forma independiente.

Para este proyecto, se considera innecesario.

---

## 5.1 Entorno AWS local (desarrollo)

Operaciones contra AWS (deploy SAM, scripts de seed en DynamoDB, consultas CLI) usan el profile **`prode-dev`**.

Configuración recomendada:

1. **AWS CLI** — profile en `~/.aws/credentials` (o SSO equivalente) con nombre `prode-dev`.
2. **`samconfig.toml`** — en el bloque del entorno de desarrollo, fijar el profile usado por SAM:

```toml
[default.deploy.parameters]
profile = "prode-dev"
```

3. **Scripts locales** (seed, utilidades) — leer credenciales del mismo profile:

```bash
export AWS_PROFILE=prode-dev
# o en PowerShell: $env:AWS_PROFILE = "prode-dev"
```

4. **MCP AWS Serverless** (Cursor) — al desplegar o invocar desde el agente, asegurar que el entorno del MCP tenga `AWS_PROFILE=prode-dev` (o el profile configurado en `samconfig.toml`).

La regla de rol del repo (`dev-role-sam.mdc`) y `dev-project-config.md` del starter documentan este profile para que los flujos agenticos no asuman `default`.

---

## 7. Estructura de carpetas propuesta

```txt
backend/
  template.yaml
  samconfig.toml
  package.json
  tsconfig.json

  scripts/
    seed-users/           → carga manual de usuarios en DynamoDB (fuera de Lambdas)

  src/
    functions/
      get-matches/
        handler.ts
        getMatches.ts
        mapMatches.ts
        types.ts

      get-leaderboard/
        handler.ts
        getLeaderboard.ts
        fetchFinishedMatches.ts
        fetchPredictions.ts
        calculateLeaderboard.ts
        sortLeaderboard.ts
        types.ts

      save-prediction/
        handler.ts
        parsePredictionInput.ts
        validatePredictionInput.ts
        buildPredictionItem.ts
        savePrediction.ts
        types.ts

      update-match-result/
        handler.ts
        parseResultInput.ts
        validateResultInput.ts
        updateMatchResult.ts
        recalculateScores.ts
        types.ts

      login/
        handler.ts
        parseLoginInput.ts
        validateLoginInput.ts
        authenticateUser.ts
        createAuthToken.ts
        types.ts

    shared/
      http/
        createHttpResponse.ts
        parseJsonBody.ts

      errors/
        AppError.ts
        BadRequestError.ts
        UnauthorizedError.ts
        ForbiddenError.ts
        NotFoundError.ts
        handleError.ts

      dynamo/
        dynamoClient.ts
        getItem.ts
        putItem.ts
        queryItems.ts
        updateItem.ts
        deleteItem.ts

      config/
        environment.ts

      auth/
        comparePassword.ts
        createJwt.ts
        verifyJwt.ts

      types/
        userItem.ts
        publicUserResponse.ts
        ApiGateway.ts

      mappers/
        mapUserItemToPublicResponse.ts
```

---

## 8. Estilo interno de cada Lambda

Cada Lambda tendrá un `handler.ts` pequeño y declarativo.

El handler debe:

- Recibir el evento.
- Parsear input si corresponde.
- Ejecutar pasos claros del caso de uso.
- Retornar una respuesta HTTP estandarizada.
- Delegar errores a una utilidad común.

Ejemplo:

```ts
// src/functions/get-leaderboard/handler.ts

import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { handleError } from '@/shared/errors/handleError';
import { getLeaderboard } from './getLeaderboard';

export async function handler() {
  try {
    const leaderboard = await getLeaderboard();

    return createHttpResponse(200, leaderboard);
  } catch (error) {
    return handleError(error);
  }
}
```

---

## 9. Organización por pasos

La lógica del caso de uso se dividirá en funciones pequeñas y explícitas.

Ejemplo:

```ts
// src/functions/get-leaderboard/getLeaderboard.ts

import { fetchFinishedMatches } from './fetchFinishedMatches';
import { fetchPredictions } from './fetchPredictions';
import { calculateLeaderboard } from './calculateLeaderboard';
import { sortLeaderboard } from './sortLeaderboard';

export async function getLeaderboard() {
  const matches = await fetchFinishedMatches();
  const predictions = await fetchPredictions(matches);
  const leaderboard = calculateLeaderboard(matches, predictions);

  return sortLeaderboard(leaderboard);
}
```

La intención es que el flujo sea fácil de leer de arriba hacia abajo.

---

## 10. Principios de programación

El backend usará un estilo funcional y pragmático.

Reglas generales:

- Handlers chicos.
- Funciones con nombres descriptivos.
- Un paso claro por función.
- Evitar clases salvo que aporten valor real.
- Evitar estado mutable innecesario.
- Priorizar funciones puras cuando sea posible.
- Mantener cerca de cada Lambda el código relacionado.
- Extraer a `shared/` solo lo verdaderamente reutilizable.
- Evitar abstracciones genéricas prematuras.
- No sobrediseñar para mantenimiento a largo plazo.

---

## 11. Código compartido

El código compartido vivirá en:

```txt
src/shared/
```

### 11.1 Criterio: qué centralizar y cuándo

**Regla general:** si el **mismo** tipo, mapper o función/helper (pura o de infraestructura) lo necesitan **dos o más Lambdas** distintas bajo `src/functions/<caso>/`, debe vivir en `shared/` y **no** duplicarse ni colocarse en `types.ts` de una Lambda “dueña” (p. ej. `login/types.ts` con `UserItem` usado en todo el backend).

| Situación | Ubicación |
|-----------|-----------|
| Usado por **una sola** Lambda | `functions/<caso>/` (pasos, `types.ts` del endpoint, validaciones locales) |
| Usado por **≥ 2** Lambdas | `shared/` en la carpeta que corresponda (ver tabla abajo) |
| Segunda Lambda necesita algo que hoy está en otra función | **Mover** a `shared/` y actualizar imports; no importar `functions/A` desde `functions/B` |

**Qué va en cada carpeta de `shared/`:**

| Contenido | Carpeta | Ejemplo |
|-----------|---------|---------|
| Shape de fila DynamoDB o DTO de API compartido | `shared/types/` | `UserItem`, `PublicUserResponse` |
| Transformación pura reutilizada (sin I/O) | `shared/mappers/` | `mapUserItemToPublicResponse` |
| Cliente y operaciones DynamoDB genéricas | `shared/dynamo/` | `getItem`, `scanTable` |
| Respuestas HTTP, parseo de body | `shared/http/` | `createHttpResponse` |
| Errores y `handleError` | `shared/errors/` | `NotFoundError` |
| JWT, authorizer, contexto | `shared/auth/` | `verifyJwt`, `extractAuthenticatedUsername` |
| Env vars | `shared/config/` | `environment.ts` |
| Guards `unknown` → tipos | `shared/validation/` | `isNonEmptyString` |

**Límites:**

- `shared/` **no** importa desde `src/functions/`. Si un tipo compartido estaba en una Lambda, se mueve a `shared/types/`.
- **No** es lógica de negocio específica de un solo flujo del Prode (cálculo de ranking, reglas de un endpoint, etc.) aunque sea “pura”: eso queda en la Lambda hasta que otra también lo necesite.
- No crear carpetas genéricas vacías “por si acaso”; solo extraer cuando el umbral ≥2 Lambdas se cumple (o está por cumplirse en la misma tarea).

**SAM / bundle:** los types no generan peso en runtime; esbuild incluye en cada Lambda solo lo que importa. Centralizar en `shared/` no requiere Lambda Layer.

### 11.2 Contenido habitual de `shared/`

- Helpers HTTP.
- Manejo de errores.
- Cliente DynamoDB.
- Helpers genéricos de DynamoDB.
- Configuración.
- Utilidades de auth.
- Tipos y mappers reutilizados (≥2 Lambdas).

Ejemplos válidos:

```txt
shared/http/createHttpResponse.ts
shared/errors/handleError.ts
shared/dynamo/dynamoClient.ts
shared/dynamo/scanTable.ts
shared/config/environment.ts
shared/types/userItem.ts
shared/mappers/mapUserItemToPublicResponse.ts
```

Ejemplos que no deberían ir a `shared/` mientras solo una Lambda los use:

```txt
functions/save-prediction/validatePredictionRules.ts
functions/get-leaderboard/calculateLeaderboard.ts
```

Si más adelante **otra** Lambda necesita la misma regla o mapper, recién ahí se evalúa moverlo a `shared/` (o se duplica brevemente solo si el contrato aún diverge).

---

## 12. Manejo de errores

Se definirá una estrategia común de errores.

### 12.1 Error base

```ts
// src/shared/errors/AppError.ts

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

---

### 12.2 Errores específicos

```ts
// src/shared/errors/BadRequestError.ts

import { AppError } from './AppError';

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
  }
}
```

```ts
// src/shared/errors/UnauthorizedError.ts

import { AppError } from './AppError';

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

```ts
// src/shared/errors/NotFoundError.ts

import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}
```

---

### 12.3 Handler común de errores

```ts
// src/shared/errors/handleError.ts

import { createHttpResponse } from '../http/createHttpResponse';
import { AppError } from './AppError';

export function handleError(error: unknown) {
  if (error instanceof AppError) {
    return createHttpResponse(error.statusCode, {
      code: error.code,
      message: error.message,
    });
  }

  console.error(error);

  return createHttpResponse(500, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected error',
  });
}
```

---

## 13. Helpers HTTP

```ts
// src/shared/http/createHttpResponse.ts

export function createHttpResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
```

```ts
// src/shared/http/parseJsonBody.ts

import { BadRequestError } from '../errors/BadRequestError';

export function parseJsonBody<TBody>(body: string | null): TBody {
  if (!body) {
    throw new BadRequestError('Request body is required');
  }

  try {
    return JSON.parse(body) as TBody;
  } catch {
    throw new BadRequestError('Invalid JSON body');
  }
}
```

---

## 14. DynamoDB

DynamoDB será la base principal de la aplicación.

Tablas iniciales sugeridas:

```txt
Users
Matches
Predictions
```

Opcional:

```txt
Leaderboard
```

### Tabla `Users` (feature Login — US inicial)

| Campo | Tipo | Notas |
|-------|------|--------|
| `username` | String | Clave primaria (PK). Identificador único y credencial de login. |
| `alias` | String | Nombre visible en la app. |
| `password` | String | **Texto plano** (decisión explícita del proyecto: app interna entre amigos). |
| `score` | Number | Puntaje acumulado; **siempre `0` en el alta manual** (script de seed). |
| `rankingPosition` | Number | Posición en el ranking (1–11 en MVP); asignada aleatoriamente sin repetir en el seed. |

Ejemplo de item:

```json
{
  "username": "alejandro",
  "alias": "Ale",
  "password": "1234",
  "score": 0,
  "rankingPosition": 3
}
```

**Alta de usuarios:** solo manual (script en `scripts/seed-users/` o carga directa en consola). No hay endpoint ni Lambda de registro en el MVP.

**Backfill MVP (`rankingPosition`):** usuarios existentes sin el campo deben actualizarse re-ejecutando el seed con profile `prode-dev` (sobrescribe items con posiciones nuevas aleatorias 1–11). Hasta entonces, `GET /users/me` devuelve `rankingPosition: 0` como default en el mapper.

El ranking puede calcularse a demanda o recalcularse cuando un admin carga un resultado.

Para el MVP, se priorizará simplicidad por encima de optimización avanzada.

---

## 15. Cliente DynamoDB compartido

```ts
// src/shared/dynamo/dynamoClient.ts

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});

export const dynamoClient = DynamoDBDocumentClient.from(client);
```

---

## 16. Helpers genéricos de DynamoDB

```ts
// src/shared/dynamo/putItem.ts

import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from './dynamoClient';

export async function putItem<TItem extends Record<string, unknown>>(tableName: string, item: TItem): Promise<void> {
  await dynamoClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
}
```

```ts
// src/shared/dynamo/getItem.ts

import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from './dynamoClient';

export async function getItem<TItem>(tableName: string, key: Record<string, unknown>): Promise<TItem | null> {
  const response = await dynamoClient.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    }),
  );

  return (response.Item as TItem | undefined) ?? null;
}
```

---

## 17. Ejemplo de Lambda: save-prediction

Estructura:

```txt
src/functions/save-prediction/
  handler.ts
  parsePredictionInput.ts
  validatePredictionInput.ts
  buildPredictionItem.ts
  savePrediction.ts
  types.ts
```

Flujo:

```txt
handler.ts
  ↓
parsePredictionInput.ts
  ↓
validatePredictionInput.ts
  ↓
buildPredictionItem.ts
  ↓
savePrediction.ts
  ↓
shared/dynamo/putItem.ts
```

Ejemplo handler:

```ts
// src/functions/save-prediction/handler.ts

import { createHttpResponse } from '@/shared/http/createHttpResponse';
import { handleError } from '@/shared/errors/handleError';
import { parsePredictionInput } from './parsePredictionInput';
import { validatePredictionInput } from './validatePredictionInput';
import { buildPredictionItem } from './buildPredictionItem';
import { savePrediction } from './savePrediction';

export async function handler(event: { body: string | null }) {
  try {
    const input = parsePredictionInput(event.body);

    validatePredictionInput(input);

    const prediction = buildPredictionItem(input);

    await savePrediction(prediction);

    return createHttpResponse(201, {
      message: 'Prediction saved successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}
```

---

## 18. Configuración SAM recomendada

Se usará `CodeUri: .` para permitir que cada Lambda importe código desde `src/shared/`.

Cada función declarará su propio entrypoint mediante esbuild.

Ejemplo conceptual:

```yaml
Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 10
    MemorySize: 128
    Environment:
      Variables:
        NODE_OPTIONS: --enable-source-maps
        USERS_TABLE_NAME: !Ref UsersTable
        MATCHES_TABLE_NAME: !Ref MatchesTable
        PREDICTIONS_TABLE_NAME: !Ref PredictionsTable

Resources:
  GetMatchesFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      Handler: src/functions/get-matches/handler.handler
      Events:
        Api:
          Type: HttpApi
          Properties:
            Path: /matches
            Method: GET
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        EntryPoints:
          - src/functions/get-matches/handler.ts
        Minify: true
        Target: es2020
        Sourcemap: true

  GetLeaderboardFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      Handler: src/functions/get-leaderboard/handler.handler
      Events:
        Api:
          Type: HttpApi
          Properties:
            Path: /leaderboard
            Method: GET
    Metadata:
      BuildMethod: esbuild
      BuildProperties:
        EntryPoints:
          - src/functions/get-leaderboard/handler.ts
        Minify: true
        Target: es2020
        Sourcemap: true
```

---

## 19. Variables de entorno

Las Lambdas deberán acceder a nombres de tablas y configuración mediante variables de entorno.

Ejemplo:

```txt
USERS_TABLE_NAME
MATCHES_TABLE_NAME
PREDICTIONS_TABLE_NAME
JWT_SECRET
```

Se recomienda centralizar la lectura en:

```txt
src/shared/config/environment.ts
```

Ejemplo:

```ts
// src/shared/config/environment.ts

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const environment = {
  usersTableName: getRequiredEnv('USERS_TABLE_NAME'),
  matchesTableName: getRequiredEnv('MATCHES_TABLE_NAME'),
  predictionsTableName: getRequiredEnv('PREDICTIONS_TABLE_NAME'),
  jwtSecret: getRequiredEnv('JWT_SECRET'),
};
```

---

## 20. Endpoints iniciales sugeridos

```txt
POST /auth/login

GET /matches
GET /matches/{matchId}

POST /predictions
GET /predictions/me

GET /leaderboard

PATCH /admin/matches/{matchId}/result
POST /admin/recalculate-scores
```

---

## 21. Autenticación

Para el MVP se priorizará una autenticación simple, alineada con la feature **Login y configuración inicial**:

```txt
username + password (almacenados en DynamoDB; password en texto plano)
comparación directa en login (sin hash en el MVP)
JWT firmado por el backend (payload mínimo: username; opcional alias)
expiración larga del token (ej. 180 días)
sesión en el frontend vía localStorage
```

**Fuera de alcance del MVP de login:**

- Registro público o endpoint `POST /auth/register`
- Lambda o código de aplicación para alta de usuarios
- Hash de contraseña, recuperación o cambio de contraseña
- Roles o permisos diferenciados en JWT
- Cognito u otros IdP administrados

Los usuarios se cargan antes del primer login mediante script manual (ver `scripts/seed-users/` y tabla `Users`).

No se utilizará Cognito inicialmente.

---

## 22. Resultados de partidos

La primera versión usará carga manual de resultados desde un panel admin.

Motivos:

- Reduce dependencia de APIs externas.
- Evita costos inesperados.
- Evita complejidad de sincronización.
- Permite completar el MVP más rápido.

Flujo recomendado:

```txt
Admin carga resultado
  ↓
Lambda update-match-result
  ↓
Actualiza Matches
  ↓
Recalcula puntajes
  ↓
Actualiza Predictions o Leaderboard
```

La integración con una API externa de resultados podrá agregarse después si el MVP ya está estable.

---

## 23. Costos y límites

La arquitectura debe evitar servicios con costo fijo o alto riesgo de gasto.

Se evitará:

- EC2
- RDS
- NAT Gateway
- ECS
- WAF
- WebSockets
- Polling agresivo

Se recomienda configurar AWS Budgets con alertas en:

```txt
USD 1
USD 3
USD 5
```

También se recomienda:

- Retención de CloudWatch Logs en 7 días.
- Timeouts bajos en Lambdas.
- API Gateway HTTP API en lugar de REST API.
- DynamoDB simple, sin índices innecesarios.
- S3 + CloudFront para frontend.

---

## 24. Reglas técnicas

- Usar un único `template.yaml` para el MVP.
- No usar Lambda Layer inicialmente.
- Usar `CodeUri: .` para permitir imports desde `src/shared/`.
- Cada Lambda debe tener un `handler.ts` declarativo.
- La lógica debe dividirse en pasos claros.
- El código relacionado debe vivir cerca de la Lambda.
- `shared/` según § 11.1: tipos, mappers y helpers usados por ≥2 Lambdas; sin imports desde `functions/`.
- No colocar lógica de negocio de un solo caso de uso en `shared/` hasta que otra Lambda la reutilice.
- Evitar abstracciones genéricas prematuras.
- Evitar arquitectura por capas si complica el desarrollo.
- Mantener bajo costo y simplicidad como prioridad.

---

## 25. Criterio de aceptación

La arquitectura backend se considera correctamente aplicada si:

- El backend puede desplegarse con SAM.
- Existe un único `template.yaml`.
- Las Lambdas están organizadas por caso de uso.
- Cada Lambda tiene un handler pequeño.
- La lógica de cada caso de uso está dividida en pasos claros.
- Las utilidades comunes viven en `src/shared/`.
- No se usa Lambda Layer inicialmente.
- DynamoDB se accede mediante helpers compartidos.
- Los errores se manejan con una estrategia común.
- API Gateway expone los endpoints necesarios.
- El sistema evita servicios con costo fijo.
- La estructura favorece velocidad de desarrollo para llegar al Mundial.
