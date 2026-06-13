# Executor: Calcular Stealers

## Objetivo
Ejecutar el algoritmo de stealers para un día determinado e invocar la Lambda correspondiente.
Después de la ejecución, mostrar el estado de las tablas `Stealers` y `BlockedVictims`.

---

## Paso 1 — Recibir parámetros del usuario

El usuario indica:

| Parámetro | Requerido | Descripción |
|---|---|---|
| `targetDayId` | Sí | Día en formato `YYYY-MM-DD` (ej: `2026-06-09`) |
| `stealsCount` | No | Cantidad de partidos que se asignan a cada stealer. Si se omite, se usa `ceil(N/2)` donde N es la cantidad de partidos elegibles del día. |
| `excludedMatchIds` | No | Lista de IDs de partidos que **no** deben ser elegibles para robo (ej: partidos a horario inconveniente). Si se omite, se usan todos los partidos del día. |

- Si el formato de `targetDayId` no es válido, informar al usuario y detener.
- Guardar los valores como `$TARGET_DAY_ID`, `$STEALS_COUNT` (puede ser vacío) y `$EXCLUDED_MATCH_IDS` (puede ser `[]`).

---

## Paso 2 — Resolver el nombre de la función Lambda

```powershell
aws cloudformation describe-stack-resource `
  --stack-name prode-sam `
  --logical-resource-id CalculateStealersFunction `
  --query "StackResourceDetail.PhysicalResourceId" `
  --output text `
  --profile prode-dev
```

Guardar el valor devuelto como `$FUNCTION_NAME`.

---

## Paso 3 — Invocar la Lambda

1. Escribir el payload al archivo `calculate-stealers-payload.json` (usar el Write tool).

   Incluir solo los campos provistos por el usuario. Ejemplos:

   Solo día (comportamiento por defecto):
   ```json
   {
     "targetDayId": "<TARGET_DAY_ID>"
   }
   ```

   Con cantidad de robos y partidos excluidos:
   ```json
   {
     "targetDayId": "<TARGET_DAY_ID>",
     "stealsCount": <STEALS_COUNT>,
     "excludedMatchIds": ["<MATCH_ID_1>", "<MATCH_ID_2>"]
   }
   ```

2. Invocar:

```powershell
aws lambda invoke `
  --function-name $FUNCTION_NAME `
  --payload file://calculate-stealers-payload.json `
  --cli-binary-format raw-in-base64-out `
  --profile prode-dev `
  calculate-stealers-response.json

Get-Content calculate-stealers-response.json
```

3. Verificar la respuesta:
   - Si `"ok": true` y `"skipped": true`: el día no es de tipo `Robo`. Informar al usuario con el `dayType` devuelto y **detener** (es comportamiento esperado, no es un error).
   - Si `"ok": true` sin `skipped`: la ejecución fue exitosa. Continuar al Paso 4.
   - Si hay error, mostrar el detalle y detener.

---

## Paso 4 — Verificar tabla Stealers

Escribir a `tmp-stealers-filter.json`:
```json
{
  ":day": { "S": "<TARGET_DAY_ID>" }
}
```

```powershell
aws dynamodb query `
  --table-name Stealers `
  --key-condition-expression "dayId = :day" `
  --expression-attribute-values file://tmp-stealers-filter.json `
  --profile prode-dev
```

---

## Paso 5 — Verificar tabla BlockedVictims

```powershell
aws dynamodb scan --table-name BlockedVictims --profile prode-dev
```

---

## Paso 6 — Presentar resultados al usuario

Mostrar dos secciones:

**Stealers del día `<TARGET_DAY_ID>`:**

| stealerUsername | dayId | (demás campos) |
|-----------------|-------|----------------|
| ...             | ...   | ...            |

Si no hay ítems: "No se encontraron stealers para este día."

**BlockedVictims (estado actual):**

| username | (demás campos) |
|----------|----------------|
| ...      | ...            |

Si no hay ítems: "No hay víctimas bloqueadas actualmente."
