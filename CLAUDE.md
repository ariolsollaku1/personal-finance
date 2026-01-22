# Personal Finance Manager - AI Agent Documentation

> **Additional Documentation**: See `/docs/` folder for detailed documentation:
> - [API.md](docs/API.md) - Complete REST API reference with request/response examples
> - [DATABASE.md](docs/DATABASE.md) - SQLite schema, queries, and data model
> - [FRONTEND.md](docs/FRONTEND.md) - React components, hooks, and styling guide
> - [SERVICES.md](docs/SERVICES.md) - Yahoo Finance and Tax calculation services
> - [DEVELOPMENT.md](docs/DEVELOPMENT.md) - Development workflow and common tasks

## Project Overview

A full-stack personal finance management application with:
- **Multi-account support**: Bank, Cash, Stock, Loan, Credit Card, and Asset accounts
- **Multi-currency**: EUR, USD, ALL (Albanian Lek) with automatic conversion
- **Stock portfolio tracking**: Real-time prices from Yahoo Finance, per-account holdings
- **Dividend tracking**: With Albanian tax calculations (8% flat rate)
- **Recurring transactions**: Weekly, bi-weekly, monthly, yearly
- **Transfers between accounts**: Cross-currency support
- **Categories and Payees**: For transaction organization
- **Financial Projections**: YTD and 12-month forward projections based on recurring transactions
- **Profit & Loss Reports**: Monthly P&L with transaction details

Built with TypeScript throughout, using Express.js backend, React frontend, SQLite database, and Yahoo Finance for real-time stock data.

## Quick Reference

| Component | Technology | Port | Entry Point |
|-----------|------------|------|-------------|
| Backend | Express.js + TypeScript | 3000 | `src/server/index.ts` |
| Frontend | React + TypeScript + Tailwind | 5173 | `src/client/main.tsx` |
| Database | SQLite (better-sqlite3) | - | `data/portfolio.db` |
| Stock Data | yahoo-finance2 (v3) | - | `src/server/services/yahoo.ts` |

## Commands

```bash
npm run dev          # Start both servers (concurrently)
npm run dev:server   # Start only backend (tsx watch)
npm run dev:client   # Start only frontend (vite)
npm run build        # Production build
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌───────────┐  ┌─────────────┐  ┌───────────┐  ┌──────────┐   │
│  │ Dashboard │  │ AccountPage │  │Projection │  │   P&L    │   │
│  └─────┬─────┘  └──────┬──────┘  └─────┬─────┘  └────┬─────┘   │
│        └────────────────┴──────────────┴─────────────┘         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Components Layer                        │   │
│  │  Layout/Sidebar | Portfolio/ | Dividends/ | Transfers/  │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │              Hooks & API Layer (lib/api.ts)              │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTP (Vite proxy /api → :3000)
┌─────────────────────────────┼───────────────────────────────────┐
│                             │        BACKEND (Express)          │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │                    Routes Layer                          │   │
│  │  /api/accounts | /api/holdings | /api/dividends         │   │
│  │  /api/dashboard | /api/quotes | /api/transfers          │   │
│  │  /api/categories | /api/payees | /api/recurring         │   │
│  │  /api/projection | /api/pnl                             │   │
│  └───────────┬─────────────────────┬───────────────────────┘   │
│              │                     │                            │
│  ┌───────────┴───────┐  ┌─────────┴─────────┐                  │
│  │  Services Layer   │  │   Database Layer  │                  │
│  │  yahoo.ts | tax.ts│  │  schema.ts        │                  │
│  └───────────────────┘  │  queries.ts       │                  │
│                         └─────────┬─────────┘                  │
└───────────────────────────────────┼─────────────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          │   SQLite Database │
                          │  data/portfolio.db│
                          └───────────────────┘
```

---

## Directory Structure

