# Executor: Carga de Lineup Picks

## Objetivo
Calcular los puntos de lineup picks para un día del Mundial:
comparar las elecciones de cada usuario contra los goleadores del día,
asignar puntos por posición, y persistirlos invocando la Lambda correspondiente.

---

## Paso 1 — Recibir el día del usuario

El usuario indica el día en formato `YYYY-MM-DD` (ej: `2026-06-15`).
Guardar el valor como `$EVENT_DAY`.

---

## Paso 2 — Obtener goleadores del día desde internet

Buscar en internet los partidos del Mundial jugados el día `$EVENT_DAY` y sus goleadores.

Para cada gol anotado, registrar:
- Nombre completo del jugador
- Posición real del jugador: **delantero**, **mediocampista** o **defensor** (consultar en [Promiedos](https://www.promiedos.com.ar))
- Partido en el que marcó

**Excluir goles de penal**: los goles convertidos desde el punto de penal **no cuentan** para las sumatorias ni para la lista de goleadores del día.

**Regla de deduplicación**: si un jugador marcó más de un gol en el día, contarlo **una sola vez**.
Resultado: lista de jugadores que anotaron en el día (sin duplicados), con su posición.

Si no encontrás con certeza la posición de algún goleador, anotarlo como `posición desconocida` y reportarlo al usuario antes de continuar.

Mostrar al usuario la lista de goleadores para validación:

| Jugador | Posición | Partido |
|---------|----------|---------|
| ...     | ...      | ...     |

**Esperar confirmación o corrección del usuario antes de continuar.**

---

## Paso 3 — Obtener LineupPicks del día desde DynamoDB

Escribir a `tmp-lineup-filter.json`:
```json
{
  ":day": { "S": "<EVENT_DAY>" }
}
```

```powershell
aws dynamodb query `
  --table-name LineupPicks `
  --key-condition-expression "eventDay = :day" `
  --expression-attribute-values file://tmp-lineup-filter.json `
  --profile prode-dev
```

Cada ítem tiene los campos: `eventDay`, `username`, `defensor`, `mediocampista`, `delantero`, y opcionalmente `points`.

---

## Paso 4 — Calcular puntos por usuario

Para cada LineupPick:

1. Tomar los tres campos de elección: `defensor` (slot → +3 pts), `mediocampista` (slot → +2 pts), `delantero` (slot → +1 pt).
2. Para cada slot, verificar si el nombre ingresado por el usuario corresponde a algún goleador del día:
   - Aplicar matching flexible: variantes de nombre, apellido, apodo, idioma distinto.
   - **No importa la posición real del jugador**: los puntos se asignan según el slot del usuario, no según la posición real del jugador.
3. Sumar los puntos de los slots que hicieron match.
4. Total máximo posible: 6 pts (1 + 2 + 3).

### Reglas de ambigüedad — consultar al usuario antes de mostrar la tabla final

Consultar al usuario en estos casos:
- El nombre en el slot coincide con más de un goleador del día.
- El nombre es suficientemente ambiguo (apellido muy común, nombre incompleto) y no podés determinar el jugador con alta confianza.
- La posición real del jugador es muy distinta al slot donde fue registrado (ej: un arquero o delantero claro en el slot `defensor`) y sospechás que puede ser un error de carga del usuario.

Si hay alguna ambigüedad, **reportarla al usuario y esperar su decisión** antes de continuar con el cálculo.

### Resultado del cálculo

Una vez resueltas las ambigüedades, armar la tabla de puntos:

| username | defensor (nombre) | defensor pts | mediocampista (nombre) | mediocampista pts | delantero (nombre) | delantero pts | Total |
|----------|-------------------|--------------|------------------------|-------------------|--------------------|---------------|-------|
| ...      | ...               | +3 / 0       | ...                    | +2 / 0            | ...                | +1 / 0        | X     |

**Mostrar esta tabla al usuario y esperar confirmación explícita antes de continuar.**

---

## Paso 5 — Construir el payload para la Lambda

Incluir **solo** los usuarios con `Total >= 1` (la Lambda rechaza valores menores a 1).

El payload es un array de objetos `{ eventDay, username, points }`:

```json
[
  { "eventDay": "2026-06-15", "username": "usuario1", "points": 3 },
  { "eventDay": "2026-06-15", "username": "usuario2", "points": 6 }
]
```

Los usuarios con `Total = 0` (ninguna elección anotó) **no se incluyen** en el payload.

---

## Paso 6 — Resolver el nombre de la función Lambda

```powershell
aws cloudformation describe-stack-resource `
  --stack-name prode-sam `
  --logical-resource-id UpdateLineupPointsFunction `
  --query "StackResourceDetail.PhysicalResourceId" `
  --output text `
  --profile prode-dev
```

Guardar el valor devuelto como `$FUNCTION_NAME`.

---

## Paso 7 — Invocar la Lambda

1. Escribir el evento completo al archivo `update-lineup-points-event.json` (usar el Write tool).
   La Lambda espera un evento HTTP API Gateway v2. El `body` debe ser el array JSON serializado como string:

```json
{
  "version": "2.0",
  "routeKey": "PATCH /lineup-picks/points",
  "rawPath": "/lineup-picks/points",
  "rawQueryString": "",
  "headers": {
    "content-type": "application/json"
  },
  "body": "[{\"eventDay\":\"<EVENT_DAY>\",\"username\":\"usuario1\",\"points\":3}]",
  "isBase64Encoded": false,
  "requestContext": {
    "accountId": "000000000000",
    "apiId": "local",
    "domainName": "localhost",
    "domainPrefix": "localhost",
    "http": {
      "method": "PATCH",
      "path": "/lineup-picks/points",
      "protocol": "HTTP/1.1",
      "sourceIp": "127.0.0.1",
      "userAgent": "executor"
    },
    "requestId": "executor-update-lineup-points",
    "routeKey": "PATCH /lineup-picks/points",
    "stage": "$default",
    "time": "01/Jan/2024:00:00:00 +0000",
    "timeEpoch": 1704067200000,
    "authorizer": {
      "lambda": {
        "username": "executor-admin"
      }
    }
  }
}
```

> Nota: el campo `body` debe ser el array del Paso 5 serializado como string JSON (con escapes internos).

2. Invocar:

```powershell
aws lambda invoke `
  --function-name $FUNCTION_NAME `
  --payload file://update-lineup-points-event.json `
  --cli-binary-format raw-in-base64-out `
  --profile prode-dev `
  update-lineup-points-response.json

Get-Content update-lineup-points-response.json
```

3. Verificar que la respuesta contenga `"statusCode": 200`.
   - Si hay error (400, 404, 500), mostrar el detalle y detener.

---

## Paso 8 — Confirmar resultados al usuario

Informar:
- Cuántos usuarios fueron actualizados y con qué puntos.
- Los usuarios con 0 puntos que fueron omitidos (si los hay).

Ejemplo de mensaje de cierre:

```
✓ Lineup picks actualizados para el día 2026-06-15:
  - usuario1: 3 pts
  - usuario2: 6 pts

  Sin cambios (0 pts): usuario3, usuario4
```

---

## Paso 9 — Limpieza de archivos temporales

Al finalizar con éxito (o si el usuario lo pide), **eliminar del repositorio** los archivos auxiliares creados durante la ejecución. No commitearlos.

Archivos típicos de este executor:

| Archivo | Cuándo se crea |
|---------|----------------|
| `tmp-lineup-filter.json` | Paso 3 — filtro DynamoDB por `eventDay` |
| `update-lineup-points-event.json` | Paso 7 — evento HTTP para la Lambda |
| `update-lineup-points-response.json` | Paso 7 — respuesta de la Lambda |

Usar el Delete tool (o `Remove-Item` en PowerShell) sobre cada archivo listado que exista en `prode-sam/`.
