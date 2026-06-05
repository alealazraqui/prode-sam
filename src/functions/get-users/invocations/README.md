# GET /users — invocaciones manuales

Requiere usuarios en DynamoDB (`Users`) para ver un listado no vacío en el happy path.

| Archivo | Escenario |
|---------|-----------|
| `get-users-success.json` | Usuario autenticado en contexto authorizer → 200 con array de jugadores públicos |

La validación de token (401 sin auth) la resuelve `jwt-authorizer` en API Gateway; no hay invocación local para ese caso.

Debug: Run and Debug → **Get users** (repo) o **prode-sam › Get users** (workspace).
