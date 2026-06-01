# prode-sam

Backend serverless del Prode Mundial (AWS SAM + Lambda TypeScript + DynamoDB).

## Prerrequisitos

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) configurado
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Node.js 20+
- Profile AWS **`prode-dev`** en `~/.aws/credentials` (o SSO equivalente)

## Profile AWS

Todas las operaciones de deploy y scripts locales usan el profile `prode-dev`:

```powershell
# PowerShell
$env:AWS_PROFILE = "prode-dev"
```

```bash
# bash
export AWS_PROFILE=prode-dev
```

El profile también está definido en `samconfig.toml` para `sam deploy`.

## Comandos

Instalar dependencias de desarrollo:

```bash
npm install
```

Validar la plantilla SAM:

```bash
sam validate --lint
```

Build (sin Lambdas aún, valida empaquetado del stack):

```bash
sam build
```

## API local (sin deploy)

Solo compila y levanta el API en tu máquina. **No ejecuta `sam deploy`.**

1. `JWT_SECRET` en `prode-sam/.env.local` (ver `.env.example`).
2. Run and Debug → **SAM local start-api** (o **prode-sam › SAM local start-api**).
3. En la terminal vas a ver explícitamente:
   - `sam build`
   - `sam local start-api ... -d 9229` (puerto de debug)
4. FE: `Prode-FE-/.env.local` → `VITE_API_BASE_URL=http://127.0.0.1:3000` y reiniciar Vite.

Breakpoints en código Lambda (opcional): con el API ya corriendo, segundo launch → **Attach: SAM local Lambdas (9229)**.

Alternativa más rápida (sin `-d 9229`): **SAM local start-api (sin puerto debug)**.

Equivalente por terminal:

```bash
npm run local:api
```

---

## Deploy a AWS (solo cuando quieras publicar)

Deploy a AWS:

```bash
sam deploy
```

Tras el deploy, el output **`UsersTableName`** expone el nombre físico de la tabla DynamoDB `Users`.

## Verificar tabla Users en AWS

Con el profile `prode-dev`:

```powershell
$env:AWS_PROFILE = "prode-dev"
aws dynamodb describe-table --table-name Users
```

Comprobar:

- Tabla `Users` existe
- Clave primaria: atributo `username` (tipo `S`)

## Modelo de datos (Users)

| Campo      | Tipo   | Notas                                      |
| ---------- | ------ | ------------------------------------------ |
| `username` | String | PK, identificador único                      |
| `alias`    | String | Nombre visible                             |
| `password` | String | Texto plano (MVP interno)                  |
| `score`    | Number | Puntaje; `0` al alta manual vía seed       |

El alta de usuarios es manual (`scripts/seed-users/`); no hay endpoint de registro en esta fase.

## Seed de usuarios (manual)

1. Copiar el ejemplo y completar usuarios reales (este archivo no se commitea):

   ```bash
   cp scripts/seed-users/users.example.json scripts/seed-users/users.json
   ```

2. Definir profile y tabla (nombre físico tras deploy, por defecto `Users`):

   ```powershell
   $env:AWS_PROFILE = "prode-dev"
   $env:USERS_TABLE_NAME = "Users"
   npm run seed:users
   ```

   Alternativa sin variable de entorno:

   ```powershell
   $env:AWS_PROFILE = "prode-dev"
   npm run seed:users -- --table Users
   ```

   Otro archivo JSON:

   ```bash
   npm run seed:users -- --table Users --file ./scripts/seed-users/users.json
   ```

3. Verificar un usuario en DynamoDB:

   ```powershell
   aws dynamodb get-item --table-name Users --key '{"username":{"S":"alejandro.alazraqui"}}'
   ```

   Debe existir `username`, `alias`, `password` y `score` en `0`.

## Arquitectura

Ver `docs/architecture.md`.
