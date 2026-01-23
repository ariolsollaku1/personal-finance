# Frontend Documentation

## Overview

- **Framework**: React 18 with TypeScript
- **Bundler**: Vite 5
- **Styling**: Tailwind CSS 3
- **Routing**: React Router DOM 6
- **Charts**: Recharts 2
- **Authentication**: Supabase Auth
- **Entry Point**: `src/client/main.tsx`

---

## Application Structure

```
src/client/
├── index.html          # HTML template
├── main.tsx            # React entry point (with AuthProvider)
├── App.tsx             # Router configuration (public + protected routes)
├── index.css           # Tailwind imports + global styles
│
├── contexts/
│   └── AuthContext.tsx # Authentication state and methods
│
├── pages/              # Route-level components
│   ├── LoginPage.tsx   # /login - Email/password + Google OAuth
│   ├── SignupPage.tsx  # /signup - User registration
│   ├── AuthCallbackPage.tsx # /auth/callback - OAuth redirect handler
│   ├── Dashboard.tsx   # / - Net worth, stock portfolio overview
│   ├── AccountPage.tsx # /accounts/:id - Account detail (all types)
│   ├── AddAccountPage.tsx # /accounts/new
│   ├── Dividends.tsx   # /dividends - All dividends view
│   ├── TransfersPage.tsx # /transfers
│   ├── ProjectionPage.tsx # /projection - Financial projections
│   ├── PnLPage.tsx     # /pnl - Monthly profit & loss
│   └── settings/
│       ├── CategoriesPage.tsx
│       ├── PayeesPage.tsx
│       └── CurrencyPage.tsx
│
├── components/         # Reusable components
│   ├── ProtectedRoute.tsx # Auth guard for protected routes
│   ├── Layout/
│   │   ├── Sidebar.tsx         # Collapsible sidebar with user info + logout
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
    ├── api.ts              # API client with auth token injection
    ├── supabase.ts         # Supabase client for frontend
    └── currency.ts         # Currency formatting utilities
```

---

## Authentication

### Overview

The app uses Supabase for authentication with support for:
- Email/password authentication
- Google OAuth (one-click login)
- Automatic token refresh
- Protected routes

### AuthContext

**File**: `src/client/contexts/AuthContext.tsx`

Provides authentication state and methods throughout the app.

```typescript
interface AuthContextType {
  user: User | null;          // Current Supabase user
  session: Session | null;    // Current session with tokens
  loading: boolean;           // True while checking auth state
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  initializeUser: () => Promise<void>;  // Seeds default data for new users
}

// Usage in components
const { user, signOut, loading } = useAuth();
```

### ProtectedRoute

**File**: `src/client/components/ProtectedRoute.tsx`

Wraps routes that require authentication. Redirects to `/login` if not authenticated.

```tsx
<Route
  path="/*"
  element={
    <ProtectedRoute>
      <SidebarLayout>
        <Routes>
          {/* Protected routes */}
        </Routes>
      </SidebarLayout>
    </ProtectedRoute>
  }
/>
```

### Auth Pages

| Page | File | Description |
|------|------|-------------|
| LoginPage | `pages/LoginPage.tsx` | Email/password form + Google OAuth button |
| SignupPage | `pages/SignupPage.tsx` | Registration form with email confirmation |
| AuthCallbackPage | `pages/AuthCallbackPage.tsx` | Handles OAuth redirects from Google |

### API Client Authentication

**File**: `src/client/lib/api.ts`

All API requests automatically include the JWT token:

```typescript
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = '/login';
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    ...options,
  });

  // Handle 401 - redirect to login
  if (response.status === 401) {
    window.location.href = '/login';
  }
  // ...
}
```

---

## Routing

```tsx
// App.tsx
<Routes>
  {/* Public routes - no authentication required */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />
  <Route path="/auth/callback" element={<AuthCallbackPage />} />

  {/* Protected routes - require authentication */}
  <Route
    path="/*"
    element={
      <ProtectedRoute>
        <SidebarLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts/new" element={<AddAccountPage />} />
            <Route path="/accounts/:id" element={<AccountPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/projection" element={<ProjectionPage />} />
            <Route path="/pnl" element={<PnLPage />} />
            <Route path="/settings/categories" element={<CategoriesPage />} />
            <Route path="/settings/payees" element={<PayeesPage />} />
            <Route path="/settings/currency" element={<CurrencyPage />} />
          </Routes>
        </SidebarLayout>
      </ProtectedRoute>
    }
  />
</Routes>
```

Protected routes are wrapped in `<ProtectedRoute>` which redirects to `/login` if not authenticated, then `<SidebarLayout>` which provides the collapsible sidebar navigation with user info and logout.

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