```
finance/
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript config (frontend)
├── tsconfig.node.json        # TypeScript config (vite)
├── tsconfig.server.json      # TypeScript config (backend)
├── vite.config.ts            # Vite bundler config
├── tailwind.config.js        # Tailwind CSS config
├── postcss.config.js         # PostCSS config
│
├── src/
│   ├── server/                    # BACKEND
│   │   ├── index.ts               # Express app entry, middleware, routes
│   │   │
│   │   ├── db/                    # Database layer
│   │   │   ├── schema.ts          # Table creation, DB initialization
│   │   │   └── queries.ts         # All SQL queries as functions
│   │   │
│   │   ├── routes/                # API endpoints
│   │   │   ├── accounts.ts        # Account CRUD, per-account portfolio
│   │   │   ├── holdings.ts        # Stock holdings (per-account)
│   │   │   ├── dividends.ts       # Dividends (per-account), tax summary
│   │   │   ├── dashboard.ts       # Aggregated dashboard data
│   │   │   ├── quotes.ts          # Yahoo Finance quotes, search, history
│   │   │   ├── accountTransactions.ts  # Bank/cash transactions
│   │   │   ├── recurring.ts       # Recurring transactions
│   │   │   ├── transfers.ts       # Account transfers
│   │   │   ├── categories.ts      # Category CRUD
│   │   │   ├── payees.ts          # Payee CRUD
│   │   │   ├── projection.ts      # Financial projections
│   │   │   └── pnl.ts             # Profit & Loss reports
│   │   │
│   │   └── services/              # Business logic
│   │       ├── yahoo.ts           # Yahoo Finance API wrapper (v3)
│   │       └── tax.ts             # Albanian dividend tax calculations
│   │
│   └── client/                    # FRONTEND
│       ├── index.html             # HTML entry point
│       ├── main.tsx               # React entry point
│       ├── App.tsx                # Router setup
│       ├── index.css              # Tailwind imports + global styles
│       │
│       ├── pages/                 # Route components
│       │   ├── Dashboard.tsx      # Net worth, stock portfolio overview
│       │   ├── AccountPage.tsx    # Account detail (bank/cash/stock/loan/credit/asset)
│       │   ├── AddAccountPage.tsx # Create new account
│       │   ├── Dividends.tsx      # All dividends view
│       │   ├── TransfersPage.tsx  # Account transfers
│       │   ├── ProjectionPage.tsx # Financial projections with charts
│       │   ├── PnLPage.tsx        # Monthly P&L with transaction details
│       │   └── settings/
│       │       ├── CategoriesPage.tsx
│       │       ├── PayeesPage.tsx
│       │       └── CurrencyPage.tsx
│       │
│       ├── components/            # Reusable UI components
│       │   ├── Layout/
│       │   │   ├── Sidebar.tsx        # Collapsible sidebar with account list
│       │   │   └── SidebarLayout.tsx  # Main layout wrapper
│       │   │
│       │   ├── Portfolio/
│       │   │   ├── Summary.tsx        # Portfolio summary with auto-refresh
│       │   │   ├── HoldingsList.tsx   # Sortable holdings table
│       │   │   ├── HoldingRow.tsx     # Single holding with sell/delete
│       │   │   ├── AddHoldingForm.tsx # Buy shares form (per-account)
│       │   │   └── SellForm.tsx       # Sell shares form
│       │   │
│       │   ├── Dividends/
│       │   │   ├── DividendList.tsx
│       │   │   ├── DividendForm.tsx   # Add dividend (per-account)
│       │   │   └── TaxSummary.tsx     # Annual tax breakdown
│       │   │
│       │   ├── Charts/
│       │   │   └── PerformanceChart.tsx  # Stock price history
│       │   │
│       │   └── StockSearch.tsx    # Autocomplete stock search
│       │
│       └── lib/
│           ├── api.ts             # API client functions + TypeScript types
│           └── currency.ts        # Currency formatting utilities
│
└── data/
    └── portfolio.db              # SQLite database file (gitignored)
```

---

## Account Types

