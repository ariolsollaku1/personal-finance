# Technical Reference

Consolidated technical documentation for API, Database, and Services.

---

## Database (PostgreSQL)

### Schema Overview

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `accounts` | id, user_id, name, type, currency, initial_balance | All account types |
| `holdings` | id, account_id, symbol, shares, avg_cost | Stock positions (unique per account+symbol) |
| `transactions` | id, account_id, symbol, type, shares, price, fees, date | Stock buy/sell history |
| `dividends` | id, account_id, symbol, amount, tax_rate, tax_amount, net_amount | Dividend payments |
| `account_transactions` | id, account_id, type, amount, date, payee_id, category_id | Bank/cash transactions |
| `recurring_transactions` | id, account_id, type, amount, frequency, next_due_date | Scheduled transactions |
| `transfers` | id, user_id, from_account_id, to_account_id, from_amount, to_amount | Account transfers |
| `categories` | id, user_id, name, type | Income/expense categories |
| `payees` | id, user_id, name | Payee/merchant names |
| `user_settings` | user_id, key, value | Per-user settings (dividend_tax_rate, main_currency, sidebar_collapsed) |
| `schema_migrations` | version, description, applied_at | Migration tracking |

### Types

```typescript
type AccountType = 'stock' | 'bank' | 'cash' | 'loan' | 'credit' | 'asset';
type Currency = 'EUR' | 'USD' | 'ALL' | 'GBP' | 'CHF' | 'NOK' | 'SEK' | 'DKK' | 'PLN' | 'CZK' | 'HUF' | 'RON' | 'BGN';
type TransactionType = 'inflow' | 'outflow';
type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';
```

### Indexes

All foreign keys indexed: `account_id`, `user_id`, `payee_id`, `category_id`, `from_account_id`, `to_account_id`. Additional: `account_transactions(date)`.

### Query Functions (`src/server/db/queries.ts`)

```typescript
// Batch queries (performance optimized)
batchQueries.getAllAccountsWithBalances(userId)
batchQueries.getAllRecurringCounts(userId)
batchQueries.getRecentTransactions(userId, limit)
batchQueries.getAllTransactions(userId)

// Standard CRUD
accountQueries.getAll/getById/create/update/delete/getBalance
holdingsQueries.getAll/getByAccount/getBySymbolAndAccount/create/update/delete
dividendQueries.getAll/getByAccount/create/delete/getTaxSummary
accountTransactionQueries.getByAccount/create/update/delete
recurringQueries.getByAccount/getDue/create/apply/delete
categoryQueries.getAll/findOrCreate/delete
payeeQueries.getAll/search/findOrCreate/merge/delete
settingsQueries.get/set/getDividendTaxRate/getMainCurrency/getSidebarCollapsed
```

### Migrations

Located in `src/server/db/migrations/`. Auto-applied on server start.

| Version | Description |
|---------|-------------|
| 0 | Initial schema |
| 1 | Add account_id to existing tables |
| 2 | Add European currencies |

---

## API Endpoints

Base: `/api` | Auth: `Authorization: Bearer <token>` | Format: `{ success: true, data: {...} }`

### Accounts
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| GET | `/accounts` | - |
| POST | `/accounts` | `{ name, type, currency, initialBalance? }` |
| GET | `/accounts/:id` | - |
| PUT | `/accounts/:id` | `{ name?, currency?, initialBalance? }` |
| DELETE | `/accounts/:id` | - |
| GET | `/accounts/:id/portfolio` | Stock accounts only, returns live prices |

### Holdings
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| GET | `/holdings` | - |
| GET | `/holdings/account/:accountId` | - |
| POST | `/holdings` | `{ symbol, shares, price, fees?, date?, accountId }` |
| POST | `/holdings/:symbol/sell` | `{ shares, price, fees?, date?, accountId }` |
| DELETE | `/holdings/:id` | - |

### Dividends
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| GET | `/dividends` | `?symbol=&year=` |
| GET | `/dividends/account/:accountId` | - |
| POST | `/dividends` | `{ symbol, amountPerShare, sharesHeld?, exDate, payDate?, accountId }` |
| DELETE | `/dividends/:id` | - |
| GET | `/dividends/tax` | `?year=&accountId=` |
| PUT | `/dividends/tax-rate` | `{ rate }` |

### Transactions
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| GET | `/accounts/:accountId/transactions` | `?page=&limit=` |
| POST | `/accounts/:accountId/transactions` | `{ type, amount, date, payee?, category?, notes? }` |
| PUT | `/accounts/:accountId/transactions/:txId` | Same as POST, all optional |
| DELETE | `/accounts/:accountId/transactions/:txId` | - |

### Recurring
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| GET | `/accounts/:accountId/recurring` | - |
| POST | `/accounts/:accountId/recurring` | `{ type, amount, payee?, category?, notes?, frequency, nextDueDate }` |
| PUT | `/recurring/:id` | All fields optional |
| POST | `/recurring/:id/apply` | - |
| DELETE | `/recurring/:id` | - |

