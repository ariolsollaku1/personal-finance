# Personal Finance Manager - AI Agent Documentation

> **Additional Documentation**: See `/docs/` folder for detailed documentation:
> - [API.md](docs/API.md) - Complete REST API reference with request/response examples
> - [DATABASE.md](docs/DATABASE.md) - SQLite schema, queries, and data model
> - [FRONTEND.md](docs/FRONTEND.md) - React components, hooks, and styling guide
> - [SERVICES.md](docs/SERVICES.md) - Yahoo Finance and Tax calculation services
> - [DEVELOPMENT.md](docs/DEVELOPMENT.md) - Development workflow and common tasks

## Project Overview

A full-stack personal finance management application with:
- **Multi-user authentication**: Supabase Auth with email/password and Google OAuth
- **Multi-account support**: Bank, Cash, Stock, Loan, Credit Card, and Asset accounts
- **Multi-currency**: EUR, USD, ALL (Albanian Lek) with automatic conversion
- **Stock portfolio tracking**: Real-time prices from Yahoo Finance, per-account holdings
- **Dividend tracking**: With Albanian tax calculations (8% flat rate)
- **Recurring transactions**: Weekly, bi-weekly, monthly, yearly
- **Transfers between accounts**: Cross-currency support
- **Categories and Payees**: For transaction organization
- **Financial Projections**: YTD and 12-month forward projections based on recurring transactions
- **Profit & Loss Reports**: Monthly P&L with transaction details

Built with TypeScript throughout, using Express.js backend, React frontend, SQLite database, Supabase for authentication, and Yahoo Finance for real-time stock data.

## Quick Reference

| Component | Technology | Port | Entry Point |
|-----------|------------|------|-------------|
| Backend | Express.js + TypeScript | 3000 | `src/server/index.ts` |
| Frontend | React + TypeScript + Tailwind | 5173 | `src/client/main.tsx` |
| Database | SQLite (better-sqlite3) | - | `data/portfolio.db` |
| Authentication | Supabase Auth | - | `src/server/middleware/auth.ts` |
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
│  │     AuthContext | Hooks & API Layer (lib/api.ts)         │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTP + JWT (Vite proxy /api → :3000)
┌─────────────────────────────┼───────────────────────────────────┐
│                             │        BACKEND (Express)          │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │              Auth Middleware (JWT verification)          │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │                    Routes Layer                          │   │
│  │  /api/accounts | /api/holdings | /api/dividends         │   │
│  │  /api/dashboard | /api/quotes | /api/transfers          │   │
│  │  /api/categories | /api/payees | /api/recurring         │   │
│  │  /api/projection | /api/pnl | /api/auth                 │   │
│  └───────────┬─────────────────────┬───────────────────────┘   │
│              │                     │                            │
│  ┌───────────┴───────┐  ┌─────────┴─────────┐                  │
│  │  Services Layer   │  │   Database Layer  │                  │
│  │  yahoo.ts | tax.ts│  │  schema.ts        │                  │
│  │  userSetup.ts     │  │  queries.ts       │                  │
│  └───────────────────┘  └─────────┬─────────┘                  │
└───────────────────────────────────┼─────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────┴───────┐         ┌─────────┴─────────┐      ┌─────────┴─────────┐
│ Supabase Auth │         │   SQLite Database │      │   Yahoo Finance   │
│  (JWT tokens) │         │  data/portfolio.db│      │    (stock data)   │
└───────────────┘         └───────────────────┘      └───────────────────┘
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
│   │   │   └── queries.ts         # All SQL queries as functions (userId filtered)
│   │   │
│   │   ├── lib/
│   │   │   └── supabase.ts        # Supabase admin client
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.ts            # JWT verification middleware
│   │   │
│   │   ├── routes/                # API endpoints (all require authentication)
│   │   │   ├── auth.ts            # User initialization endpoint
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
│   │       ├── tax.ts             # Albanian dividend tax calculations
│   │       └── userSetup.ts       # New user initialization (categories, settings)
│   │
│   └── client/                    # FRONTEND
│       ├── index.html             # HTML entry point
│       ├── main.tsx               # React entry point (with AuthProvider)
│       ├── App.tsx                # Router setup (public + protected routes)
│       ├── index.css              # Tailwind imports + global styles
│       │
│       ├── contexts/
│       │   └── AuthContext.tsx    # Authentication state and methods
│       │
│       ├── pages/                 # Route components
│       │   ├── LoginPage.tsx      # Email/password + Google OAuth login
│       │   ├── SignupPage.tsx     # User registration
│       │   ├── AuthCallbackPage.tsx # OAuth redirect handler
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
│       │   ├── ProtectedRoute.tsx # Auth guard for protected routes
│       │   │
│       │   ├── Layout/
│       │   │   ├── Sidebar.tsx        # Collapsible sidebar with user info + logout
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
│           ├── api.ts             # API client with auth token injection
│           ├── supabase.ts        # Supabase client for frontend
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