| Type | Icon | Description | Net Worth Calculation |
|------|------|-------------|----------------------|
| `bank` | 🏦 | Checking, savings accounts | Balance adds to net worth |
| `cash` | 💵 | Physical cash, wallet | Balance adds to net worth |
| `stock` | 📈 | Investment/brokerage accounts | Cost basis adds to net worth |
| `asset` | 🏠 | Real estate, vehicles, valuables | Initial value adds to net worth |
| `loan` | 📋 | Mortgages, personal loans | Balance subtracts from net worth |
| `credit` | 💳 | Credit cards | Amount owed subtracts from net worth |

### Credit Card Logic
- `initial_balance` = Credit limit
- `balance` = Available credit
- Amount owed = `initial_balance - balance`
- Sidebar and dashboard show amount owed (not available credit)

### Asset Account Logic
- `initial_balance` = Current value of the asset
- No transactions, just tracks value
- Use "Edit" to update value when it changes

---

## Database Schema

### Core Tables

#### `accounts` - All account types
```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('stock', 'bank', 'cash', 'loan', 'credit', 'asset')),
  currency TEXT NOT NULL CHECK(currency IN ('EUR', 'USD', 'ALL')),
  initial_balance REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `holdings` - Stock positions (per-account)
```sql
CREATE TABLE holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  shares REAL NOT NULL,
  avg_cost REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, symbol)  -- One holding per symbol per account
);
```

#### `dividends` - Dividend payments (per-account)
```sql
CREATE TABLE dividends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  amount REAL NOT NULL,
  shares_held REAL NOT NULL,
  ex_date TEXT NOT NULL,
  pay_date TEXT,
  tax_rate REAL NOT NULL,
  tax_amount REAL NOT NULL,
  net_amount REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `account_transactions` - Bank/cash transactions
