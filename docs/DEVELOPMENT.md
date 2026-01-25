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

1. Create route in `src/server/routes/newfeature.ts`
2. Add Zod schema in `src/server/validation/schemas.ts`
3. Register in `src/server/index.ts`
4. Add client in `src/client/lib/api.ts`

### Add Database Table

1. Update schema in `src/server/db/schema.ts`
2. Add queries in `src/server/db/queries.ts`
3. Create migration if modifying existing table
4. Restart server

### Add React Page

1. Create component in `src/client/pages/`
2. Add route in `src/client/App.tsx`
3. Add navigation in Sidebar if needed

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

## Code Style

### TypeScript
- Strict mode enabled
- Explicit types for function parameters
- Shared types in `src/shared/types.ts`

### React
- Functional components with hooks
- Props interface above component
- Custom hooks in `hooks/` folder

### Naming
- Components: PascalCase (`HoldingRow.tsx`)
- Hooks: camelCase with `use` prefix
- API functions: camelCase
- Database columns: snake_case

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
