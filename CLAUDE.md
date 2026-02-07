# Personal Finance Manager - AI Reference

> **Detailed docs**: `docs/REFERENCE.md` (API, DB, Services) | `docs/DEVELOPMENT.md` (setup, deployment)

## Quick Start

| Component | Tech | Port | Entry Point |
|-----------|------|------|-------------|
| Backend | Express + TypeScript | 3000 | `src/server/index.ts` |
| Frontend | React + Tailwind | 5173 | `src/client/main.tsx` |
| Database | PostgreSQL | 5432 | `src/server/db/schema.ts` |
| Auth | Supabase (JWT) | - | `src/server/middleware/auth.ts` |
| Stocks | yahoo-finance2 | - | `src/server/services/yahoo.ts` |

```bash
npm run dev           # Start both (concurrently)
npm run dev:server    # Backend only
npm run dev:client    # Frontend only
npm run build         # Production build
npm run deploy:server # Deploy backend to server
```

---

## Architecture

```
Frontend (React + Vite)
    ↓ HTTP + JWT via /api proxy
Backend (Express)
    ├── Auth Middleware (Supabase JWT verification + auto user init)
    ├── Routes: /api/accounts, holdings, dividends, dashboard, quotes, transfers, categories, payees, recurring, projection, pnl
    ├── Services: yahoo.ts, tax.ts, currency.ts, userSetup.ts
    └── Database: PostgreSQL (queries.ts, schema.ts)
```

---

## Core Concepts

### Account Types
| Type | Net Worth Impact | Notes |
|------|------------------|-------|
| `bank` | +balance | Checking, savings |
| `cash` | +balance | Physical cash |
| `stock` | +costBasis | Holdings tracked separately |
| `asset` | +initial_balance | Real estate, vehicles |
| `loan` | -balance | Mortgages, debt |
| `credit` | -(limit - available) | Credit cards: owed = initial_balance - balance |

### Business Logic
```
Net Worth = Bank + Cash + Stock(costBasis) + Assets - Loans - CreditOwed

Projection: Based on recurring transactions only
P&L: Based on actual transactions, excludes transfers, grouped by month
```

### Currencies
Supported: EUR, USD, ALL, GBP, CHF, NOK, SEK, DKK, PLN, CZK, HUF, RON, BGN

Formatting:
- Prefix symbols (USD, GBP): `$1,234.56`, `£1,234.56`
- Suffix symbols (others): `1,234.56 €`, `1,235 L` (ALL/HUF no decimals)

### Authentication
- Supabase Auth (email/password + Google OAuth)
- JWT in Authorization header: `Bearer <token>`
- New users auto-initialized on first API call (server-side in auth middleware)
- All data filtered by `user_id`

---

## Database Schema (PostgreSQL)

```
accounts:        id, user_id, name, type, currency, initial_balance, is_favorite, created_at
holdings:        id, account_id, symbol, shares, avg_cost, created_at  [UNIQUE(account_id, symbol)]
dividends:       id, account_id, symbol, amount, shares_held, ex_date, pay_date, tax_rate, tax_amount, net_amount
account_transactions: id, account_id, type(inflow|outflow), amount, date, payee_id, category_id, notes, transfer_id
recurring_transactions: id, account_id, type, amount, payee_id, category_id, notes, frequency(weekly|biweekly|monthly|yearly), next_due_date, is_active
transfers:       id, user_id, from_account_id, to_account_id, from_amount, to_amount, date, notes
categories:      id, user_id, name, type(income|expense)  [UNIQUE(user_id, name)]
payees:          id, user_id, name  [UNIQUE(user_id, name)]
user_settings:   user_id, key, value  [Keys: dividend_tax_rate, main_currency, sidebar_collapsed]
```

---

## API Endpoints

All require `Authorization: Bearer <token>` except auth routes.

| Route | Endpoints |
|-------|-----------|
| `/api/accounts` | GET (list), POST (create), GET/:id, PUT/:id, DELETE/:id, GET/:id/portfolio |
| `/api/holdings` | GET, GET/account/:id, POST (buy), POST/:symbol/sell, DELETE/:id |
| `/api/dividends` | GET, GET/account/:id, POST, DELETE/:id, GET/tax, PUT/tax-rate |
| `/api/dashboard` | GET (netWorth, byType, stockPortfolio, accounts, dueRecurring, recentTransactions) |
| `/api/transactions/:accountId` | GET(?page,limit), POST, PUT/:id, DELETE/:id |
| `/api/recurring` | GET, GET/account/:id, POST, PUT/:id, DELETE/:id, POST/:id/apply |
| `/api/transfers` | GET, POST, DELETE/:id |
| `/api/categories` | GET, POST, PUT/:id, DELETE/:id |
| `/api/payees` | GET, POST, PUT/:id, DELETE/:id, POST/merge |
| `/api/projection` | GET (ytd, future, summary, recurringBreakdown) |
| `/api/pnl` | GET (monthly summaries), GET/:month (transaction details) |
| `/api/quotes` | GET/search?q=, GET/:symbol, GET/:symbol/history |

