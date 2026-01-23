# Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment variables (see below)
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development servers (backend + frontend)
npm run dev

# Access the app
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

## Supabase Setup

The app requires Supabase for authentication. Follow these steps:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Note your project URL and keys from Settings > API

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Enable Auth Providers

In your Supabase Dashboard:

**Email/Password:**
1. Go to Authentication > Providers
2. Enable "Email" provider
3. Configure email templates if desired

**Google OAuth (optional):**
1. Go to Authentication > Providers > Google
2. Enable Google provider
3. Create OAuth credentials in Google Cloud Console
4. Add callback URL: `https://your-project-id.supabase.co/auth/v1/callback`
5. Enter Client ID and Secret in Supabase

### 4. First User Setup

When a user first logs in:
1. The frontend calls `/api/auth/init`
2. Backend creates default categories and settings for the user
3. User is redirected to the dashboard

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

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | Vite dev server with HMR |
| Backend API | http://localhost:3000/api | Express REST API |
| API Proxy | http://localhost:5173/api | Vite proxies to backend |

**Note**: During development, always access the app via port 5173. Vite handles proxying API requests to the backend.

---

## File Watching

- **Backend**: `tsx watch` watches for changes in `src/server/`
- **Frontend**: Vite HMR for instant updates in `src/client/`
- **Tailwind**: JIT compilation on file changes

---

## Database

### Location
```
data/portfolio.db
```

### Reset Database
```bash
rm data/portfolio.db
npm run dev  # Recreates with default schema
```

### Direct Access
```bash
sqlite3 data/portfolio.db

# Useful commands
.tables          # List tables
.schema          # Show all schemas
SELECT * FROM holdings;
SELECT * FROM settings;
```

### Sample Data

Add test holding via API:
```bash
curl -X POST http://localhost:3000/api/holdings \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","shares":10,"price":150,"date":"2024-01-15"}'
```

Add test dividend:
```bash
curl -X POST http://localhost:3000/api/dividends \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","amountPerShare":0.24,"exDate":"2024-02-09"}'
```

---

## Common Development Tasks

### Add a new API endpoint

1. **Create/update route file** (`src/server/routes/`)
   ```typescript
   // src/server/routes/newfeature.ts
   import { Router } from 'express';
   const router = Router();

   router.get('/', (req, res) => {
     res.json({ message: 'Hello' });
   });

   export default router;
   ```

2. **Register route** (`src/server/index.ts`)
   ```typescript
   import newFeatureRoutes from './routes/newfeature.js';
   app.use('/api/newfeature', newFeatureRoutes);
   ```

3. **Add API client** (`src/client/lib/api.ts`)
   ```typescript
   export const newFeatureApi = {
     getData: () => fetchApi<DataType>('/newfeature'),
   };
   ```

### Add a database table

1. **Update schema** (`src/server/db/schema.ts`)
   ```typescript
   db.exec(`
     CREATE TABLE IF NOT EXISTS new_table (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       ...
     )
   `);
   ```

2. **Add queries** (`src/server/db/queries.ts`)
   ```typescript
   export const newTableQueries = {
     getAll: () => db.prepare('SELECT * FROM new_table').all(),
     create: (data) => db.prepare('INSERT INTO new_table...').run(data),
   };
   ```

3. **Restart server** to apply schema changes

### Add a React component

1. **Create component file**
   ```typescript
   // src/client/components/MyComponent.tsx
   interface MyComponentProps {
     data: string;
   }

   export default function MyComponent({ data }: MyComponentProps) {
     return <div>{data}</div>;
   }
   ```

2. **Import and use**
   ```typescript
   import MyComponent from '../components/MyComponent';
   <MyComponent data="hello" />
   ```

### Add a React hook

1. **Create hook file**
   ```typescript
   // src/client/hooks/useMyData.ts
   import { useState, useEffect } from 'react';

   export function useMyData() {
     const [data, setData] = useState(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       fetchData().then(setData).finally(() => setLoading(false));
     }, []);

     return { data, loading };
   }
   ```

