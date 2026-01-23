# Database Documentation

## Overview

- **Database**: SQLite 3
- **Driver**: better-sqlite3 (synchronous)
- **Location**: `data/portfolio.db`
- **Schema File**: `src/server/db/schema.ts`
- **Queries File**: `src/server/db/queries.ts`

## Multi-User Architecture

All user-facing tables include a `user_id` column (Supabase UUID) for data isolation:
- Each user can only access their own data
- All queries are filtered by `user_id`
- Indexes on `user_id` columns for performance

---

## Schema

### accounts

Central table for all account types.

```sql
CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('stock', 'bank', 'cash', 'loan', 'credit', 'asset')),
  currency TEXT NOT NULL CHECK(currency IN ('EUR', 'USD', 'ALL')),
  initial_balance REAL DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier |
| user_id | TEXT | NOT NULL | Supabase user UUID |
| name | TEXT | NOT NULL | Account display name |
| type | TEXT | NOT NULL, CHECK | 'stock', 'bank', 'cash', 'loan', 'credit', 'asset' |
| currency | TEXT | NOT NULL, CHECK | 'EUR', 'USD', or 'ALL' |
| initial_balance | REAL | DEFAULT 0 | Starting balance |
| is_favorite | INTEGER | DEFAULT 0 | 1 = favorited for quick access |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | ISO timestamp |

**Account Types:**
- **bank**: Bank accounts (checking, savings)
- **cash**: Physical cash accounts
- **stock**: Investment/brokerage accounts with holdings
- **loan**: Loans and mortgages (balance typically negative)
- **credit**: Credit cards (balance typically negative)
- **asset**: Other assets (property, vehicles, valuables)

---

### holdings

Stock positions, linked to stock accounts. One row per symbol per account.

```sql
CREATE TABLE holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  shares REAL NOT NULL,
  avg_cost REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, symbol)
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier |
| account_id | INTEGER | NOT NULL, FK | Stock account reference |
| symbol | TEXT | NOT NULL | Stock ticker (uppercase) |
| shares | REAL | NOT NULL | Number of shares owned |
| avg_cost | REAL | NOT NULL | Average cost per share |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | ISO timestamp |

**Business Rules:**
- `UNIQUE(account_id, symbol)` - one holding per symbol per account
- Symbol stored uppercase
- When buying more shares: recalculate weighted average cost
- When selling all shares: delete the row

---

### transactions

Stock buy/sell history, linked to accounts.

```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
  shares REAL NOT NULL,
  price REAL NOT NULL,
  fees REAL DEFAULT 0,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

### dividends

Dividend payments with tax calculations, linked to stock accounts.

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

| Column | Type | Description |
|--------|------|-------------|
| account_id | INTEGER | Stock account reference |
| amount | REAL | Gross dividend amount (total) |
| shares_held | REAL | Shares owned at ex-date |
| tax_rate | REAL | Tax rate applied (e.g., 0.08) |
| tax_amount | REAL | Tax withheld |
| net_amount | REAL | Net after tax |

**Tax Calculation:**
```
amount = amountPerShare × shares_held
tax_amount = amount × tax_rate
net_amount = amount - tax_amount
```

---

### account_transactions

Transactions for bank and cash accounts.

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

| Column | Type | Description |
|--------|------|-------------|
| type | TEXT | 'inflow' (income) or 'outflow' (expense) |
| payee_id | INTEGER | Optional payee reference |
| category_id | INTEGER | Optional category reference |
| transfer_id | INTEGER | Links to transfers table if part of transfer |

---

### categories

Income/expense categories for organizing transactions. Per-user with unique names.

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'expense' CHECK(type IN ('income', 'expense')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);
CREATE INDEX idx_categories_user_id ON categories(user_id);
```

**Default categories seeded for new users:**
- Income: Salary, Bonus, Investment Income, Other Income
- Expense: Groceries, Utilities, Transportation, Entertainment, etc.

---

### payees

Payee/merchant names for transactions. Per-user with unique names.

```sql
CREATE TABLE payees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);
CREATE INDEX idx_payees_user_id ON payees(user_id);
```

---

### recurring_transactions

Scheduled recurring transactions.

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

| Column | Type | Description |
|--------|------|-------------|
| frequency | TEXT | 'weekly', 'biweekly', 'monthly', 'yearly' |
| next_due_date | TEXT | When next occurrence is due |
| is_active | INTEGER | 1 = active, 0 = paused |

---

### transfers

Links two account_transactions for account-to-account transfers.

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

**Notes:**
- Different amounts support cross-currency transfers
- Creates linked outflow/inflow transactions in both accounts

---

### user_settings

Per-user key-value store for application settings.

```sql
CREATE TABLE user_settings (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);
```

**Current Keys:**
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| dividend_tax_rate | float string | "0.08" | Albanian dividend tax rate |
| main_currency | string | "ALL" | Dashboard totals currency |
| sidebar_collapsed | string | "0" | "1" = collapsed, "0" = expanded |

**Note:** Default settings are seeded when a new user is initialized via `/api/auth/init`.

---

## Query Functions

Located in `src/server/db/queries.ts`

> **Note:** All query functions require `userId` as the first parameter for multi-user data isolation.

### Account Queries

```typescript
accountQueries.getAll(userId: string): Account[]
accountQueries.getById(userId: string, id: number): Account | undefined
accountQueries.create(userId: string, name, type, currency, initialBalance): number
accountQueries.update(userId: string, id, name, currency, initialBalance): void
accountQueries.delete(userId: string, id: number): void
accountQueries.getBalance(userId: string, id: number): { balance: number } | undefined
```