---

## File Locations

| Task | Files |
|------|-------|
| Add API route | `routes/*.ts` → register in `index.ts` → add client fn in `lib/api.ts` |
| Add DB table | `db/schema.ts` (CREATE) → `db/queries.ts` (functions) |
| Add page | `pages/*.tsx` → `App.tsx` (route) → `Sidebar.tsx` (nav) |
| Add component | `components/**/*.tsx` |
| Modify auth | `middleware/auth.ts` (server), `contexts/AuthContext.tsx` (client) |
| Currency formatting | `lib/currency.ts` (client), `services/currency.ts` (server) |
| Stock quotes | `services/yahoo.ts` |
| Tax calculations | `services/tax.ts` |
| New user setup | `services/userSetup.ts` |

---

## Frontend Routes

| Route | Page | Auth |
|-------|------|------|
| `/login`, `/signup`, `/auth/callback` | Auth pages | Public |
| `/` | Dashboard | Protected |
| `/projection` | Financial projections | Protected |
| `/pnl` | Profit & Loss | Protected |
| `/accounts/new` | Add account | Protected |
| `/accounts/:id` | Account detail | Protected |
| `/transfers` | Transfers | Protected |
| `/settings/categories`, `/payees`, `/currency` | Settings | Protected |

---

## UI Design System

### Theme: Orange primary (`orange-500`/`orange-600`)

### Core Elements
| Element | Classes |
|---------|---------|
| Page bg | `bg-gray-50` |
| Card | `bg-white rounded-xl shadow-sm p-6` |
| Hero card | `bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-2xl shadow-xl p-8 text-white` |
| Primary btn | `bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25` |
| Secondary btn | `bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50` |
| Input | `px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent` |
| Link | `text-orange-600 hover:text-orange-500` |
| Glass icon | `w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center` |

### Component Patterns
| Component | Structure |
|-----------|-----------|
| Page header | `flex justify-between` → heading left (`text-3xl font-bold`) + action btn right |
| Stat card | Card → `flex items-center gap-3` → icon box (`w-10 h-10 bg-blue-100 rounded-xl`) + label/value |
| Gradient header | `px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600` → glass icon + title (white) |
| List item | `px-6 py-4 flex justify-between hover:bg-gray-50 group` → content + hover actions |
| Hover actions | `opacity-0 group-hover:opacity-100 transition-opacity` on button container |
| Modal | **Desktop (lg+):** Overlay (`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center`) + panel (`bg-white rounded-2xl max-w-2xl`). **Mobile (<lg):** Bottom sheet (`items-end` + `rounded-t-2xl animate-slide-up w-full`) with drag handle (`w-10 h-1 bg-gray-300 rounded-full`, `lg:hidden`), `env(safe-area-inset-bottom)` padding, full-width stacked buttons (`flex-col-reverse lg:flex-row`). Reference: `AddAccountModal.tsx` |
| Empty state | `p-6 text-center` → icon circle (`w-12 h-12 bg-gray-100 rounded-full mx-auto`) + text |
| Badge | `px-1.5 py-0.5 text-[10px] font-semibold rounded-full` + `bg-green-100 text-green-700` or `bg-red-100 text-red-700` |
| Avatar | `w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold` |
| Table header | `px-4 py-3 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-orange-600` |
| Divider text | `relative` → line (`absolute inset-0 flex items-center` + `border-t`) + text (`relative px-4 bg-gray-50 text-gray-500`) |
| Error alert | `bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2` |
| Success icon | `w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto` → checkmark |
| Loading | `animate-spin h-5 w-5` on spinner SVG |

### Full-Page Auth Layout
```
<div class="min-h-screen flex">
  <!-- Left: Branding (hidden lg:flex lg:w-1/2) - gradient bg, logo, features, footer -->
  <!-- Right: Form (flex-1 bg-gray-50) - mobile logo, heading, OAuth btns, divider, form, link -->
</div>
```

