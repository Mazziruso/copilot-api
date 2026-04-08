## Architecture

This is a reverse-proxy that impersonates VS Code's GitHub Copilot Chat client, then re-exposes the Copilot API as both **OpenAI-compatible** and **Anthropic-compatible** HTTP endpoints.

### Key Modules

- **`src/main.ts`** — CLI entry point using `citty` with subcommands: `start`, `auth`, `check-usage`, `debug`
- **`src/server.ts`** — Hono app creation, route mounting, CORS/logging middleware
- **`src/lib/state.ts`** — Global mutable singleton holding all runtime config (tokens, models, flags). Imported directly by services.
- **`src/lib/token.ts`** — Two-tier auth: persistent GitHub token (OAuth Device Flow, saved to `~/.local/share/copilot-api/github_token`) + short-lived Copilot token (auto-refreshed in-memory via `setInterval`)
- **`src/lib/api-config.ts`** — HTTP headers & base URLs for GitHub impersonation. Dynamically fetches VS Code version from AUR. Account-type-aware base URLs (individual/business/enterprise).
- **`src/lib/proxy.ts`** — HTTP proxy support via `proxy-from-env` env vars. Bun uses per-request `{ proxy }` option; Node.js uses undici `ProxyAgent`.

## Build & Dev Commands

```bash
bun run build          # Build with tsdown → dist/main.js
bun run dev            # Dev server with --watch
bun run start          # Production: NODE_ENV=production bun run ./src/main.ts
bun run typecheck      # tsc (no emit, strict)
bun test               # Run all tests
bun test tests/anthropic-request.test.ts  # Run single test file
```

## Code Preference

- **Imports**: Use `~/*` path alias for `src/*` (e.g., `import { state } from "~/lib/state"`). ESNext modules only, no CommonJS. `verbatimModuleSyntax` is enforced.
- **TypeScript**: Strict mode. Unused locals/parameters are errors. No fallthrough in switch. Avoid `any`.
- **Naming**: `camelCase` for variables/functions, `PascalCase` for types/interfaces.
- **Errors**: Use `HTTPError` class from `~/lib/error`. Never silently swallow errors.
- **Tests**: Files go in `tests/` as `*.test.ts`.

## Run Tests
Run tests alwayes when effective codes change occurs, except of comments only and format only and documents only.

## Dependency Packages
Prefer not to use a range of version of imported pakages, always pin to an exact version and update in package-lock.json. 
