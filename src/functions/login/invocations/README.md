# Invocaciones manuales — login

Eventos JSON para `sam local invoke LoginFunction`. Solo casos de uso principales.

| Caso | Archivo | Resultado esperado |
|------|---------|-------------------|
| Credenciales válidas | `login-success.json` | `200` + `{ "token": "..." }` |
| Contraseña incorrecta | `login-wrong-password.json` | `401` + `Usuario o contraseña inválidos.` |

## Prerrequisitos

1. Docker Desktop en ejecución.
2. Profile AWS `prode-dev` configurado.
3. Stack desplegado (`sam deploy`) con tabla `Users`.
4. Usuario seedeado (`npm run seed:users`). Los valores por defecto coinciden con `scripts/seed-users/users.example.json`.
5. `JwtSecret` local al invocar: `dev-secret-local` (debe coincidir con el usado en deploy o solo importa para firmar en local).

## Personalizar credenciales

Editar el campo `body` del JSON con un `username`/`password` existentes en DynamoDB. No commitear passwords reales.

## Comando manual

```powershell
$env:AWS_PROFILE = "prode-dev"
sam build
sam local invoke LoginFunction `
  -e src/functions/login/invocations/login-success.json `
  --parameter-overrides JwtSecret=dev-secret-local
```

Para invocar vía agente, usar la regla `lambda-manual-invoke.mdc`.

## Debug con breakpoints (VS Code)

### Workspace multi-carpeta (`PRODE_MUNDIAL.code-workspace`)

Las configs de debug se generan desde cada Lambda en `src/functions/<caso>/.vscode/debug.json`.

```bash
npm run vscode:sync-launch
```

Luego en Run and Debug elegí la entrada concreta, por ejemplo **`prode-sam › Login › Credenciales validas`** → F5. Poné breakpoints y ejecutá. No hay prompts: cada invocacion es una config.


Ejecuta el handler directamente en Node (sin Docker), cargando el JSON de `invocations/`. Usa DynamoDB real vía profile `prode-dev` (configurado en `.vscode/launch.json`).

Alternativa CLI:

```powershell
$env:AWS_PROFILE = "prode-dev"
npm run debug:invoke -- login login-success
```