### Active States
| Element | Active Classes |
|---------|---------------|
| Nav item | `bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25` |
| Nav inactive | `text-gray-700 hover:bg-orange-50 hover:text-orange-700` |
| Tab active | `border-b-2 border-orange-500 text-orange-600` |
| Selected card | `border-2 border-orange-500 bg-orange-50 ring-2 ring-orange-500/20` |

### Colors & Typography
```
Primary: orange-500/600    Success: green-600    Error: red-600
Text: gray-900 (heading), gray-600 (body), gray-500 (muted)
Borders: gray-200 (subtle), gray-300 (inputs)

Page heading: text-3xl font-bold text-gray-900
Card heading: text-lg font-bold text-gray-900
Label: text-sm font-medium text-gray-700
Muted: text-sm text-gray-500
```

### Key Principles
- Corners: `rounded-xl` (cards/buttons), `rounded-2xl` (hero/modals)
- Shadows: `shadow-sm` (cards), `shadow-lg shadow-orange-500/25` (primary buttons)
- Transitions: `transition-all duration-200` on all interactive elements
- Positive values: `text-green-600` | Negative: `text-red-600`

---

## Frontend Patterns

### Key Files
| File | Purpose |
|------|---------|
| `lib/api.ts` | API client with token caching, retry logic, envelope unwrap, mutation invalidation |
| `lib/apiCache.ts` | localStorage cache utilities (`getCache`, `setCache`, `invalidateCache`, `clearAllCache`) |
| `hooks/useSWR.ts` | Stale-while-revalidate hook for GET requests |
| `hooks/useAccountPage.ts` | Consolidated state for SwipeAccountPage (20+ useState → 1 hook) |
| `components/ErrorBoundary.tsx` | Catches React errors, shows fallback UI |
| `contexts/AuthContext.tsx` | Auth state (user, session, signIn, signOut) |

### API Client Features
- **Token caching**: Stored at module level, updated via `setAccessToken()`
- **Retry logic**: 3 retries with exponential backoff (1s, 2s, 4s) for 5xx/429
- **Envelope unwrap**: `{ success: true, data }` → `data`
- **Auth events**: Dispatches `AUTH_EVENTS.SESSION_EXPIRED` on 401 (no hard reload)
- **Mutation invalidation**: All mutations wrapped with `withInvalidation()` — automatically clears relevant cache keys and dispatches `cache:invalidated` event after success
- **Auth cache clear**: `clearAllCache()` called on session expiration

### SWR Caching (Stale-While-Revalidate)

All GET data is cached in localStorage and served instantly on revisit, with a background revalidation fetch.

**How it works:**
1. `useSWR(key, fetcher)` reads localStorage synchronously on mount → instant render
2. Always fires background fetch → updates state + localStorage on success
3. `loading` = `true` only when no cache exists (first visit). Shows skeleton.
4. `refreshing` = `true` during background fetch when cached data is already displayed
5. Listens for `cache:invalidated` events → auto-refetches when key matches

**Usage:**
```typescript
// In a page or component — replaces useState + useEffect + loadData pattern
const { data, loading, refreshing, refresh } = useSWR('/dashboard', () => dashboardApi.get());
if (loading) return <Skeleton />;
if (!data) return null;
```

**Cache invalidation** happens automatically via `withInvalidation()` in `api.ts`:

| Mutation group | Invalidates |
|---|---|
| `accountsApi` (create/update/delete/setFavorite) | `/accounts`, `/dashboard` |
| `accountTransactionsApi` (create/update/delete) | `/accounts`, `/dashboard`, `/pnl`, `/projection` |
| `recurringApi` (create/update/delete/apply) | `/recurring`, `/accounts`, `/dashboard`, `/projection`, `/pnl` |
| `transfersApi` (create/delete) | `/transfers`, `/accounts`, `/dashboard` |
| `categoriesApi` (create/update/delete) | `/categories` |
| `payeesApi` (create/update/delete/merge) | `/payees` |
| `holdingsApi` (create/sell/delete) | `/holdings`, `/accounts`, `/dashboard` |
| `dividendsApi` (create/delete/setTaxRate/check) | `/dividends`, `/accounts`, `/dashboard` |

**NOT cached** (always fetched live):
- `/quotes/*` — stock prices must be real-time
- `/quotes/search*` — transient search results
- `/dashboard/settings/*` — tiny payloads, need immediate feedback

**localStorage keys** use `api:` prefix (e.g., `api:/dashboard`). `clearAllCache()` removes all `api:*` keys on logout. `QuotaExceededError` handled by evicting oldest entries.

