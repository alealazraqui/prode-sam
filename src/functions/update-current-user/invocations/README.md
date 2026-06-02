# PATCH /users/me — invocaciones manuales

Requiere usuario en DynamoDB (`Users`) para el happy path.

| Archivo | Escenario |
|---------|-----------|
| `update-current-user-success.json` | Actualiza password del usuario autenticado → 200 preserva `rankingPosition` |

Debug: Run and Debug → **prode-sam › Update current user** (workspace) o **Update current user** (repo).