### Transfers
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| GET | `/transfers` | - |
| POST | `/transfers` | `{ fromAccountId, toAccountId, fromAmount, toAmount, date, notes? }` |
| DELETE | `/transfers/:id` | - |

### Categories & Payees
| Method | Endpoint | Body/Params |
|--------|----------|-------------|
| GET | `/categories` | - |
| POST | `/categories` | `{ name, type }` |
| PUT | `/categories/:id` | `{ name }` |
| DELETE | `/categories/:id` | - |
| GET | `/payees` | - |
| GET | `/payees/search` | `?q=` |
| POST | `/payees` | `{ name }` |
| PUT | `/payees/:id` | `{ name }` |
| DELETE | `/payees/:id` | - |
| POST | `/payees/merge` | `{ keepId, mergeIds }` |

### Dashboard & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Net worth, portfolio, due recurring, recent transactions |
| GET | `/projection` | Financial projections from recurring |
| GET | `/pnl` | Monthly P&L summaries |
| GET | `/pnl/:month` | Transaction details for month (YYYY-MM) |

### Quotes (Yahoo Finance)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quotes/search?q=` | Search stocks (max 10, EQUITY/ETF) |
| GET | `/quotes/:symbol` | Current quote (cached) |
| GET | `/quotes/:symbol/history` | `?period=1y&interval=1d` |

### Settings
| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/dashboard/settings/currency` | - |
| PUT | `/dashboard/settings/currency` | `{ currency }` |
| GET | `/dashboard/settings/sidebar` | - |
| PUT | `/dashboard/settings/sidebar` | `{ collapsed }` |

---

## Services

### Yahoo Finance (`services/yahoo.ts`)

```typescript
getQuote(symbol): Promise<Quote | null>
getMultipleQuotes(symbols): Promise<Map<string, Quote>>
getHistoricalPrices(symbol, period1, period2?, interval?): Promise<HistoricalPrice[]>
searchStocks(query): Promise<SearchResult[]>
```

**Circuit Breaker**: 5 failures → 30s cooldown. Returns cached/empty on failure.
**Quote Cache**: 1 min (market hours 14:30-21:00 UTC), 5 min (off-hours).

### Currency (`services/currency.ts`)

```typescript
getExchangeRates(): Promise<ExchangeRates>
convertCurrency(amount, from, to): Promise<number>
preCacheExchangeRates(): Promise<void>  // Called on startup
```

**API**: frankfurter.app (ECB data). **Cache**: 24 hours. **Base**: EUR.

### Tax (`services/tax.ts`)

```typescript
calculateDividendTax(dividendPerShare, sharesHeld, taxRate?): DividendTaxCalculation
getCurrentTaxRate(userId): number
setTaxRate(userId, rate): void
```

**Default rate**: 8% Albanian flat tax.

### Balance (`services/balance.ts`)

```typescript
getAllAccountsWithBalances(userId): Promise<AccountWithBalance[]>
```

Uses batch queries + parallel fetching. Returns accounts with calculated balances.

### Dashboard (`services/dashboard.ts`)

```typescript
getDashboardData(userId): Promise<DashboardData>
```

Aggregates: net worth, portfolio (live), due recurring, recent transactions, exchange rates.

### Portfolio (`services/portfolio.ts`)

```typescript
getAccountPortfolio(userId, accountId): Promise<PortfolioData>
getAggregatedPortfolio(userId): Promise<PortfolioSummary>
```

Fetches live quotes, respects circuit breaker, uses quote cache.

### Projection (`services/projection.ts`)

```typescript
getProjectionData(userId): Promise<ProjectionData>
```

Projects YTD + 12 months forward based on recurring. Frequency multipliers: weekly=4.33, biweekly=2.17, monthly=1, yearly=0.083.

### User Setup (`services/userSetup.ts`)

```typescript
isUserInitialized(userId): Promise<boolean>
initializeNewUser(userId): Promise<void>
```

Auto-called by auth middleware. Creates default categories and settings.

---

## Validation

All endpoints use Zod schemas in `src/server/validation/schemas.ts`.

```typescript
import { validateBody, createAccountSchema } from '../validation/index.js';
router.post('/', validateBody(createAccountSchema), async (req, res) => {...});
```

Error response: `{ success: false, error: { code: "VALIDATION_ERROR", message, details } }`

---

## Response Utilities

```typescript
import { sendSuccess, sendError, notFound, badRequest } from '../utils/response.js';

sendSuccess(res, data);           // { success: true, data }
sendError(res, 'CODE', 'msg');    // { success: false, error: { code, message } }
notFound(res, 'Not found');       // 404
badRequest(res, 'Invalid');       // 400
```

---

## Rate Limiting

100 requests/minute per IP. Returns 429 when exceeded.
