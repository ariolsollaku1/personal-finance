# Frontend Documentation

## Overview

- **Framework**: React 18 with TypeScript
- **Bundler**: Vite 5
- **Styling**: Tailwind CSS 3
- **Routing**: React Router DOM 6
- **Charts**: Recharts 2
- **Entry Point**: `src/client/main.tsx`

---

## Application Structure

```
src/client/
├── index.html          # HTML template
├── main.tsx            # React entry point
├── App.tsx             # Router configuration
├── index.css           # Tailwind imports + global styles
│
├── pages/              # Route-level components
│   ├── Dashboard.tsx   # / - Net worth, stock portfolio overview
│   ├── AccountPage.tsx # /accounts/:id - Account detail (all types)
│   ├── AddAccountPage.tsx # /accounts/new
│   ├── Dividends.tsx   # /dividends - All dividends view
│   ├── TransfersPage.tsx # /transfers
│   └── settings/
│       ├── CategoriesPage.tsx
│       ├── PayeesPage.tsx
│       └── CurrencyPage.tsx
│
├── components/         # Reusable components
│   ├── Layout/
│   │   ├── Sidebar.tsx         # Collapsible sidebar navigation
│   │   └── SidebarLayout.tsx   # Main layout wrapper
│   │
│   ├── Portfolio/
│   │   ├── Summary.tsx         # Portfolio summary with auto-refresh
│   │   ├── HoldingsList.tsx    # Sortable holdings table
│   │   ├── HoldingRow.tsx      # Single holding with sell/delete
│   │   ├── AddHoldingForm.tsx  # Buy shares form (per-account)
│   │   └── SellForm.tsx        # Sell shares form
│   │
│   ├── Dividends/
│   │   ├── DividendList.tsx
│   │   ├── DividendForm.tsx    # Add dividend (per-account)
│   │   └── TaxSummary.tsx      # Annual tax breakdown
│   │
│   ├── BankTransactions/
│   │   ├── TransactionList.tsx
│   │   ├── TransactionForm.tsx
│   │   ├── PayeeAutocomplete.tsx
│   │   └── CategoryAutocomplete.tsx
│   │
│   ├── Recurring/
│   │   ├── RecurringList.tsx
│   │   └── RecurringForm.tsx
│   │
│   ├── Transfers/
│   │   └── TransferForm.tsx
│   │
│   └── StockSearch.tsx     # Autocomplete stock search
│
└── lib/
    ├── api.ts              # API client + TypeScript types
    └── currency.ts         # Currency formatting utilities
```

---

## Routing

```tsx
// App.tsx
<Routes>
  <Route element={<SidebarLayout />}>
    <Route path="/" element={<Dashboard />} />
    <Route path="/accounts/new" element={<AddAccountPage />} />
    <Route path="/accounts/:id" element={<AccountPage />} />
    <Route path="/transfers" element={<TransfersPage />} />
    <Route path="/dividends" element={<Dividends />} />
    <Route path="/settings/categories" element={<CategoriesPage />} />
    <Route path="/settings/payees" element={<PayeesPage />} />
    <Route path="/settings/currency" element={<CurrencyPage />} />
  </Route>
</Routes>
```

All routes are wrapped in `<SidebarLayout>` which provides the collapsible sidebar navigation.

---

## Pages

### Dashboard (`/`)

**File**: `src/client/pages/Dashboard.tsx`

**Features**:
- Total net worth across all accounts
- Breakdown by account type (bank, cash, stock)
- **Stock Portfolio Overview** - aggregated across all stock accounts:
  - Market value, cost basis, total gain/loss, day change
- Account list with balances
- Due recurring transactions
- Recent transactions

### AccountPage (`/accounts/:id`)

**File**: `src/client/pages/AccountPage.tsx`

Handles all account types with conditional rendering:

**Stock Accounts**:
- Portfolio summary with live prices (auto-refresh every 60s)
- **Cash balance display** with total account value (holdings + cash)
- "Updated X ago" indicator
- Three tabs: Holdings, Dividends, Transactions
- Sortable holdings table
- Add holding form (automatically deducts cost from cash balance)
- Sell form (automatically adds proceeds to cash balance)
- Dividends list with add form
- Tax summary
- **Transactions tab**: Deposits/withdrawals for the account
- **Recurring transactions**: Schedule regular deposits

**Bank/Cash Accounts**:
- Transaction list with running balance
- Add/Edit transaction forms
- Edit modal for existing transactions
- Recurring transactions list with edit support
- Payee/category autocomplete

### Dividends (`/dividends`)

**File**: `src/client/pages/Dividends.tsx`

- All dividends across all accounts (read-only view)
- Tax summary by year
- Note: Add dividends from within each stock account

---

## Components

### Layout/Sidebar

**File**: `src/client/components/Layout/Sidebar.tsx`

**Features**:
- Collapsible (state saved to localStorage/server)
- Account list grouped by type (Bank, Cash, Stock)
- For stock accounts: shows **cost basis** (not live market value)
- Dashboard link
- Add Account button
- Settings section (Categories, Payees, Currency)
- **Auto-refresh**: Reloads on route change and listens for `accounts-changed` events

**Account Display**:
- Expanded: Account name + balance/cost basis
- Collapsed: Icon only with tooltip

**Refresh Mechanism**:
```typescript
// Refresh on route change
useEffect(() => {
  loadAccounts();
}, [location.pathname]);

// Listen for custom events (edit, delete, transactions)
useEffect(() => {
  const handleAccountsChanged = () => loadAccounts();
  window.addEventListener('accounts-changed', handleAccountsChanged);
  return () => window.removeEventListener('accounts-changed', handleAccountsChanged);
}, []);
```

To trigger sidebar refresh from other components:
```typescript
window.dispatchEvent(new Event('accounts-changed'));
```

### Portfolio/Summary

**File**: `src/client/components/Portfolio/Summary.tsx`

**Props**:
```typescript
interface SummaryProps {
  portfolio: PortfolioSummary | null;  // includes cashBalance
  lastUpdated: Date | null;
  onRefresh: () => void;
  refreshing: boolean;
}
```

**Features**:
- **Cash Balance** and **Total Account Value** (cash + holdings)
- Total Value, Cost, Gain/Loss, Day Change
- "Updated X ago" text
- Refresh button
- Auto-pauses when tab is hidden
- Auto-refreshes every 60 seconds

### Portfolio/HoldingsList

**File**: `src/client/components/Portfolio/HoldingsList.tsx`

**Props**:
```typescript
interface HoldingsListProps {
  holdings: HoldingWithQuote[];
  accountId: number;
  onUpdate: () => void;
}
```

**Features**:
- Sortable columns (click header to sort):
  - Symbol, Shares, Avg Cost, Price, Market Value, Gain/Loss, Day Change
- Sort direction toggle (asc/desc)
- Sort icons indicate current column/direction
- Empty state message

### Portfolio/HoldingRow

**File**: `src/client/components/Portfolio/HoldingRow.tsx`

**Props**:
```typescript
interface HoldingRowProps {
  holding: HoldingWithQuote;
  accountId: number;
  onUpdate: () => void;
}
```

**Actions**:
- Sell - Opens inline SellForm
- Delete - Confirmation dialog

### Portfolio/AddHoldingForm

**File**: `src/client/components/Portfolio/AddHoldingForm.tsx`

