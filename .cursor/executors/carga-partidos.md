# Executor: Carga de Partidos

## Objetivo
Cargar resultados de partidos del Mundial en DynamoDB e invocar el algoritmo de scoring.
Después de la ejecución, verificar que predictions, stealPicks y matches quedaron consistentes.

---

## Paso 1 — Recibir los partidos del usuario

El usuario provee una lista de partidos (local vs visitante). Para cada uno puede o no incluir el resultado.

- Si el resultado está presente, usarlo directamente.
- Si falta el resultado, buscarlo en internet (fuente oficial o deportiva confiable).
  - Si no podés obtener el resultado con certeza, consultá al usuario antes de continuar.

---

## Paso 2 — Identificar los partidos en DynamoDB

Ejecutar un scan completo de la tabla `Matches`:

```powershell
aws dynamodb scan --table-name Matches --profile prode-dev
```

Para cada partido del input:
1. Buscar el ítem cuyo `homeTeamName` y `awayTeamName` coincidan (matching flexible: nombre parcial, idioma distinto, código de país).
2. Si encontrás más de un candidato o ninguno para algún partido, **consultá al usuario** antes de continuar.
3. Verificar que el partido sea pasado: el campo `kickoffAt` debe ser menor o igual al momento actual.
   - Si el partido es **futuro**, informar al usuario y **detener la operación** (no continuar con ningún partido hasta que el usuario confirme qué hacer).

---

## Paso 3 — Mostrar resumen y pedir confirmación

Mostrar al usuario la tabla de partidos resueltos:

| matchId | Local | Visitante | homeGoals | awayGoals | kickoffAt |
|---------|-------|-----------|-----------|-----------|-----------|
| ...     | ...   | ...       | ...       | ...       | ...       |

Mostrar también el JSON exacto que se enviará a la Lambda:

```json
{
  "matches": [
    {
      "matchId": "...",
      "homeGoals": 0,
      "awayGoals": 0,
      "kickoffAt": "2026-06-01T18:00:00.000Z"
    }
  ]
}
```

**Esperar confirmación explícita del usuario antes de continuar.**

---

## Paso 4 — Resolver el nombre de la función Lambda

```powershell
aws cloudformation describe-stack-resource `
  --stack-name prode-sam `
  --logical-resource-id UploadMatchesFunction `
  --query "StackResourceDetail.PhysicalResourceId" `
  --output text `
  --profile prode-dev
```

Guardar el valor devuelto como `$FUNCTION_NAME`.

---

## Paso 5 — Invocar la Lambda

1. Escribir el payload del Paso 3 al archivo `upload-matches-payload.json` (usar el Write tool, no echo).
2. Ejecutar la invocación:

```powershell
aws lambda invoke `
  --function-name $FUNCTION_NAME `
  --payload file://upload-matches-payload.json `
  --cli-binary-format raw-in-base64-out `
  --profile prode-dev `
  upload-matches-response.json

Get-Content upload-matches-response.json
```

3. Verificar que la respuesta contenga `"statusCode": 200` y `"ok": true`.
   - Si la respuesta indica error, mostrar el detalle y **detener**.

---

## Paso 6 — Verificación post-carga

Para cada `matchId` procesado, recopilar datos de tres tablas y presentarlos juntos.

### 6.1 — Matches (get-item por matchId)

```powershell
# Escribir key a un archivo temporal y usar file://
aws dynamodb get-item `
  --table-name Matches `
  --key file://tmp-key.json `
  --profile prode-dev
```

Donde `tmp-key.json` contiene: `{"matchId": {"S": "<matchId>"}}`

### 6.2 — Predictions (scan filtrado por matchId)

Escribir a `tmp-filter.json`:
```json
{
  ":mid": { "S": "<matchId>" }
}
```

```powershell
aws dynamodb scan `
  --table-name Predictions `
  --filter-expression "matchId = :mid" `
  --expression-attribute-values file://tmp-filter.json `
  --profile prode-dev
```

### 6.3 — StealPicks (query por GSI matchId-index)

Mismo archivo `tmp-filter.json` con el mismo contenido.

```powershell
aws dynamodb query `
  --table-name StealPicks `
  --index-name matchId-index `
  --key-condition-expression "matchId = :mid" `
  --expression-attribute-values file://tmp-filter.json `
  --profile prode-dev
```

---

## Paso 7 — Presentar resultados al usuario

Para cada `matchId`, mostrar en este orden:

1. **Match**: `matchId`, `homeTeamName`, `awayTeamName`, `homeGoals`, `awayGoals`, `status`
2. **Predictions**: por cada ítem: `username`, `matchId`, `pointsCommon` (y demás campos relevantes)
3. **StealPicks**: por cada ítem: `stealerUsername`, `victimUsername`, `matchId`, `stolenPoints` (y demás campos relevantes)

Agrupar por `matchId`. Si alguna tabla no devuelve ítems para ese `matchId`, indicarlo explícitamente (ej: "Sin predictions para este partido").
