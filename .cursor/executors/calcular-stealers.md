# Executor: Calcular Stealers

## Objetivo
Ejecutar el algoritmo de stealers para un día determinado e invocar la Lambda correspondiente.
Después de la ejecución, mostrar el estado de las tablas `Stealers` y `BlockedVictims`.

---

## Paso 1 — Recibir el día del usuario

El usuario indica el día en formato `YYYY-MM-DD` (ej: `2026-06-09`).

- Si el formato no es válido, informar al usuario y detener.
- Guardar el valor como `$TARGET_DAY_ID`.

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

1. Escribir el payload al archivo `calculate-stealers-payload.json` (usar el Write tool):

```json
{
  "targetDayId": "<TARGET_DAY_ID>"
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