**Pages using useSWR:** Dashboard, TransfersPage, PnLPage, ProjectionPage, Sidebar, MobileAccountList

### Component Patterns
```typescript
// Auto-refresh with visibility pause
useEffect(() => {
  const interval = setInterval(loadData, 60000);
  return () => clearInterval(interval);
}, []);
```

---

## Common Tasks

### Add new API endpoint
1. Define Zod schemas in `src/server/validation/schemas.ts` (body, params, query)
2. Create/update `src/server/routes/yourRoute.ts` — use `asyncHandler()`, `validateBody()`, `sendSuccess()`/`badRequest()`/`notFound()`
3. Add query functions to `src/server/db/queries.ts` — parameterized queries only
4. Register in `src/server/index.ts`: `app.use('/api/your-route', yourRouter)`
5. Add client function in `src/client/lib/api.ts` — wrap mutations with `withInvalidation()`

### Add new database table
1. Add CREATE TABLE + indexes in `src/server/db/schema.ts` — include NOT NULL, CHECK constraints, ON DELETE actions, and indexes
2. Add query functions in `src/server/db/queries.ts` — use batch queries for list operations
3. For migrations: create file in `src/server/db/migrations/`, include `up()` and `down()`, wrap in transactions, register in `migrations/index.ts`

### Add new page
1. Create `src/client/pages/YourPage.tsx` (max 300 lines)
2. Use `useSWR()` for data fetching, handle loading/error/success states
3. Use `formatCurrency()` and `formatDate()` for display — never hardcode symbols
4. Add route in `src/client/App.tsx`
5. Add nav link in `src/client/components/Layout/Sidebar.tsx`

---

## Environment Variables

```bash
# Backend (.env)
DB_HOST=207.180.192.49    # or finance-postgres in Docker
DB_PORT=5432
DB_NAME=personal_finance
DB_USER=postgres
DB_PASSWORD=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Frontend (VITE_ prefix)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_API_URL=https://api.0ec.ai  # Production API
```

---

## Deployment

- **Frontend**: Cloudflare Pages (`npm run deploy`)
- **Backend**: Docker on 207.180.192.49 (`npm run deploy:server`)
- **Database**: PostgreSQL in Docker, databases: `personal_finance` (prod), `personal_finance_dev` (dev)

---

## Coding Standards & Rules

> **These rules are mandatory.** Every code change must follow them. They exist to prevent recurring technical debt.

### Security Rules

- **NEVER commit credentials, passwords, API keys, or private keys to git.** All secrets go in `.env` files (which are gitignored). If you accidentally commit a secret, it must be rotated immediately and scrubbed from git history.
- **NEVER disable SSH host key checking** (`StrictHostKeyChecking=no`) in deployment scripts.
- **All SQL queries MUST use parameterized queries** (`$1, $2, ...`). Never concatenate user input into SQL strings.
- **All deployment secrets** (DB passwords, SSH keys, API keys) must come from environment variables or a secrets manager — never hardcoded in scripts, compose files, or config files checked into git.

### Backend: Input Validation

- **Every route that accepts input MUST use a Zod schema** via `validateBody()`, `validateParams()`, or `validateQuery()` from `src/server/validation/middleware.ts`. Never do manual `if (!field)` validation.
- **Every route param ID MUST be validated as a number.** Use Zod params schema or check `isNaN()` immediately after `parseInt()`. Never pass an unvalidated ID to a query function.
- **Numeric values MUST be validated for valid ranges:**
  - `amount > 0` for transactions, holdings, dividends, transfers
  - `shares > 0` for holdings and dividends
  - `taxRate >= 0 && taxRate <= 100` for tax rates
  - Dates must be valid `YYYY-MM-DD` format
- **Enum fields** (type, frequency, currency) must be validated against the allowed values in the Zod schema.

### Backend: Error Handling

- **Every route handler MUST be wrapped with `asyncHandler()`** to catch async errors.
- **Use the response utilities consistently:** `sendSuccess()`, `badRequest()`, `notFound()`, `sendError()`. Never call `res.json()` or `res.status()` directly.
- **Query functions that check existence** (getById, ownership checks) should return `null` on not-found. Routes should then call `notFound()`. Never throw raw `Error('not found')` from the query layer.
- **Never swallow errors silently.** Every `catch` block must either: (a) return an error response to the client, or (b) log the error with full context. Never use empty `catch {}` or `catch(() => {})`.

### Backend: Database