```sql
CREATE TABLE account_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('inflow', 'outflow')),
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  payee_id INTEGER REFERENCES payees(id),
  category_id INTEGER REFERENCES categories(id),
  notes TEXT,
  transfer_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `categories` and `payees`
```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT DEFAULT 'expense' CHECK(type IN ('income', 'expense')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `recurring_transactions`
```sql
CREATE TABLE recurring_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('inflow', 'outflow')),
  amount REAL NOT NULL,
  payee_id INTEGER REFERENCES payees(id),
  category_id INTEGER REFERENCES categories(id),
  notes TEXT,
  frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  next_due_date TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `transfers`
```sql
CREATE TABLE transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_account_id INTEGER NOT NULL REFERENCES accounts(id),
  to_account_id INTEGER NOT NULL REFERENCES accounts(id),
  from_amount REAL NOT NULL,
  to_amount REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `settings`
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Keys: dividend_tax_rate, main_currency, sidebar_collapsed
```

---

## API Reference

### Accounts

| Endpoint | Description |
|----------|-------------|
| `GET /api/accounts` | List all accounts with balances (cost basis for stock) |
| `POST /api/accounts` | Create account |
| `GET /api/accounts/:id` | Get account with balance |
| `PUT /api/accounts/:id` | Update account |
| `DELETE /api/accounts/:id` | Delete account |
| `GET /api/accounts/:id/portfolio` | Stock account portfolio with live prices |

### Holdings (Stock Accounts)

| Endpoint | Description |
|----------|-------------|
| `GET /api/holdings` | List all holdings |
| `GET /api/holdings/account/:accountId` | Holdings for specific account |
| `POST /api/holdings` | Buy shares (requires accountId) |
| `POST /api/holdings/:symbol/sell` | Sell shares (requires accountId) |
| `DELETE /api/holdings/:id` | Delete holding |

### Dividends

| Endpoint | Description |
|----------|-------------|
| `GET /api/dividends` | List all dividends |
| `GET /api/dividends/account/:accountId` | Dividends for specific account |
| `POST /api/dividends` | Record dividend (requires accountId) |
| `DELETE /api/dividends/:id` | Delete dividend |
| `GET /api/dividends/tax` | Tax summary (optional accountId filter) |
| `PUT /api/dividends/tax-rate` | Update tax rate |

### Dashboard

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard` | Aggregated data with stock portfolio overview |

**Response includes:**
- `totalNetWorth` - Total across all accounts in main currency
- `stockPortfolio` - Aggregated stock data (market value, cost, gain, day change)
- `byType` - Totals by account type (bank, cash, stock, loan, credit, asset)
- `accounts` - All accounts with balances
- `dueRecurring` - Recurring transactions due today or earlier
- `recentTransactions` - Last 10 transactions

### Projection

| Endpoint | Description |
|----------|-------------|
| `GET /api/projection` | Financial projections based on recurring transactions |

**Response includes:**
- `ytd` - Year-to-date monthly data (Jan to current month)
- `future` - Next 12 months projection
- `summary` - Monthly income, expenses, savings, savings rate
- `recurringBreakdown` - Income and expense sources breakdown

### P&L (Profit & Loss)

| Endpoint | Description |
|----------|-------------|
| `GET /api/pnl` | Monthly P&L summaries from Jan 2026 onwards |
| `GET /api/pnl/:month` | Transaction details for a specific month (YYYY-MM) |

**Summary Response:**
```json
{
  "mainCurrency": "ALL",
  "months": [
    {
      "month": "2026-01",
      "label": "January 2026",
      "income": 500000,
      "expenses": 138000,
      "net": 362000,
      "transactionCount": 15
    }
  ]
}
```

**Detail Response:**
```json
{
  "month": "2026-01",
  "label": "January 2026",
  "income": 500000,
  "expenses": 138000,
  "net": 362000,
  "transactions": [
    {
      "id": 1,
      "date": "2026-01-15",
      "type": "outflow",
      "amount": 14000,
      "payee": "Market",
      "category": "Groceries",
      "accountName": "Raif - Lek",
      "accountCurrency": "ALL"
    }
  ]
}
```

### Quotes

| Endpoint | Description |
|----------|-------------|
| `GET /api/quotes/search?q=` | Search stocks by name/symbol |
| `GET /api/quotes/:symbol` | Get current quote |
| `GET /api/quotes/:symbol/history` | Historical prices |

---

## Key Features

### Financial Projections
- **YTD Chart**: Net worth progression from January to current month
- **12-Month Forecast**: Projected net worth based on recurring transactions
- **Asset Composition**: Stacked chart showing bank, cash, stocks, assets over time
- **Liquid Assets vs Debt**: Comparison chart with "Today" marker
- **Financial Health Indicators**:
  - Savings Rate (circular gauge)
  - Debt to Annual Income ratio
  - Emergency Fund (months of expenses covered)

### Profit & Loss Reports
- **Monthly Cards**: 4-column grid showing income, expenses, net for each month
- **Transaction Details**: Click any month to see full transaction list
- **Sorted by Date**: Transactions sorted newest first
- **Category & Account Info**: Each transaction shows category and source account

### Multi-Account Stock Portfolio
- **Per-account holdings**: Each stock account has its own holdings
- **Per-account dividends**: Dividends are tracked per stock account
- **Sidebar shows cost basis**: No API calls needed for sidebar (fast loading)
- **Dashboard shows live portfolio**: Aggregates all stock accounts with live prices

### Recurring Transaction Badges
- Sidebar shows badges next to each account:
  - Green badge: Count of recurring income transactions
  - Red badge: Count of recurring expense transactions

### Currency Formatting
- **ALL**: `1,235 L` (no decimals, L suffix)
- **EUR**: `1,234.56 €` (2 decimals, € suffix)
- **USD**: `$1,234.56` (2 decimals, $ prefix)

---

## Frontend Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Net worth, stock portfolio overview |
| `/projection` | ProjectionPage | Financial projections with charts |
| `/pnl` | PnLPage | Monthly P&L cards with detail modal |
| `/accounts/new` | AddAccountPage | Create new account |
| `/accounts/:id` | AccountPage | Account detail (all types) |
| `/transfers` | TransfersPage | Account transfers |
| `/settings/categories` | CategoriesPage | Manage categories |
| `/settings/payees` | PayeesPage | Manage payees |
| `/settings/currency` | CurrencyPage | Set main currency |

---

## Sidebar Navigation

```
┌────────────────────┐
│ [≡] Finance Manager│
├────────────────────┤
│ Dashboard          │
│ Projection         │
│ P&L                │
├────────────────────┤
│ 🏦 BANK ACCOUNTS   │
│   > Checking  [2🟢]│
│   > Savings        │
│ 💵 CASH ACCOUNTS   │
│   > Wallet         │
│ 📈 STOCK ACCOUNTS  │
│   > Portfolio      │
│ 🏠 ASSETS          │
│   > Apartment      │
│ 📋 LOAN ACCOUNTS   │
│   > Mortgage       │
│ 💳 CREDIT CARDS    │
│   > Visa           │
├────────────────────┤
│ [+] Add Account    │
├────────────────────┤
│ SETTINGS           │
│   Categories       │
│   Payees           │
│   Currency         │
│   Transfers        │
└────────────────────┘
```

---

## Business Logic

### Net Worth Calculation
```
Net Worth = Bank + Cash + Stock(costBasis) + Assets - Loans - CreditOwed
```

Where:
- Bank/Cash: Current balance
- Stock: Sum of (shares × avgCost) for all holdings
- Assets: initial_balance (current value)
- Loans: Current balance (remaining debt)
- Credit: initial_balance - balance (limit minus available = owed)

### Projection Calculation
- Based on recurring transactions only
- Monthly net = sum(recurring inflows) - sum(recurring outflows)
- YTD: Current state projected backwards
- Future: Current state projected forwards

### P&L Calculation
- Based on actual transactions only
- Excludes transfer transactions (to avoid double counting)
- Groups by month (YYYY-MM format)
- Converts all amounts to main currency

---

## Styling

### Tailwind Classes Used
- Layout: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Cards: `bg-white rounded-lg shadow p-6`
- Tables: `min-w-full divide-y divide-gray-200`
- Buttons: `px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700`
- Forms: `px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500`

### Color Conventions
- Positive/gains: `text-green-600`
- Negative/losses: `text-red-600`
- Primary actions: `bg-blue-600`
- Destructive actions: `bg-red-600`

---

## Common Modifications

### Add a new API endpoint
1. Create/update route file in `src/server/routes/`
2. Add queries to `src/server/db/queries.ts` if needed
3. Register route in `src/server/index.ts`
4. Add API client function in `src/client/lib/api.ts`

### Add a new database table
1. Add CREATE TABLE in `src/server/db/schema.ts`
2. Add query functions in `src/server/db/queries.ts`
3. Restart server to run migrations

### Add a new page
1. Create page component in `src/client/pages/`
2. Add Route in `src/client/App.tsx`
3. Add link in Sidebar if needed

---

## File Locations Quick Reference

| Need to... | File |
|------------|------|
| Add API route | `src/server/routes/*.ts` + `src/server/index.ts` |
| Add database query | `src/server/db/queries.ts` |
| Modify database schema | `src/server/db/schema.ts` |
| Add React page | `src/client/pages/*.tsx` + `src/client/App.tsx` |
| Add React component | `src/client/components/**/*.tsx` |
| Add API client function | `src/client/lib/api.ts` |
| Modify tax logic | `src/server/services/tax.ts` |
| Modify Yahoo Finance integration | `src/server/services/yahoo.ts` |
| Currency formatting | `src/client/lib/currency.ts` |
| Sidebar navigation | `src/client/components/Layout/Sidebar.tsx` |
| Projection logic | `src/server/routes/projection.ts` |
| P&L logic | `src/server/routes/pnl.ts` |