> **Note**: All user-facing tables include a `user_id` column for multi-user data isolation.

### Core Tables

#### `accounts` - All account types
```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,           -- Supabase user UUID
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('stock', 'bank', 'cash', 'loan', 'credit', 'asset')),
  currency TEXT NOT NULL CHECK(currency IN ('EUR', 'USD', 'ALL')),
  initial_balance REAL DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
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
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'expense' CHECK(type IN ('income', 'expense')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)  -- Unique per user
);

CREATE TABLE payees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)  -- Unique per user
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
  user_id TEXT NOT NULL,
  from_account_id INTEGER NOT NULL REFERENCES accounts(id),
  to_account_id INTEGER NOT NULL REFERENCES accounts(id),
  from_amount REAL NOT NULL,
  to_amount REAL NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_transfers_user_id ON transfers(user_id);
```

#### `user_settings` (per-user settings)
```sql
CREATE TABLE user_settings (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);
-- Keys: dividend_tax_rate, main_currency, sidebar_collapsed
```

---

## API Reference

> **Note**: All API endpoints (except `/api/auth/*`) require authentication. Include the JWT token in the `Authorization` header: `Bearer <token>`

### Authentication

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/init` | Initialize new user (creates default categories/settings) |
| `GET /api/auth/status` | Check if user is initialized |

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

## Authentication

The app uses Supabase for authentication with support for:
- **Email/Password**: Traditional signup and signin
- **Google OAuth**: One-click Google login

### Auth Flow
1. Unauthenticated users are redirected to `/login`
2. After login, users are redirected to the dashboard
3. New users are automatically initialized with default categories and settings
4. JWT tokens are automatically included in all API requests

### Environment Variables
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Data Isolation
- All data is filtered by `user_id` at the database level
- Users can only see and modify their own data
- New users get seeded with default categories and settings

---

## Frontend Routes

### Public Routes (No authentication required)

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | Email/password + Google OAuth login |
| `/signup` | SignupPage | User registration |
| `/auth/callback` | AuthCallbackPage | OAuth redirect handler |

### Protected Routes (Authentication required)

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

### Theme
The app uses an **orange** color scheme as the primary brand color.

---

## UI Design System

> **IMPORTANT**: When creating any new UI, always follow these principles and patterns. This ensures visual consistency across the entire application.

### Quick Reference

| Element | Key Classes |
|---------|-------------|
| Corners | `rounded-xl` (cards, buttons, inputs), `rounded-2xl` (hero cards, modals) |
| Shadows | `shadow-sm` (cards), `shadow-lg shadow-orange-500/25` (primary buttons) |
| Primary gradient | `bg-gradient-to-r from-orange-500 to-amber-500` |
| Branding gradient | `bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600` |
| Focus state | `focus:ring-2 focus:ring-orange-500 focus:border-transparent` |
| Transitions | `transition-all duration-200` (always add to interactive elements) |
| Page heading | `text-3xl font-bold text-gray-900` |
| Card | `bg-white rounded-xl shadow-sm p-6` |
| Primary button | `bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25` |

### Design Principles

1. **Modern & Clean**: Use generous whitespace, rounded corners (xl), and subtle shadows
2. **Split Layouts**: Full-page forms use 50/50 split with branding panel on left
3. **Mobile-First**: Responsive design, branding panels hidden on mobile (`hidden lg:flex`)
4. **Smooth Transitions**: All interactive elements use `transition-all duration-200`
5. **Visual Hierarchy**: Clear headings, supportive subtext, and grouped content
6. **Orange as Primary**: All interactive elements, links, focus states use orange-500/600
7. **Gradient Headers**: Section cards use colored gradients (green for income, red for expense, orange for primary)
8. **Hover-Reveal Actions**: Edit/delete buttons appear on row hover with `group` and `group-hover:opacity-100`
9. **Glass Effect**: Use `bg-white/20 backdrop-blur` for icons on gradient backgrounds

### Color Palette

```
Primary:     orange-500 (#f97316) - buttons, accents, links
Primary Hover: orange-600 (#ea580c)
Gradient:    from-orange-500 via-orange-600 to-amber-600 - branding panels

Text:        gray-900 (headings), gray-600 (body), gray-500 (muted)
Background:  gray-50 (page), white (cards/inputs)
Borders:     gray-200 (subtle), gray-300 (inputs)

Success:     green-600 (text), green-100 (bg)
Error:       red-700 (text), red-50 (bg), red-200 (border)
```

### Component Patterns

#### Full-Page Auth Layout (Login, Signup)
```tsx
<div className="min-h-screen flex">
  {/* Left: Branding panel - hidden on mobile */}
  <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-12 flex-col justify-between">
    {/* Logo */}
    {/* Hero text + features */}
    {/* Footer text */}
  </div>

  {/* Right: Form panel */}
  <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
    <div className="w-full max-w-md space-y-8">
      {/* Mobile logo (lg:hidden) */}
      {/* Heading + subtext */}
      {/* Error alert if any */}
      {/* OAuth buttons first */}
      {/* Divider */}
      {/* Form */}
      {/* Footer link */}
    </div>
  </div>
</div>
```

#### Logo with Icon
```tsx
<div className="flex items-center gap-3">
  <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
    <svg className="w-6 h-6 text-white" .../>
  </div>
  <span className="text-white text-xl font-semibold">Finance Manager</span>
</div>
```

#### Primary Button
```tsx
<button className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40">
  Button Text
</button>
```

#### Secondary/OAuth Button
```tsx
<button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm">
  <Icon /> Button Text
</button>
```

#### Text Input
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    Label
  </label>
  <input
    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
    placeholder="Placeholder text"
  />
</div>
```

#### Error Alert
```tsx
<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
  <svg className="w-5 h-5 flex-shrink-0" .../>
  <span className="text-sm">{error}</span>
</div>
```

#### Success State with Icon
```tsx
<div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
  <svg className="w-8 h-8 text-green-600" ...>
    <path d="M5 13l4 4L19 7" />
  </svg>
</div>
```

#### Divider with Text
```tsx
<div className="relative">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-gray-200" />
  </div>
  <div className="relative flex justify-center text-sm">
    <span className="px-4 bg-gray-50 text-gray-500">or continue with</span>
  </div>
</div>
```

#### Feature List (Branding Panel)
```tsx
<div className="flex items-center gap-3">
  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
    <svg className="w-4 h-4 text-white">
      <path d="M5 13l4 4L19 7" />
    </svg>
  </div>
  <span className="text-white">Feature description</span>
</div>
```

#### Loading Spinner
```tsx
<span className="flex items-center justify-center gap-2">
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
  Loading...
</span>
```

#### Link
```tsx
<Link className="font-semibold text-orange-600 hover:text-orange-500 transition-colors">
  Link text
</Link>
```

#### Info Box
```tsx
<div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
  <p className="text-sm text-orange-800">Info message here</p>
</div>
```

### Key Tailwind Classes

| Element | Classes |
|---------|---------|
| Page background | `bg-gray-50` |
| Card/Panel | `bg-white rounded-xl shadow-sm p-6` |
| Branding gradient | `bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600` |
| Glass effect | `bg-white/20 backdrop-blur` |
| Rounded corners | `rounded-xl` (large), `rounded-lg` (medium) |
| Shadows | `shadow-sm` (subtle), `shadow-lg shadow-orange-500/25` (buttons) |
| Transitions | `transition-all duration-200` |
| Focus state | `focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent` |
| Disabled state | `disabled:opacity-50 disabled:cursor-not-allowed` |
| Spacing | `space-y-8` (sections), `space-y-5` (form fields), `gap-3` (inline items) |

### Typography

| Element | Classes |
|---------|---------|
| Page heading | `text-3xl font-bold text-gray-900` |
| Hero heading (branding) | `text-4xl font-bold text-white leading-tight` |
| Subtext | `text-gray-600` or `text-orange-100` (on gradient) |
| Label | `text-sm font-medium text-gray-700` |
| Small/muted | `text-sm text-gray-500` |
| Footer text (branding) | `text-orange-200 text-sm` |

### Icons
Use Heroicons (outline style) via inline SVG:
- Size: `w-5 h-5` (inline), `w-6 h-6` (logo), `w-8 h-8` (large)
- Color: `text-white`, `text-gray-500`, `text-green-600`, `text-red-600`

---

### Page Header with Action Button
```tsx
<div className="flex justify-between items-center">
  <div>
    <h1 className="text-3xl font-bold text-gray-900">Page Title</h1>
    <p className="text-gray-500 mt-1">Descriptive subtitle text</p>
  </div>
  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-200">
    <svg className="w-5 h-5">...</svg>
    Action
  </button>
</div>
```

### Card with Gradient Header
```tsx
<div className="bg-white rounded-xl shadow-sm overflow-hidden">
  <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 flex items-center gap-3">
    <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
      <svg className="w-5 h-5 text-white">...</svg>
    </div>
    <div>
      <h2 className="font-semibold text-white">Card Title</h2>
      <p className="text-green-100 text-sm">Subtitle</p>
    </div>
  </div>
  <div className="divide-y divide-gray-100">
    {/* Content */}
  </div>
</div>
```

### Hero Card (Dashboard Net Worth)
```tsx
<div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-2xl shadow-xl p-8 text-white">
  <p className="text-orange-100 text-sm font-medium">Label</p>
  <p className="text-4xl font-bold mt-1">$123,456</p>
  <p className="text-orange-200 text-sm mt-2">Supporting text</p>
</div>
```

### Stat Card
```tsx
<div className="bg-white rounded-xl shadow-sm p-5">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
      <svg className="w-5 h-5 text-blue-600">...</svg>
    </div>
    <div>
      <p className="text-sm text-gray-500">Label</p>
      <p className="text-xl font-bold text-gray-900">Value</p>
    </div>
  </div>
</div>
```

### List Item with Hover-Reveal Actions
```tsx
<div className="px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors group">
  <span className="text-gray-900 font-medium">Item Name</span>
  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <button className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors">
      <svg className="w-4 h-4">...</svg>
    </button>
    <button className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
      <svg className="w-4 h-4">...</svg>
    </button>
  </div>
</div>
```

### Sidebar Active Navigation Item
```tsx
// Active state - gradient background
<NavLink className="flex items-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25">
  <svg className="w-5 h-5">...</svg>
  <span className="ml-3 font-medium">Dashboard</span>
</NavLink>

// Inactive state
<NavLink className="flex items-center px-4 py-2.5 rounded-xl text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200">
  <svg className="w-5 h-5">...</svg>
  <span className="ml-3 font-medium">Settings</span>
</NavLink>
```

### Top Navbar
```tsx
<header className="h-16 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
  <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
        <svg className="w-5 h-5 text-white">...</svg>
      </div>
      <span className="text-xl font-bold text-gray-900">Finance Manager</span>
    </div>

    {/* Navigation Links */}
    <nav className="hidden md:flex items-center gap-1">
      <NavLink className={({ isActive }) => `px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
        isActive
          ? 'bg-orange-100 text-orange-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}>
        Dashboard
      </NavLink>
      <NavLink className={({ isActive }) => `px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
        isActive
          ? 'bg-orange-100 text-orange-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}>
        Projection
      </NavLink>
    </nav>

    {/* Right side: Actions + User */}
    <div className="flex items-center gap-3">
      {/* Notification bell (optional) */}
      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200">
        <svg className="w-5 h-5">...</svg>
      </button>

      {/* User dropdown */}
      <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm">
          U
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900">user@email.com</p>
          <p className="text-xs text-gray-400">Personal Account</p>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4">...</svg>
        </button>
      </div>
    </div>
  </div>
</header>
```

### Top Navbar with Gradient
```tsx
<header className="h-16 bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg sticky top-0 z-40">
  <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
        <svg className="w-5 h-5 text-white">...</svg>
      </div>
      <span className="text-xl font-bold text-white">Finance Manager</span>
    </div>

    {/* Navigation Links */}
    <nav className="hidden md:flex items-center gap-1">
      <NavLink className={({ isActive }) => `px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
        isActive
          ? 'bg-white/20 text-white'
          : 'text-orange-100 hover:bg-white/10 hover:text-white'
      }`}>
        Dashboard
      </NavLink>
    </nav>

    {/* User */}
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-semibold text-sm">
        U
      </div>
      <button className="p-2 text-orange-100 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200">
        <svg className="w-5 h-5">...</svg>
      </button>
    </div>
  </div>
</header>
```

### Mobile Menu Button (for Top Navbar)
```tsx
<button className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200">
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
</button>
```

### Mobile Slide-out Menu
```tsx
{/* Overlay */}
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden" onClick={onClose} />

{/* Menu Panel */}
<div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 md:hidden">
  {/* Header */}
  <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100">
    <span className="font-bold text-gray-900">Menu</span>
    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
      <svg className="w-5 h-5 text-gray-500">...</svg>
    </button>
  </div>

  {/* Navigation */}
  <nav className="p-4 space-y-1">
    <NavLink className="flex items-center px-4 py-3 rounded-xl text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200">
      <svg className="w-5 h-5 mr-3">...</svg>
      Dashboard
    </NavLink>
  </nav>
</div>
```

### Sortable Table Header
```tsx
<th
  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-orange-600 transition-colors"
  onClick={() => handleSort('column')}
>
  <div className="flex items-center gap-1">
    Column Name
    <svg className="w-4 h-4">{/* Sort indicator */}</svg>
  </div>
</th>
```

### Empty State
```tsx
<div className="p-6 text-center">
  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
    <svg className="w-6 h-6 text-gray-400">...</svg>
  </div>
  <p className="text-gray-500 text-sm">No items found</p>
</div>
```

### Badge/Pill
```tsx
// Green (income/success)
<span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full">3</span>

// Red (expense/warning)
<span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-700 rounded-full">5</span>

// Gray (neutral)
<span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Label</span>
```

### Modal/Dialog
```tsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
      <h3 className="text-xl font-bold text-gray-900">Modal Title</h3>
      <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
        <svg className="w-5 h-5 text-gray-500">...</svg>
      </button>
    </div>
    <div className="p-6 overflow-y-auto">
      {/* Content */}
    </div>
  </div>
</div>
```

### Form in Card
```tsx
<div className="bg-white rounded-xl shadow-sm p-6">
  <h3 className="font-semibold text-gray-900 mb-4">Form Title</h3>
  <form className="flex gap-4">
    <input className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200" />
    <button type="submit" className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-200 shadow-lg shadow-orange-500/25">
      Submit
    </button>
  </form>
</div>
```

### User Avatar
```tsx
<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-orange-500/25">
  {email.charAt(0).toUpperCase()}
</div>
```

### Account Type Selector Card
```tsx
<button className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
  isSelected
    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20'
    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
}`}>
  <span className="text-2xl mb-2 block">🏦</span>
  <p className={`font-medium ${isSelected ? 'text-orange-700' : 'text-gray-900'}`}>Bank Account</p>
  <p className="text-xs text-gray-500 mt-1">Description text</p>
</button>
```

### Color Conventions
- Positive/gains: `text-green-600`
- Negative/losses: `text-red-600`
- Primary actions: `bg-orange-500` / `bg-orange-600`
- Destructive actions: `bg-red-600`
- Links: `text-orange-600 hover:text-orange-500`
- Focus rings: `focus:ring-orange-500`

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
| Auth middleware | `src/server/middleware/auth.ts` |
| Auth context (frontend) | `src/client/contexts/AuthContext.tsx` |
| New user setup | `src/server/services/userSetup.ts` |
| Supabase client (backend) | `src/server/lib/supabase.ts` |
| Supabase client (frontend) | `src/client/lib/supabase.ts` |