**Props**:
```typescript
interface AddHoldingFormProps {
  accountId: number;
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Fields**: Symbol (autocomplete), Shares, Price, Fees, Date

### Portfolio/SellForm

**File**: `src/client/components/Portfolio/SellForm.tsx`

**Props**:
```typescript
interface SellFormProps {
  symbol: string;
  maxShares: number;
  currentPrice: number;
  accountId: number;
  onSuccess: () => void;
  onCancel: () => void;
}
```

### Dividends/DividendForm

**File**: `src/client/components/Dividends/DividendForm.tsx`

**Props**:
```typescript
interface DividendFormProps {
  accountId: number;
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Fields**: Symbol, Amount per Share, Shares Held (optional), Ex-Date, Pay Date

**Note**: Shows info banner about 8% Albanian tax

### Dividends/TaxSummary

**File**: `src/client/components/Dividends/TaxSummary.tsx`

**Props**:
```typescript
interface TaxSummaryCardProps {
  taxSummary: TaxSummary | null;
  onUpdate: () => void;
}
```

**Features**:
- Current year highlight
- Editable tax rate
- Yearly breakdown: Gross, Tax, Net, Count

---

## API Client

**File**: `src/client/lib/api.ts`

### Key Types

```typescript
type AccountType = 'stock' | 'bank' | 'cash';
type Currency = 'EUR' | 'USD' | 'ALL';

interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: Currency;
  initial_balance: number;
  created_at: string;
  balance?: number;
  costBasis?: number;  // For stock accounts
}

interface HoldingWithQuote {
  id: number;
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  gain: number;
  gainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  name: string;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: HoldingWithQuote[];
}

interface DashboardData {
  mainCurrency: Currency;
  totalNetWorth: number;
  byType: { bank, cash, stock: { count, total } };
  stockPortfolio: {
    totalValue: number;
    totalCost: number;
    totalGain: number;
    totalGainPercent: number;
    dayChange: number;
    dayChangePercent: number;
    holdingsCount: number;
  };
  accounts: AccountSummary[];
  dueRecurring: DueRecurring[];
  recentTransactions: RecentTransaction[];
  exchangeRates: Record<Currency, number>;
}
```

### API Functions

```typescript
// Accounts
accountsApi.getAll(): Promise<Account[]>
accountsApi.get(id): Promise<Account>
accountsApi.getPortfolio(id): Promise<PortfolioSummary>  // Live prices
accountsApi.create({ name, type, currency, initialBalance }): Promise<Account>
accountsApi.update(id, data): Promise<Account>
accountsApi.delete(id): Promise<void>

// Account Transactions (bank/cash)
accountTransactionsApi.getByAccount(accountId): Promise<AccountTransaction[]>
accountTransactionsApi.create(accountId, { type, amount, date, payee?, category?, notes? }): Promise<AccountTransaction>
accountTransactionsApi.update(accountId, txId, { type?, amount?, date?, payee?, category?, notes? }): Promise<AccountTransaction>
accountTransactionsApi.delete(accountId, txId): Promise<void>

// Recurring Transactions
recurringApi.getByAccount(accountId): Promise<RecurringTransaction[]>
recurringApi.getDue(): Promise<RecurringTransaction[]>
recurringApi.create(accountId, { type, amount, payee?, category?, notes?, frequency, nextDueDate }): Promise<RecurringTransaction>
recurringApi.update(id, { type?, amount?, payee?, category?, notes?, frequency?, nextDueDate?, isActive? }): Promise<RecurringTransaction>
recurringApi.delete(id): Promise<void>
recurringApi.apply(id, date?): Promise<{ transaction, recurring, message }>

// Holdings (per-account)
holdingsApi.getAll(): Promise<Holding[]>
holdingsApi.getByAccount(accountId): Promise<Holding[]>
holdingsApi.create({ symbol, shares, price, fees?, date?, accountId }): Promise<Holding>
holdingsApi.sell(symbol, { shares, price, fees?, date?, accountId }): Promise<...>
holdingsApi.delete(id): Promise<void>

// Dividends (per-account)
dividendsApi.getAll(): Promise<Dividend[]>
dividendsApi.getByAccount(accountId): Promise<Dividend[]>
dividendsApi.create({ symbol, amountPerShare, sharesHeld?, exDate, payDate?, accountId }): Promise<Dividend>
dividendsApi.delete(id): Promise<void>
dividendsApi.getTaxSummary(year?, accountId?): Promise<TaxSummary>
dividendsApi.setTaxRate(rate): Promise<...>

// Dashboard
dashboardApi.get(): Promise<DashboardData>
dashboardApi.getSettings(): Promise<{ mainCurrency, exchangeRates }>
dashboardApi.setMainCurrency(currency): Promise<...>
dashboardApi.setSidebarCollapsed(collapsed): Promise<...>

// Quotes
quotesApi.get(symbol): Promise<Quote>
quotesApi.search(query): Promise<SearchResult[]>
quotesApi.getHistory(symbol, period?, interval?): Promise<HistoricalPrice[]>
```

---

## Styling

### Tailwind Configuration

```javascript
export default {
  content: [
    "./src/client/**/*.{js,ts,jsx,tsx}",
    "./src/client/index.html",
  ],
  theme: {
    extend: {},
  },
};
```

### Common Patterns

**Card**:
```tsx
<div className="bg-white rounded-lg shadow p-6">
```

**Sortable Table Header**:
```tsx
<th
  className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
  onClick={() => handleSort('column')}
>
  Column Name <SortIcon column="column" />
</th>
```

**Positive/Negative Values**:
```tsx
<span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
```

**Button (Primary)**:
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
```

**Button (Secondary)**:
```tsx
<button className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
```

**Input**:
```tsx
<input className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
```

---

## Key Features

### Auto-Refresh for Stock Accounts

The AccountPage for stock accounts implements auto-refresh:

```typescript
// Refresh every 60 seconds
useEffect(() => {
  const interval = setInterval(loadAccount, 60000);
  return () => clearInterval(interval);
}, []);

// Pause when tab is hidden
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      loadAccount();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

### Sortable Holdings Table

HoldingsList implements sortable columns:

```typescript
const [sortColumn, setSortColumn] = useState<SortColumn>('symbol');
const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

const sortedHoldings = useMemo(() => {
  return [...holdings].sort((a, b) => {
    // Compare values based on sortColumn
    // Return positive/negative based on sortDirection
  });
}, [holdings, sortColumn, sortDirection]);

const handleSort = (column: SortColumn) => {
  if (sortColumn === column) {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  } else {
    setSortColumn(column);
    setSortDirection('asc');
  }
};
```

### Sidebar Cost Basis Display

For stock accounts, the sidebar shows cost basis (not live market value):

```tsx
{account.type === 'stock'
  ? `$${(account.costBasis || 0).toLocaleString(...)}`
  : formatCurrency(account.balance || 0, account.currency)}
```

This avoids API calls when loading the sidebar, making navigation fast.

### Sidebar Auto-Refresh

The sidebar automatically refreshes its account list when:
1. **Route changes** - navigating to a different page
2. **Custom event** - when `accounts-changed` event is dispatched

Components that modify account data dispatch the event to trigger refresh:

```typescript
// After editing account, adding/editing/deleting transactions, applying recurring
window.dispatchEvent(new Event('accounts-changed'));
```

### Edit Transactions and Recurring

AccountPage supports inline editing for bank/cash accounts:

**Transaction Edit Flow**:
1. Click "Edit" button on transaction row
2. Modal opens pre-populated with current values
3. Modify fields (type, amount, date, payee, category, notes)
4. Save triggers API update and sidebar refresh

**Recurring Edit Flow**:
1. Click "Edit" button on recurring transaction row
2. Modal opens pre-populated with current values
3. Modify fields (type, amount, payee, category, frequency, next due date)
4. Save triggers API update

**Note**: Transfer transactions cannot be edited (show "Transfer" label instead of Edit button).

---

## Vite Configuration

**File**: `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
});
```

---

## Adding New Features

### Add a new page

1. Create component in `src/client/pages/NewPage.tsx`
2. Add route in `App.tsx`
3. Add link in Sidebar if needed

### Add API integration

1. Add types to `lib/api.ts`
2. Add API function to appropriate object
3. Use in component with loading/error handling

### Add form with autocomplete

1. Create autocomplete component (see PayeeAutocomplete pattern)
2. Use `findOrCreate` API pattern for new entries
3. Handle selection and creation in parent component
