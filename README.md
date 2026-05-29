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

El alta de usuarios es manual (`scripts/seed-users/`, tarea posterior); no hay endpoint de registro en esta fase.

## Arquitectura

Ver `docs/architecture.md`.
