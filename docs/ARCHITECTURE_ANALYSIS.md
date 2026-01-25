# Architecture Analysis & Improvement Plan

> **Generated**: January 2026
> **Goal**: Make the project scalable and well-documented for AI Agent development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Issues](#critical-issues)
3. [High Priority Issues](#high-priority-issues)
4. [Medium Priority Issues](#medium-priority-issues)
5. [Low Priority Issues](#low-priority-issues)
6. [Implementation Phases](#implementation-phases)
7. [Detailed Findings](#detailed-findings)

---

## Executive Summary

The Personal Finance Manager is a well-structured full-stack application with clear separation of concerns. However, several issues need addressing for scalability and AI agent maintainability:

- **~~3 Critical~~** ✅ All resolved (1 false positive, 2 fixed)
- **~~7 High Priority~~** ✅ All fixed (N+1, indexes, shared types, validation, AccountPage, hard redirects, error responses)
- **8 Medium Priority** maintainability issues
- **6 Low Priority** improvements

### Current Architecture Strengths
- ✅ Clean separation: `/src/server/` and `/src/client/`
- ✅ Service layer pattern implemented
- ✅ TypeScript throughout
- ✅ Proper authentication with Supabase
- ✅ RESTful API design

### Key Weaknesses
- ✅ ~~N+1 query problems throughout~~ (batch queries added)
- ✅ ~~Type definitions duplicated between frontend/backend~~ (shared types)
- ✅ ~~Hardcoded configuration values~~ (exchange rates now dynamic)
- ❌ No test coverage
- ❌ Inconsistent error handling

---

## Critical Issues

> **Must fix immediately - security or correctness problems**

### ~~CRIT-1: Secrets Exposed in Git Repository~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Not an issue |
| **Files** | `.env`, `src/client/.env` |
| **Resolution** | `.env` has always been in `.gitignore` - false positive from analysis |

**Note:** The automated analysis flagged this incorrectly. The `.gitignore` file has always included `.env` files, so no secrets were ever committed to the repository.

---

### ~~CRIT-2: Hardcoded Exchange Rates~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/server/services/currency.ts` |
| **Resolution** | Implemented live API with daily caching |

**Solution Implemented:**
- Exchange rates now fetched from [frankfurter.app](https://frankfurter.app) (ECB data)
- Rates cached for 24 hours across all users
- Fallback to reasonable defaults if API fails
- Changed base currency from ALL to EUR (industry standard)
- Pre-cached on server startup

**Key Changes:**
- `src/server/services/currency.ts` - API fetching with caching
- `src/server/index.ts` - Pre-cache on startup
- `src/server/services/userSetup.ts` - Default EUR for new users
- `src/server/db/queries.ts` - Default EUR in getMainCurrency
- `src/client/components/AddAccountModal.tsx` - Default EUR
- `src/client/pages/settings/CurrencyPage.tsx` - Updated UI

---

### ~~CRIT-3: Hardcoded Production Domain in CORS~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/server/index.ts:30-35` |
| **Resolution** | CORS origins now configurable via environment variable |

**Solution Implemented:**
```typescript
const allowedOrigins: string[] = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
```

**Environment Variable:**
- `ALLOWED_ORIGINS` - comma-separated list of allowed origins
- Defaults to `http://localhost:5173` for development
- Updated in `ansible/.env.production` and `ansible/.env.production.example`

---

## High Priority Issues

> **Fix soon - affects scalability and performance**

### ~~HIGH-1: N+1 Query Problems~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `db/queries.ts`, `services/balance.ts`, `services/dashboard.ts`, `services/projection.ts` |
| **Resolution** | Added batch query methods and refactored services |

**Solution Implemented:**

1. Added `batchQueries` namespace in `queries.ts` with:
   - `getAllAccountsWithBalances(userId)` - Accounts with transaction totals in one query
   - `getAllRecurringCounts(userId)` - Recurring counts for all accounts
   - `getRecentTransactions(userId, limit)` - Recent transactions across all accounts
   - `getAllTransactions(userId)` - All transactions for balance calculations

2. Refactored services to use batch queries:
   - `balance.ts` - Uses `Promise.all` to fetch accounts, holdings, and recurring in parallel
   - `dashboard.ts` - Single parallel fetch for all dashboard data
   - `projection.ts` - Batch fetches accounts, recurring, and holdings

3. In-memory grouping by `account_id` using `Map` for O(1) lookups

**Before:** 10 accounts = 30+ queries
**After:** 10 accounts = 3-5 queries (constant, regardless of account count)

---

### ~~HIGH-2: Missing Database Indexes~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/server/db/schema.ts` |
| **Resolution** | Added 8 indexes for foreign key columns |

**Indexes Added:**
```sql
CREATE INDEX idx_account_transactions_account_id ON account_transactions(account_id);
CREATE INDEX idx_account_transactions_date ON account_transactions(date);
CREATE INDEX idx_holdings_account_id ON holdings(account_id);
CREATE INDEX idx_recurring_transactions_account_id ON recurring_transactions(account_id);
CREATE INDEX idx_dividends_account_id ON dividends(account_id);
CREATE INDEX idx_transfers_from_account ON transfers(from_account_id);
CREATE INDEX idx_transfers_to_account ON transfers(to_account_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
```

**Note:** Indexes are created with `IF NOT EXISTS` so they will be applied on next server restart.

---

### ~~HIGH-3: Type Duplication Between Frontend/Backend~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/shared/types.ts` (new), `src/server/db/queries.ts`, `src/client/lib/api.ts` |
| **Resolution** | Created shared types module imported by both frontend and backend |

**Solution Implemented:**

1. Created `src/shared/types.ts` with all shared types:
   - Base types: `AccountType`, `Currency`, `TransactionType`, `Frequency`, `CategoryType`, `StockTransactionType`
   - Entity interfaces: `Account`, `Category`, `Payee`, `AccountTransaction`, `RecurringTransaction`, `Transfer`, `Holding`, `Dividend`, `StockTransaction`
   - API response types: `DashboardData`, `ProjectionData`, `PnLSummary`, `PnLDetail`, etc.

2. Updated `tsconfig.json` and `tsconfig.server.json` to include `src/shared`

3. Refactored imports:
   - `src/server/db/queries.ts` - imports and re-exports from shared
   - `src/client/lib/api.ts` - imports and re-exports from shared

**Benefits:**
- Single source of truth for types
- Changes propagate to both frontend and backend
- Better IDE autocomplete and type checking

---

### ~~HIGH-4: No Request Validation Library~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/server/validation/`, route files |
| **Resolution** | Added Zod validation with reusable middleware |

**Solution Implemented:**

1. Created validation module at `src/server/validation/`:
   - `schemas.ts` - All Zod schemas (accounts, transactions, recurring, transfers, holdings, dividends, settings)
   - `middleware.ts` - Express middleware (`validateBody`, `validateParams`, `validateQuery`)
   - `index.ts` - Module exports

2. Key schemas include:
   - `createAccountSchema`, `updateAccountSchema`, `setFavoriteSchema`
   - `createTransactionSchema`, `updateTransactionSchema`
   - `createRecurringSchema`, `updateRecurringSchema`, `applyRecurringSchema`
   - `createTransferSchema`
   - `createHoldingSchema`, `sellHoldingSchema`
   - `createDividendSchema`, `setTaxRateSchema`
   - `setCurrencySchema`, `setSidebarCollapsedSchema`

3. Middleware usage pattern:
```typescript
import { validateBody, createAccountSchema, CreateAccountInput } from '../validation/index.js';

router.post('/', validateBody(createAccountSchema), async (req, res) => {
  const { name, type, currency, initialBalance } = req.body as CreateAccountInput;
  // Body is now validated and typed
});
```

**Benefits:**
- Consistent validation across all routes
- Type-safe request bodies with inferred types
- Detailed error messages with field paths
- Transforms (e.g., string to number) built-in

---

### ~~HIGH-5: Excessive useState in AccountPage~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/client/pages/AccountPage.tsx`, `src/client/hooks/useAccountPage.ts`, `src/client/components/Account/` |
| **Resolution** | Refactored using custom hooks and subcomponents |

**Solution Implemented:**

1. Created custom hooks in `src/client/hooks/useAccountPage.ts`:
   - `useAccountPage(accountId)` - Core data fetching and state (account, transactions, recurring, portfolio, etc.)
   - `useAccountModals()` - Modal visibility state
   - `useDividendCheck()` - Dividend checking logic
   - `useNewRecurringForm()` - Form state for new recurring transactions

2. Created reusable components in `src/client/components/Account/`:
   - `AccountHeader` - Account header with edit/delete buttons
   - `RecurringList` - Recurring transactions list
   - `TransactionList` - Transactions list
   - `EditAccountModal` - Account edit modal
   - `EditTransactionModal` - Transaction edit modal
   - `AddRecurringModal`, `EditRecurringModal` - Recurring modals

**Results:**
- AccountPage reduced from **1298 lines to 414 lines** (68% reduction)
- 20+ useState hooks consolidated into 4 custom hooks
- Reusable components eliminate duplicated UI code
- Much easier to maintain and test

---

### ~~HIGH-6: Hard Redirects Instead of React Router~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/client/lib/api.ts`, `src/client/components/ProtectedRoute.tsx` |
| **Resolution** | Event-based navigation using React Router |

**Solution Implemented:**

1. Created event system in `api.ts`:
```typescript
export const AUTH_EVENTS = {
  SESSION_EXPIRED: 'auth:session-expired',
} as const;

function dispatchAuthExpired(reason: string) {
  window.dispatchEvent(
    new CustomEvent(AUTH_EVENTS.SESSION_EXPIRED, { detail: { reason } })
  );
}
```

2. Updated `ProtectedRoute.tsx` to listen for events:
```typescript
useEffect(() => {
  window.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleAuthExpired);
  return () => {
    window.removeEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleAuthExpired);
  };
}, [handleAuthExpired]);
```

**Benefits:**
- No more hard page reloads on auth expiration
- Users don't lose unsaved form data
- Proper React Router navigation with history support
- Clean separation between API layer and navigation

---

### ~~HIGH-7: Inconsistent Error Response Format~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/server/utils/response.ts`, `src/server/middleware/errorHandler.ts`, route files |
| **Resolution** | Created standardized response utilities and error handler |

**Solution Implemented:**

1. Created `src/server/utils/response.ts` with:
   - `sendSuccess(res, data, statusCode)` - Wraps data in `{ success: true, data }`
   - `sendError(res, code, message, statusCode, details)` - Returns `{ success: false, error: {...} }`
   - Convenience functions: `badRequest()`, `notFound()`, `unauthorized()`, `internalError()`, etc.
   - `ApiError` class for throwing typed errors
   - Standard error codes: `BAD_REQUEST`, `VALIDATION_ERROR`, `NOT_FOUND`, etc.

2. Created `src/server/middleware/errorHandler.ts`:
   - Global error handler catches unhandled errors
   - Formats `ApiError`, `ZodError`, and unknown errors consistently
   - Registered after all routes in `index.ts`

3. Updated `src/server/validation/middleware.ts`:
   - Uses `validationError()` for Zod validation failures

4. Updated `src/client/lib/api.ts`:
   - Auto-unwraps new envelope format `{ success: true, data }` → `data`
   - Handles legacy format for backward compatibility
   - Extracts error message from new format

**Response Format:**
```typescript
// Success (200, 201, etc.)
{ success: true, data: { id: 1, name: "..." } }

// Error (400, 404, 500, etc.)
{ success: false, error: { code: "NOT_FOUND", message: "Account not found" } }
```

**Example route updated:** `src/server/routes/accounts.ts` demonstrates the new pattern.

---

## Medium Priority Issues

> **Improve maintainability and AI agent experience**

### ~~MED-1: No JSDoc Comments on Services~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | All `services/*.ts` files |
| **Resolution** | Added comprehensive JSDoc to all 9 service files |

**Current:**
```typescript
export async function getDashboardData(userId: string): Promise<DashboardData> {
```

**Should be:**
```typescript
/**
 * Fetches aggregated dashboard data for a user including:
 * - Net worth calculation across all account types
 * - Stock portfolio summary with live prices
 * - Due recurring transactions
 * - Recent transactions
 *
 * @param userId - Supabase user UUID
 * @returns Dashboard data with all financial summaries
 * @throws Error if database query fails
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
```

---

### MED-2: No Test Coverage

| Field | Value |
|-------|-------|
| **Status** | 🔴 Open |
| **Files** | Entire codebase |
| **Impact** | AI agents can't verify changes work correctly |

**Recommended test files to create:**
```
src/server/services/__tests__/
  currency.test.ts      # Exchange rate calculations
  balance.test.ts       # Account balance logic
  portfolio.test.ts     # Stock portfolio calculations
  projection.test.ts    # Financial projections

src/server/routes/__tests__/
  accounts.test.ts      # Account CRUD
  dashboard.test.ts     # Dashboard endpoint
```

---

### ~~MED-3: No Error Boundaries in Frontend~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/client/App.tsx`, `src/client/components/ErrorBoundary.tsx` |
| **Resolution** | Added ErrorBoundary component wrapping protected routes |

**Solution:**
```typescript
// src/client/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

---

### ~~MED-4: Date Math Bug in Recurring Transactions~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/server/routes/recurring.ts` |
| **Resolution** | Replaced native Date methods with date-fns (addMonths, addYears) |

**Problem:**
```typescript
case 'monthly':
  date.setMonth(date.getMonth() + 1);  // Jan 31 + 1 month = ???
```

**Solution:**
```typescript
import { addMonths } from 'date-fns';

case 'monthly':
  return addMonths(date, 1);  // Handles edge cases correctly
```

---

### ~~MED-5: Session Fetched on Every API Call~~

| Field | Value |
|-------|-------|
| **Status** | ✅ Fixed |
| **Files** | `src/client/lib/api.ts`, `src/client/contexts/AuthContext.tsx` |
| **Resolution** | Cache access token at module level, updated by AuthContext on session change |

**Problem:**
```typescript
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();  // Every call!
```

**Solution:**
- Cache session in AuthContext
- Pass token from context instead of fetching each time

---

### MED-6: No Pagination for Large Lists

| Field | Value |
|-------|-------|
| **Status** | 🔴 Open |
| **Files** | `routes/accountTransactions.ts`, `routes/pnl.ts` |
| **Impact** | Loading 1000+ transactions will be slow |

**Solution:**
```typescript
// Add pagination parameters
router.get('/', async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const transactions = await query(
    `SELECT * FROM account_transactions
     WHERE account_id = $1
     ORDER BY date DESC
     LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  );
});
```

---

### MED-7: No Request Logging

| Field | Value |
|-------|-------|
| **Status** | 🔴 Open |
| **Files** | `src/server/index.ts` |
| **Impact** | Hard to debug production issues |

**Solution:**
```typescript
import morgan from 'morgan';

app.use(morgan('combined'));  // Or custom format
```

---

### MED-8: Division by Zero in Portfolio Calculations

| Field | Value |
|-------|-------|
| **Status** | 🔴 Open |
| **Files** | `src/server/services/portfolio.ts:66` |
| **Impact** | Edge case can return NaN |

**Problem:**
```typescript
const dayChangePercent = totalValue > 0
  ? (totalDayChange / (totalValue - totalDayChange)) * 100
  : 0;
// If totalValue === totalDayChange, divides by zero!
```

**Solution:**
```typescript
const previousValue = totalValue - totalDayChange;
const dayChangePercent = previousValue > 0
  ? (totalDayChange / previousValue) * 100
  : 0;
```

---

## Low Priority Issues

> **Nice to have improvements**

### LOW-1: No Rate Limiting on API

| Field | Value |
|-------|-------|
| **Status** | 🟡 Open |
| **Files** | `src/server/index.ts` |
| **Impact** | API vulnerable to abuse |

### LOW-2: No Circuit Breaker for Yahoo Finance

| Field | Value |
|-------|-------|
| **Status** | 🟡 Open |
| **Files** | `src/server/services/yahoo.ts` |
| **Impact** | If Yahoo API fails, entire dashboard fails |

### LOW-3: No Retry Logic for API Calls

| Field | Value |
|-------|-------|
| **Status** | 🟡 Open |
| **Files** | `src/client/lib/api.ts` |
| **Impact** | Transient failures show as errors |

### LOW-4: Stock Quotes Not Cached

| Field | Value |
|-------|-------|
| **Status** | 🟡 Open |
| **Files** | `src/server/services/yahoo.ts` |
| **Impact** | Repeated calls for same symbols |

### LOW-5: No Migration System

| Field | Value |
|-------|-------|
| **Status** | 🟡 Open |
| **Files** | `src/server/db/schema.ts` |
| **Impact** | Manual schema changes, hard to track versions |

### LOW-6: TypeScript `any` in Query Helpers

| Field | Value |
|-------|-------|
| **Status** | 🟡 Open |
| **Files** | `src/server/db/schema.ts:310-325` |
| **Impact** | Reduced type safety |

---

## Implementation Phases

### Phase 1: Security & Foundation (Week 1)

| Task | Issue | Effort |
|------|-------|--------|
| ~~Rotate credentials, add .env to .gitignore~~ | ~~CRIT-1~~ | ~~N/A~~ |
| Move CORS origins to env vars | CRIT-3 | 30 min |
| Create shared types package | HIGH-3 | 2 hours |
| Add JSDoc to all services | MED-1 | 3 hours |

### Phase 2: Performance (Week 2)

| Task | Issue | Effort |
|------|-------|--------|
| Add batch query methods | HIGH-1 | 4 hours |
| Fix N+1 queries in services | HIGH-1 | 4 hours |
| Add missing database indexes | HIGH-2 | 1 hour |
| Fix exchange rates config | CRIT-2 | 2 hours |

### Phase 3: Validation & Errors (Week 3)

| Task | Issue | Effort |
|------|-------|--------|
| Add Zod validation schemas | HIGH-4 | 4 hours |
| Create consistent API response wrapper | HIGH-7 | 2 hours |
| Add error handling middleware | HIGH-7 | 2 hours |
| Fix date math bug | MED-4 | 1 hour |

### Phase 4: Frontend & Testing (Week 4)

| Task | Issue | Effort |
|------|-------|--------|
| Refactor AccountPage state | HIGH-5 | 4 hours |
| Fix hard redirects | HIGH-6 | 2 hours |
| Add error boundaries | MED-3 | 2 hours |
| Add basic test coverage | MED-2 | 8 hours |

---

## File Quick Reference

| Area | Key Files |
|------|-----------|
| **Database** | `src/server/db/schema.ts`, `src/server/db/queries.ts` |
| **Services** | `src/server/services/*.ts` |
| **Routes** | `src/server/routes/*.ts` |
| **API Client** | `src/client/lib/api.ts` |
| **Types** | `src/server/db/queries.ts:3-118`, `src/client/lib/api.ts:37-171` |
| **Auth** | `src/server/middleware/auth.ts`, `src/client/contexts/AuthContext.tsx` |
| **Config** | `.env`, `src/server/index.ts`, `vite.config.ts` |

---

## Progress Tracking

Use this checklist to track completion:

```
## Critical
- [x] CRIT-1: Remove secrets from git (N/A - was never an issue)
- [x] CRIT-2: Fix exchange rates
- [x] CRIT-3: Fix hardcoded CORS

## High Priority
- [x] HIGH-1: Fix N+1 queries
- [x] HIGH-2: Add database indexes
- [x] HIGH-3: Create shared types
- [x] HIGH-4: Add Zod validation
- [x] HIGH-5: Refactor AccountPage
- [x] HIGH-6: Fix hard redirects
- [x] HIGH-7: Consistent error responses

## Medium Priority
- [x] MED-1: Add JSDoc comments
- [ ] MED-2: Add test coverage
- [x] MED-3: Add error boundaries
- [x] MED-4: Fix date math
- [x] MED-5: Cache session token
- [x] MED-6: Add pagination
- [ ] MED-7: Add request logging
- [ ] MED-8: Fix division by zero
```
