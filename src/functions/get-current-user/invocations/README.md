# GET /users/me — invocaciones manuales

Requiere usuario en DynamoDB (`Users`) para el happy path.

| Archivo | Escenario |
|---------|-----------|
| `get-current-user-success.json` | Usuario autenticado existente en tabla |
| `get-current-user-not-found.json` | Username en contexto authorizer sin fila en DynamoDB |

Debug: Run and Debug → **prode-sam › Get current user** (workspace) o **Get current user** (repo).
