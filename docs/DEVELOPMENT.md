# Development Guide

## Quick Start

```bash
npm install
cp .env.example .env   # Configure environment variables
npm run dev            # Start both servers

# Access
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

---

## Supabase Setup

### 1. Create Project
1. Go to [supabase.com](https://supabase.com) and create project
2. Note project URL and keys from Settings > API

### 2. Environment Variables
```bash
# .env (required)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PostgreSQL (required)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=personal_finance_dev
DB_USER=postgres
DB_PASSWORD=your-password

# Optional
PORT=3000                    # Backend port
ALLOWED_ORIGINS=http://localhost:5173  # CORS origins (comma-separated)
```

### 3. Enable Auth Providers
- **Email/Password**: Authentication > Providers > Enable Email
- **Google OAuth**: Add callback URL `https://your-project-id.supabase.co/auth/v1/callback`

**Note**: New users are automatically initialized on first API call (server-side).

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both servers (concurrently) |
| `npm run dev:server` | Start only Express backend |
| `npm run dev:client` | Start only Vite frontend |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

---

## Project URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 (Vite dev server) |
| Backend API | http://localhost:3000/api |
| API Proxy | http://localhost:5173/api (proxied to backend) |

Always access via port 5173 in development.

---

## Database

### PostgreSQL Connection

```bash
# Connect
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Common commands
\dt                  # List tables
\d accounts          # Describe table
\di                  # List indexes
SELECT * FROM schema_migrations;  # Check migration status
```

### Reset Database

```bash
# Drop and recreate (development only)
psql -h $DB_HOST -U $DB_USER -c "DROP DATABASE personal_finance_dev;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE personal_finance_dev;"
npm run dev  # Recreates schema and runs migrations
```

### Migrations

Located in `src/server/db/migrations/`. Applied automatically on server start.

```bash
# Check applied migrations
psql -d $DB_NAME -c "SELECT * FROM schema_migrations ORDER BY version;"
```

#### Creating a New Migration

1. Create file: `src/server/db/migrations/NNN_description.ts` (next sequential number)
2. Implement both `up()` and `down()` functions:
   ```typescript
   import { Pool } from 'pg';

   export async function up(pool: Pool): Promise<void> {
     await pool.query('BEGIN');
     try {
       await pool.query(`ALTER TABLE accounts ADD COLUMN archived_at TIMESTAMPTZ`);
       await pool.query('COMMIT');
     } catch (err) {
       await pool.query('ROLLBACK');
       throw err;
     }
   }

   export async function down(pool: Pool): Promise<void> {
     await pool.query('BEGIN');
     try {
       await pool.query(`ALTER TABLE accounts DROP COLUMN archived_at`);
       await pool.query('COMMIT');
     } catch (err) {
       await pool.query('ROLLBACK');
       throw err;
     }
   }
   ```
3. Register in `src/server/db/migrations/index.ts`
4. Restart the dev server — migration runs automatically

#### Migration Rules

- **Always wrap in a transaction** (BEGIN/COMMIT/ROLLBACK)
- **Always include `down()`** — even for data migrations, provide best-effort reversal
- **Data migrations must be idempotent** — safe to run multiple times
- **New columns with NOT NULL** must have a DEFAULT or be added in two steps: add nullable, backfill, then set NOT NULL
- **New foreign keys MUST specify ON DELETE** action (SET NULL or CASCADE)
- **Test on dev database first** before deploying to production

---

## Docker Deployment

### Local Docker Compose

```bash
# Start PostgreSQL
docker compose up -d postgres

# View logs
docker compose logs -f postgres
```

### Production Deployment

```bash
# Build and push
npm run build
npm run deploy  # Uses ansible/deploy-ssh.sh
```

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: personal_finance
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

---

## Common Tasks

### Add API Endpoint

1. **Define Zod schemas** in `src/server/validation/schemas.ts` for body, params, and query
2. Create route in `src/server/routes/newfeature.ts`:
   - Wrap all handlers with `asyncHandler()`
   - Apply `validateBody(schema)` / `validateParams(schema)` / `validateQuery(schema)` middleware
   - Use `sendSuccess()`, `badRequest()`, `notFound()` for responses
   - Validate numeric amounts > 0, dates as YYYY-MM-DD, enums against allowed values
3. Register in `src/server/index.ts`
4. Add client function in `src/client/lib/api.ts` with `withInvalidation()` for mutations
5. Add cache invalidation keys to the `withInvalidation()` call for any affected data