- **Use batch queries for lists.** When loading data for multiple entities (e.g., all accounts with balances), use `batchQueries.*` methods. Never loop through entities and query individually (N+1 pattern). If a batch method doesn't exist for your use case, create one.
- **Every foreign key MUST have an ON DELETE action.** Use `ON DELETE SET NULL` for optional references (payee_id, category_id) and `ON DELETE CASCADE` for owned entities (account_id on transactions).
- **Every new table MUST have:**
  - `NOT NULL` on required columns
  - `CHECK` constraints for valid ranges (`amount > 0`, `shares > 0`)
  - Indexes on columns used in `WHERE` clauses and `JOIN` conditions
  - Composite indexes for common query patterns (e.g., `(account_id, date)`)
- **Never assume data ordering from the database.** Always add explicit `ORDER BY` clauses. If processing depends on chronological order, sort explicitly before iterating.
- **Guard against division by zero** in all arithmetic. Check the divisor before dividing, especially for `shares`, `totalShares`, or any user-derived denominator.
- **Date comparisons:** Use string comparison for date-only values (`YYYY-MM-DD`). Never convert to `Date` objects for comparison — timezone shifts can change the date. Use `new Date().toISOString().split('T')[0]` only for getting today's date.

### Backend: Route Files

- **Route files MUST stay under 300 lines.** If a route file grows beyond this, split by responsibility (e.g., `accounts.ts` for CRUD, `accountBalance.ts` for balance/portfolio calculations).
- **Route files MUST NOT contain business logic.** Complex calculations (TWR, projections, dividend processing) belong in `services/` files. Routes should only: validate input, call a service or query, return the response.

### Frontend: Components

- **Page components MUST stay under 300 lines.** Extract sub-sections into focused child components. If a page manages more than 8 pieces of state, the state management should move to a custom hook or context.
- **All modals MUST follow the established pattern:** use `useBottomSheet`, `createPortal`, responsive desktop/mobile layout. Reference `AddAccountModal.tsx` for the canonical structure.
- **Never return `null` on data fetch failure.** Always show an error state with a retry option. The pattern is:
  ```typescript
  if (loading) return <Skeleton />;
  if (!data) return <ErrorState onRetry={refresh} />;
  ```
- **All data fetching in components MUST use `useSWR()`.** Never use the `useState` + `useEffect` + manual fetch pattern for GET requests. The only exception is one-off fetches triggered by user action (e.g., loading detail on click).

### Frontend: Formatting & Display

- **Always use `formatCurrency()` from `lib/currency.ts` for currency display.** Never hardcode `$`, `€`, or any currency symbol. Never assume USD.
- **Always use a shared date formatter for display.** Use `formatDate()` from `lib/formatters.ts`. Never inline `new Date(x).toLocaleDateString(...)` in components.
- **Account type constants** (type ordering, icons, labels) must be defined in one place and imported — never duplicated across files.

### Frontend: Error Handling

- **`useSWR` consumers MUST handle the error case.** When the hook provides stale data after a failed refresh, show a subtle indicator that data may be outdated.
- **All mutation buttons (save, delete, submit) MUST:**
  - Show a loading spinner during the API call
  - Be disabled during the API call (prevent double-submit)
  - Show an error toast on failure with the error message
- **Use `toast.error()` for user-facing errors.** Never use `console.error()` alone — it's invisible to users. Use both if you need logging.

### Database Migrations

- **Every migration MUST include a `down()` function** that reverses the changes. Even if rollback is complex, document why and provide a best-effort reversal.
- **Data migrations** (recalculations, backfills) should be idempotent — safe to run multiple times with the same result.
- **Migration files MUST be named** with sequential version numbers: `NNN_description.ts` (e.g., `008_add_transfer_notes.ts`).
- **After creating a migration**, register it in `src/server/db/migrations/index.ts`.

### Shared Types

- **All types shared between client and server MUST live in `src/shared/types.ts`.** Never duplicate type definitions between `src/server/` and `src/client/`.
- **`src/shared/` MUST NOT import from `src/server/` or `src/client/`.** It is the leaf of the dependency tree.

### General

- **No `as any` type assertions.** If TypeScript complains, fix the types properly. The only exception is Express middleware where generic typing is genuinely impractical — and those must have a `// TypeScript limitation` comment.
- **No unused dependencies.** Before adding a dependency, check if the functionality already exists in the codebase. When removing a feature, remove its dependencies too.
- **Constants over magic numbers.** Extract repeated values (intervals, retry counts, thresholds) into named constants at the top of the file with a brief comment explaining the value.