### ProjectionPage (`/projection`)

**File**: `src/client/pages/ProjectionPage.tsx`

**Features**:
- Financial projections based on recurring transactions
- YTD chart showing actual performance
- 12-month forward projection chart
- Multiple visualization components using Recharts

**Charts & Metrics**:
- **Net Worth Projection**: Area chart showing liquid assets, debt, and net worth over time
- **Monthly Cash Flow**: Bar chart showing income vs expenses by month
- **Cash Flow Summary**: Comparison of monthly income, expenses, and net
- **Financial Health Indicators**: Three gauges:
  - Savings Rate (target: 20%+)
  - Debt-to-Income ratio (target: <36%)
  - Emergency Fund (months of runway)
- **Income Breakdown**: Table showing income sources with monthly and annual amounts
- **Expense Breakdown**: Table showing expense categories with monthly and annual amounts

**Data Source**:
- Current account balances (bank, cash, stock, loan, credit, asset)
- Recurring transactions with frequency multipliers:
  - Weekly: 4.33x
  - Biweekly: 2.17x
  - Monthly: 1x
  - Yearly: 1/12x
- Exchange rates for multi-currency conversion

### PnLPage (`/pnl`)

**File**: `src/client/pages/PnLPage.tsx`

**Features**:
- Monthly profit & loss view starting from Jan 2026
- Grid layout (4 cards per row)
- Click-to-expand detail modal

**Components**:

**MonthCard**:
- Displays month label
- Transaction count
- Income total (green)
- Expenses total (red)
- Net total (color-coded positive/negative)
- Click to view details

**MonthDetailModal**:
- Summary cards: Income, Expenses, Net
- Full transaction list sorted by date
- Columns: Date, Payee, Category, Account, Amount
- Multi-currency display (shows both original and converted amounts)
- Excludes transfer transactions to avoid double-counting

**API Integration**:
```typescript
// Get all monthly summaries
pnlApi.getSummary(): Promise<PnLSummary>

// Get transactions for a specific month
pnlApi.getMonth(month: string): Promise<PnLMonthDetail>
// month format: "YYYY-MM" (e.g., "2026-01")
```

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
- **User info and logout**: Shows user email and logout button at bottom
- **Auto-refresh**: Reloads on route change and listens for `accounts-changed` events

**Account Display**:
- Expanded: Account name + balance/cost basis
- Collapsed: Icon only with tooltip

**User Section** (at bottom of sidebar):
```tsx
const { user, signOut } = useAuth();
// ...
<div className="border-t border-gray-200 p-4">
  <span>{user?.email}</span>
  <button onClick={signOut}>Sign out</button>
</div>
```

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
type AccountType = 'stock' | 'bank' | 'cash' | 'loan' | 'credit' | 'asset';
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
  byType: { bank, cash, stock, loan, credit, asset: { count, total } };
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

// Projection types
interface ProjectionMonth {
  month: string;           // "YYYY-MM"
  label: string;           // "Jan 2026"
  liquidAssets: number;    // bank + cash + stock
  debt: number;            // loan + credit (negative)
  netWorth: number;
  income: number;
  expenses: number;
  net: number;
}

interface ProjectionData {
  mainCurrency: Currency;
  currentBalances: {
    bank: number;
    cash: number;
    stock: number;
    loan: number;
    credit: number;
    asset: number;
    liquidAssets: number;
    debt: number;
    netWorth: number;
  };
  monthlyRecurring: {
    income: number;
    expenses: number;
    net: number;
  };
  incomeBreakdown: Array<{ payee: string; category: string; monthlyAmount: number; annualAmount: number }>;
  expenseBreakdown: Array<{ payee: string; category: string; monthlyAmount: number; annualAmount: number }>;
  ytdMonths: ProjectionMonth[];
  projectionMonths: ProjectionMonth[];
}

// P&L types
interface MonthlyPnL {
  month: string;           // "YYYY-MM"
  label: string;           // "January 2026"
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

interface PnLTransaction {
  id: number;
  date: string;
  type: 'inflow' | 'outflow';
  amount: number;
  amountInMainCurrency: number;
  payee: string | null;
  category: string | null;
  accountName: string;
  accountCurrency: Currency;
}

interface PnLMonthDetail {
  month: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  transactions: PnLTransaction[];
}

interface PnLSummary {
  mainCurrency: Currency;
  months: MonthlyPnL[];
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

// Projection
projectionApi.get(): Promise<ProjectionData>

// P&L (Profit & Loss)
pnlApi.getSummary(): Promise<PnLSummary>
pnlApi.getMonth(month: string): Promise<PnLMonthDetail>  // month: "YYYY-MM"
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