### Add Database Table

1. Update schema in `src/server/db/schema.ts`:
   - Add `NOT NULL` on required columns
   - Add `CHECK` constraints for valid ranges (amount > 0, etc.)
   - Add `ON DELETE SET NULL` or `CASCADE` on foreign keys
   - Add indexes on columns used in WHERE/JOIN
2. Add queries in `src/server/db/queries.ts` — use parameterized queries only
3. Create migration if modifying existing table (see Migration Rules above)
4. Restart server

### Add React Page

1. Create component in `src/client/pages/` (max 300 lines)
2. Use `useSWR()` for data fetching
3. Handle all states: loading (skeleton), error (error state with retry), success (render data)
4. Use `formatCurrency()` and `formatDate()` — never hardcode symbols or date formats
5. Add route in `src/client/App.tsx`
6. Add navigation in Sidebar if needed

---

## Testing API

```bash
# Get JWT token from browser DevTools after login
TOKEN="your-jwt-token"

# Search stocks
curl "http://localhost:3000/api/quotes/search?q=apple"

# Get account (requires auth)
curl http://localhost:3000/api/accounts \
  -H "Authorization: Bearer $TOKEN"

# Create transaction
curl -X POST http://localhost:3000/api/accounts/1/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"outflow","amount":50,"date":"2026-01-25","payee":"Store"}'
```

---

## Debugging

### Backend
- Express logs to console
- Enable verbose logging: `DEBUG=* npm run dev:server`

### Frontend
- React DevTools for component inspection
- Network tab for API requests
- Console for JavaScript errors

### Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Kill process: `npx kill-port 3000` |
| Database connection failed | Check `DB_HOST`, `DB_PORT`, `DB_PASSWORD` |
| Auth errors | Verify Supabase keys in `.env` |
| CORS errors | Check `ALLOWED_ORIGINS` env var |
| Yahoo Finance fails | Circuit breaker may be open; wait 30s |

---

## Security Practices

### Secrets Management

- **All secrets go in `.env` files** — never in source code, scripts, or compose files committed to git
- `.env`, `.env.local`, `.env.*.local`, and `ansible/.env.production` are gitignored
- If a secret is accidentally committed: **rotate it immediately**, then scrub from git history using `git filter-branch` or BFG Repo-Cleaner
- Deployment scripts must read secrets from environment variables: `${DB_PASSWORD}`, not hardcoded values

### What MUST NOT be committed

| Item | Where it belongs |
|------|-----------------|
| Database passwords | `.env` / `.env.production` |
| Supabase keys | `.env` / `.env.production` |
| SSH private keys | CI/CD secrets manager or local `~/.ssh/` |
| API keys / tokens | `.env` / `.env.production` |
| SSL certificates | Deployed separately, never in git |

### Before every commit to `ansible/`

Check that no file contains hardcoded passwords, keys, or tokens. Deployment scripts should reference environment variables only.

---

## Code Style

### TypeScript
- Strict mode enabled
- Explicit types for function parameters
- Shared types in `src/shared/types.ts`
- **No `as any` casts** — fix types properly

### React
- Functional components with hooks
- Props interface above component
- Custom hooks in `hooks/` folder
- **Max 300 lines per component** — extract sub-components when larger
- **Use `useSWR()` for all GET data fetching** — never manual `useState` + `useEffect` + fetch

### Backend
- **All route inputs validated with Zod schemas** via `validateBody()` / `validateParams()` / `validateQuery()`
- **All route handlers wrapped with `asyncHandler()`**
- **Use `sendSuccess()`, `badRequest()`, `notFound()`** — never raw `res.json()`
- **Use batch queries** — never loop + query individually (N+1)
- **Route files under 300 lines** — split by responsibility if larger

### Naming
- Components: PascalCase (`HoldingRow.tsx`)
- Hooks: camelCase with `use` prefix
- API functions: camelCase
- Database columns: snake_case
- Migration files: `NNN_description.ts` (sequential)

---

## Production Build

```bash
npm run build           # Builds client + server
npm run preview         # Preview production

# Deploy
NODE_ENV=production node dist/server/index.js
```

Production serves static files from `dist/client/`.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | Yes | PostgreSQL port (usually 5432) |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database user |
| `DB_PASSWORD` | Yes | Database password |
| `PORT` | No | Backend port (default 3000) |
| `ALLOWED_ORIGINS` | No | CORS origins (default localhost:5173) |

**Note**: `VITE_` prefix exposes variables to frontend.