### Add a new page

1. **Create page component** (`src/client/pages/NewPage.tsx`)

2. **Add route** (`src/client/App.tsx`)
   ```tsx
   <Route path="/new-page" element={<NewPage />} />
   ```

3. **Add navigation** (`src/client/components/Layout.tsx`)
   ```typescript
   { to: '/new-page', label: 'New Page' }
   ```

---

## Testing API Endpoints

### Authentication Required

All API endpoints (except `/api/auth/*`) require a valid JWT token. Include it in the Authorization header:

```bash
# Get a token by logging in via the frontend, then extract from browser DevTools
# Or use Supabase CLI/API to get a token programmatically
TOKEN="your-jwt-token"
```

### Using curl

```bash
# Search stocks (no auth required for quotes)
curl "http://localhost:3000/api/quotes/search?q=apple"

# Get quote
curl http://localhost:3000/api/quotes/AAPL

# Get portfolio (requires auth)
curl http://localhost:3000/api/portfolio \
  -H "Authorization: Bearer $TOKEN"

# Add holding (requires auth)
curl -X POST http://localhost:3000/api/holdings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"symbol":"AAPL","shares":10,"price":150,"accountId":1}'

# Sell shares (requires auth)
curl -X POST http://localhost:3000/api/holdings/AAPL/sell \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"shares":5,"price":175,"accountId":1}'

# Add dividend (requires auth)
curl -X POST http://localhost:3000/api/dividends \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"symbol":"AAPL","amountPerShare":0.24,"exDate":"2024-02-09","accountId":1}'

# Get tax summary (requires auth)
curl http://localhost:3000/api/dividends/tax \
  -H "Authorization: Bearer $TOKEN"
```

### Using browser

For authenticated endpoints, use the frontend app (which handles token management) or browser extensions that can add auth headers.

---

## Debugging

### Backend Logs
- Express logs to console
- Database errors logged with `console.error`
- Yahoo Finance errors logged per request

### Frontend Debugging
- React DevTools for component inspection
- Network tab for API requests
- Console for JavaScript errors

### Common Issues

**"Invalid stock symbol"**
- Symbol doesn't exist on Yahoo Finance
- Check symbol is uppercase
- May be delisted or renamed

**"Cannot sell more shares than owned"**
- Check holdings before selling
- Verify share count

**Database locked**
- Only one connection at a time
- Close other SQLite clients

**Port already in use**
- Kill process on port 3000 or 5173
- Or change port in config

---

## Code Style

### TypeScript
- Strict mode enabled
- Explicit types for function parameters
- Interface for object shapes

### React
- Functional components with hooks
- Props interface defined above component
- State at top of component

### Naming
- Components: PascalCase (`HoldingRow.tsx`)
- Hooks: camelCase with `use` prefix (`usePortfolio.ts`)
- API functions: camelCase (`getQuote`)
- Database columns: snake_case (`avg_cost`)

### File Organization
- One component per file
- Co-locate related components in folders
- Hooks in dedicated `hooks/` folder
- API types and functions in `lib/api.ts`

---

## Production Build

```bash
# Build frontend
npm run build

# Output in dist/client/

# Start production server
NODE_ENV=production node dist/server/index.js
```

**Note**: Production mode serves static files from `dist/client/`.

---

## Environment Variables

Required for authentication:

```bash
# .env (required)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
PORT=3000                    # Backend port (default: 3000)
DATABASE_PATH=./data/portfolio.db  # SQLite database location
```

**Note**: The `VITE_` prefix is required for variables that need to be accessible in the frontend (Vite exposes these to the client).

---

## Dependencies Update

```bash
# Check outdated
npm outdated

# Update all
npm update

# Update specific package
npm install package@latest
```

**Note**: `yahoo-finance2` is at v2 (deprecated). Migration to v3 recommended but requires code changes. See: https://github.com/gadicc/yahoo-finance2/blob/dev/docs/UPGRADING.md