### Holdings Queries

```typescript
holdingsQueries.getAll(userId: string): Holding[]
holdingsQueries.getByAccount(userId: string, accountId: number): Holding[]
holdingsQueries.getBySymbolAndAccount(userId: string, symbol, accountId): Holding | undefined
holdingsQueries.create(userId: string, accountId, symbol, shares, avgCost): number
holdingsQueries.update(userId: string, id, shares, avgCost): void
holdingsQueries.delete(userId: string, id: number): void
```

### Dividend Queries

```typescript
dividendQueries.getAll(userId: string): Dividend[]
dividendQueries.getByAccount(userId: string, accountId: number): Dividend[]
dividendQueries.create(userId: string, accountId, symbol, amount, sharesHeld, exDate, payDate, taxRate, taxAmount, netAmount): number
dividendQueries.delete(userId: string, id: number): void
dividendQueries.getTaxSummary(userId: string, year?, accountId?): TaxSummaryYear[]
```

### Account Transaction Queries

```typescript
accountTransactionQueries.getByAccount(userId: string, accountId): AccountTransaction[]
accountTransactionQueries.create(userId: string, accountId, type, amount, date, payeeId?, categoryId?, notes?): number
accountTransactionQueries.delete(userId: string, id: number): void
```

### Recurring Queries

```typescript
recurringQueries.getByAccount(userId: string, accountId): RecurringTransaction[]
recurringQueries.getDue(userId: string, date: string): RecurringTransaction[]
recurringQueries.create(userId: string, accountId, type, amount, ...): number
recurringQueries.apply(userId: string, id: number): void  // Creates transaction, advances date
recurringQueries.delete(userId: string, id: number): void
```

### Category/Payee Queries

```typescript
categoryQueries.getAll(userId: string): Category[]
categoryQueries.findOrCreate(userId: string, name, type): number
categoryQueries.delete(userId: string, id: number): void

payeeQueries.getAll(userId: string): Payee[]
payeeQueries.search(userId: string, query: string): Payee[]
payeeQueries.findOrCreate(userId: string, name): number
payeeQueries.merge(userId: string, keepId, mergeIds): void
payeeQueries.delete(userId: string, id: number): void
```

### Settings Queries

```typescript
settingsQueries.get(userId: string, key: string): string | undefined
settingsQueries.set(userId: string, key: string, value: string): void
settingsQueries.getDividendTaxRate(userId: string): number
settingsQueries.getMainCurrency(userId: string): Currency
settingsQueries.getSidebarCollapsed(userId: string): boolean
```

---

## TypeScript Types

```typescript
type AccountType = 'stock' | 'bank' | 'cash' | 'loan' | 'credit' | 'asset';
type Currency = 'EUR' | 'USD' | 'ALL';
type TransactionType = 'inflow' | 'outflow';
type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: Currency;
  initial_balance: number;
  created_at: string;
}

interface Holding {
  id: number;
  account_id: number;
  symbol: string;
  shares: number;
  avg_cost: number;
  created_at: string;
}

interface Dividend {
  id: number;
  account_id: number;
  symbol: string;
  amount: number;
  shares_held: number;
  ex_date: string;
  pay_date: string | null;
  tax_rate: number;
  tax_amount: number;
  net_amount: number;
  created_at: string;
}

interface AccountTransaction {
  id: number;
  account_id: number;
  type: TransactionType;
  amount: number;
  date: string;
  payee_id: number | null;
  category_id: number | null;
  notes: string | null;
  transfer_id: number | null;
  created_at: string;
}

interface RecurringTransaction {
  id: number;
  account_id: number;
  type: TransactionType;
  amount: number;
  payee_id: number | null;
  category_id: number | null;
  notes: string | null;
  frequency: Frequency;
  next_due_date: string;
  is_active: number;
  created_at: string;
}
```

---

## Database Initialization

On server start, `initDatabase()` is called in `src/server/db/schema.ts`:

1. Creates data directory if not exists
2. Opens/creates SQLite database
3. Enables foreign keys pragma
4. Creates all tables with IF NOT EXISTS
5. Runs migrations (adds account_id columns if missing)
6. Seeds default data (categories, settings)

---

## Migrations

The schema includes migration logic for existing databases:

```typescript
// Add account_id to holdings if missing
db.exec(`ALTER TABLE holdings ADD COLUMN account_id INTEGER REFERENCES accounts(id)`);

// Create default stock account and link existing holdings
const defaultAccountId = accountQueries.create('My Portfolio', 'stock', 'USD', 0);
db.exec(`UPDATE holdings SET account_id = ${defaultAccountId} WHERE account_id IS NULL`);
```

---

## Direct Database Access

```bash
# Open database
sqlite3 data/portfolio.db

# Common queries
.tables                              # List tables
.schema accounts                     # Show table schema
SELECT * FROM accounts;              # View all accounts
SELECT * FROM holdings;              # View all holdings

# Holdings per account
SELECT a.name, h.symbol, h.shares, h.avg_cost
FROM holdings h
JOIN accounts a ON h.account_id = a.id;

# Dividends with tax totals by year
SELECT strftime('%Y', ex_date) as year,
       SUM(amount) as gross,
       SUM(tax_amount) as tax,
       SUM(net_amount) as net
FROM dividends
GROUP BY year;
```

---

## Backup/Restore

```bash
# Backup
cp data/portfolio.db data/portfolio.db.backup

# Restore
cp data/portfolio.db.backup data/portfolio.db

# Export to SQL
sqlite3 data/portfolio.db .dump > backup.sql

# Import from SQL
sqlite3 data/portfolio.db < backup.sql
```
