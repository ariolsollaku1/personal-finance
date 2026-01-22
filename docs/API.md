# API Documentation

Base URL: `http://localhost:3000/api`

All endpoints return JSON. Errors return `{ error: string }` with appropriate HTTP status codes.

---

## Accounts

### GET /api/accounts

List all accounts with calculated balances.

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "My Portfolio",
    "type": "stock",
    "currency": "USD",
    "initial_balance": 0,
    "created_at": "2024-01-01T00:00:00.000Z",
    "balance": 15234.50,
    "costBasis": 12000.00
  },
  {
    "id": 2,
    "name": "Checking",
    "type": "bank",
    "currency": "EUR",
    "initial_balance": 1000,
    "created_at": "2024-01-01T00:00:00.000Z",
    "balance": 2500.00
  }
]
```

**Notes:**
- For stock accounts: `balance` is cash balance (deposits - withdrawals - buy costs + sell proceeds), `costBasis` is sum of shares × avgCost
- For bank/cash accounts: `balance` = initial_balance + inflows - outflows
- No live API calls - fast sidebar loading

### POST /api/accounts

Create a new account.

**Request Body:**
```json
{
  "name": "Investment Account",
  "type": "stock",
  "currency": "USD",
  "initialBalance": 0
}
```

- `type`: `"stock"`, `"bank"`, or `"cash"`
- `currency`: `"EUR"`, `"USD"`, or `"ALL"`
- `initialBalance`: Optional, defaults to 0

**Response 201:**
```json
{
  "id": 3,
  "name": "Investment Account",
  "type": "stock",
  "currency": "USD",
  "initial_balance": 0,
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/accounts/:id

Get single account with balance.

**Response 200:**
```json
{
  "id": 1,
  "name": "My Portfolio",
  "type": "stock",
  "currency": "USD",
  "initial_balance": 0,
  "created_at": "2024-01-01T00:00:00.000Z",
  "balance": 15234.50,
  "costBasis": 12000.00
}
```

### PUT /api/accounts/:id

Update account name, currency, or initial balance.

**Request Body:**
```json
{
  "name": "Updated Name",
  "currency": "EUR",
  "initialBalance": 500
}
```

### DELETE /api/accounts/:id

Delete account and all associated data (holdings, dividends, transactions).

**Response 200:**
```json
{ "success": true }
```

### GET /api/accounts/:id/portfolio

Get stock account portfolio with **live prices** and cash balance.

**Response 200:**
```json
{
  "cashBalance": 5000.00,
  "totalValue": 15234.50,
  "totalCost": 12000.00,
  "totalGain": 3234.50,
  "totalGainPercent": 26.95,
  "dayChange": 125.30,
  "dayChangePercent": 0.83,
  "holdings": [
    {
      "id": 1,
      "symbol": "AAPL",
      "shares": 10,
      "avgCost": 150.00,
      "currentPrice": 185.50,
      "marketValue": 1855.00,
      "costBasis": 1500.00,
      "gain": 355.00,
      "gainPercent": 23.67,
      "dayChange": 12.50,
      "dayChangePercent": 0.68,
      "name": "Apple Inc."
    }
  ]
}
```

**Notes:**
- Only for stock accounts (returns 400 for bank/cash)
- Fetches live prices from Yahoo Finance
- `cashBalance`: Available cash (deposits - withdrawals - buy costs + sell proceeds)
- `totalValue`: Total market value of holdings (does not include cash)
- Total account value = `cashBalance` + `totalValue`
- Used by AccountPage for displaying stock holdings

---

## Holdings (Stock Accounts)

### GET /api/holdings

List all holdings across all accounts.

### GET /api/holdings/account/:accountId

List holdings for a specific stock account.

**Response 200:**
```json
[
  {
    "id": 1,
    "account_id": 1,
    "symbol": "AAPL",
    "shares": 10.5,
    "avg_cost": 150.25,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

### POST /api/holdings

Add new holding (buy shares).

**Request Body:**
```json
{
  "symbol": "AAPL",
  "shares": 10,
  "price": 150.00,
  "fees": 4.95,
  "date": "2024-01-15",
  "accountId": 1
}
```

- `accountId`: **Required** - stock account to add to
- Validates symbol against Yahoo Finance
- If symbol exists in account: updates with weighted average cost
- Always creates a 'buy' transaction
- **Automatically creates an account_transaction** (outflow) for the total cost (shares × price + fees) to deduct from cash balance

**Response 201:**
```json
{
  "id": 1,
  "account_id": 1,
  "symbol": "AAPL",
  "shares": 10,
  "avg_cost": 150.495
}
```

### POST /api/holdings/:symbol/sell

Sell shares from a holding.

**Request Body:**
```json
{
  "shares": 5,
  "price": 175.00,
  "fees": 4.95,
  "date": "2024-01-20",
  "accountId": 1
}
```

- `accountId`: **Required** - must match the account owning the holding
- Cannot sell more shares than owned
- If all shares sold: holding is deleted
- **Automatically creates an account_transaction** (inflow) for the proceeds (shares × price - fees) to add to cash balance

**Response 200:**
```json
{
  "success": true,
  "holding": {
    "id": 1,
    "symbol": "AAPL",
    "shares": 5.5,
    "avg_cost": 150.495
  }
}
```

### DELETE /api/holdings/:id

Delete a holding entirely.

---

## Dividends

### GET /api/dividends

List all dividends across all accounts.

**Query Parameters:**
- `symbol` (optional): Filter by symbol
- `year` (optional): Filter by year

### GET /api/dividends/account/:accountId

List dividends for a specific stock account.

### POST /api/dividends

Record a dividend payment.

**Request Body:**
```json
{
  "symbol": "AAPL",
  "amountPerShare": 0.24,
  "sharesHeld": 100,
  "exDate": "2024-02-09",
  "payDate": "2024-02-15",
  "accountId": 1
}
```

- `accountId`: **Required** - stock account receiving dividend
- `sharesHeld`: Optional - auto-detects from current holdings if omitted

**Tax Calculation (Albanian 8%):**
```
grossAmount = amountPerShare × sharesHeld
taxAmount = grossAmount × 0.08
netAmount = grossAmount - taxAmount
```

**Response 201:**
```json
{
  "id": 1,
  "account_id": 1,
  "symbol": "AAPL",
  "amount": 24.00,
  "shares_held": 100,
  "ex_date": "2024-02-09",
  "pay_date": "2024-02-15",
  "tax_rate": 0.08,
  "tax_amount": 1.92,
  "net_amount": 22.08
}
```

### DELETE /api/dividends/:id

Delete a dividend record.

### GET /api/dividends/tax

Get tax summary by year.

**Query Parameters:**
- `year` (optional): Specific year
- `accountId` (optional): Filter by stock account

**Response 200:**
```json
{
  "currentTaxRate": 0.08,
  "summary": [
    {
      "year": "2024",
      "total_gross": 524.00,
      "total_tax": 41.92,
      "total_net": 482.08,
      "dividend_count": 12
    }
  ]
}
```

### PUT /api/dividends/tax-rate

Update the dividend tax rate.

**Request Body:**
```json
{ "rate": 0.08 }
```

---

## Dashboard

### GET /api/dashboard

Get aggregated dashboard data with stock portfolio overview.

**Response 200:**
```json
{
  "mainCurrency": "ALL",
  "totalNetWorth": 1500000.00,
  "byType": {
    "bank": { "count": 1, "total": 250000.00 },
    "cash": { "count": 1, "total": 50000.00 },
    "stock": { "count": 2, "total": 1200000.00 }
  },
  "stockPortfolio": {
    "totalValue": 15234.50,
    "totalCost": 12000.00,
    "totalGain": 3234.50,
    "totalGainPercent": 26.95,
    "dayChange": 125.30,
    "dayChangePercent": 0.83,
    "holdingsCount": 5
  },
  "accounts": [
    {
      "id": 1,
      "name": "My Portfolio",
      "type": "stock",
      "currency": "USD",
      "balance": 15234.50,
      "balanceInMainCurrency": 1200000.00
    }
  ],
  "dueRecurring": [...],
  "recentTransactions": [...],
  "exchangeRates": {
    "ALL": 1,
    "EUR": 102.5,
    "USD": 95.0
  }
}
```

**Notes:**
- `stockPortfolio` aggregates ALL stock accounts with live prices
- `byType.stock.total` is live market value converted to main currency
- `dueRecurring` shows recurring transactions due today or earlier
- `recentTransactions` shows last 10 transactions (bank/cash only)

---

## Account Transactions (All Account Types)

### GET /api/accounts/:accountId/transactions

List transactions for any account (newest first).

**Supported for**: Bank, Cash, and Stock accounts

**Stock Account Notes:**
- Deposits/withdrawals for stock accounts track cash balance
- Buy/sell operations automatically create transactions (marked with notes like "Buy 10 AAPL @ 150.00")
- Stock trade transactions should not be edited/deleted manually

**Response 200:**
```json
[
  {
    "id": 1,
    "account_id": 2,
    "type": "outflow",
    "amount": 50.00,
    "date": "2024-01-15",
    "payee_id": 1,
    "category_id": 3,
    "notes": "Groceries",
    "transfer_id": null,
    "payee_name": "Supermarket",
    "category_name": "Food",
    "balance": 2450.00
  }
]
```

### POST /api/accounts/:accountId/transactions

Create a transaction.

**Request Body:**
```json
{
  "type": "outflow",
  "amount": 50.00,
  "date": "2024-01-15",
  "payee": "Supermarket",
  "category": "Food",
  "notes": "Weekly groceries"
}
```

- `type`: `"inflow"` or `"outflow"`
- `payee`: Name (auto-creates if new)
- `category`: Name (auto-creates if new)

### PUT /api/accounts/:accountId/transactions/:txId

Update a transaction.

**Request Body:**
```json
{
  "type": "outflow",
  "amount": 55.00,
  "date": "2024-01-16",
  "payee": "Grocery Store",
  "category": "Food",
  "notes": "Updated notes"
}
```

- All fields optional - only updates provided fields
- Cannot edit transfer transactions (returns 400)

### DELETE /api/accounts/:accountId/transactions/:txId

Delete a transaction.

---

## Recurring Transactions

### GET /api/accounts/:accountId/recurring

List recurring transactions for an account.

### POST /api/accounts/:accountId/recurring

Create a recurring transaction.

**Request Body:**
```json
{
  "type": "outflow",
  "amount": 100.00,
  "payee": "Electric Company",
  "category": "Utilities",
  "notes": "Monthly bill",
  "frequency": "monthly",
  "nextDueDate": "2024-02-01"
}
```

- `frequency`: `"weekly"`, `"biweekly"`, `"monthly"`, `"yearly"`

### PUT /api/recurring/:id

Update a recurring transaction.

**Request Body:**
```json
{
  "type": "outflow",
  "amount": 120.00,
  "payee": "Electric Company",
  "category": "Utilities",
  "notes": "Updated bill amount",
  "frequency": "monthly",
  "nextDueDate": "2024-03-01",
  "isActive": true
}
```

- All fields optional - only updates provided fields

### POST /api/recurring/:id/apply

Apply a recurring transaction (creates real transaction, advances due date).

### DELETE /api/recurring/:id

Delete a recurring transaction.

---

## Transfers

### GET /api/transfers

List all transfers.

### POST /api/transfers

Create a transfer between accounts.

**Request Body:**
```json
{
  "fromAccountId": 1,
  "toAccountId": 2,
  "fromAmount": 100.00,
  "toAmount": 95.00,
  "date": "2024-01-15",
  "notes": "Monthly savings"
}
```

- Different amounts support cross-currency transfers
- Creates linked transactions in both accounts

### DELETE /api/transfers/:id

Delete a transfer (removes transactions from both accounts).

---

## Categories

### GET /api/categories

List all categories.

**Response 200:**
```json
[
  { "id": 1, "name": "Salary", "type": "income" },
  { "id": 2, "name": "Groceries", "type": "expense" }
]
```

### POST /api/categories

Create a category.

**Request Body:**
```json
{ "name": "Entertainment", "type": "expense" }
```

### PUT /api/categories/:id

Rename a category.

### DELETE /api/categories/:id

Delete a category.

---

## Payees

### GET /api/payees

List all payees.

### GET /api/payees/search?q=

Search payees by name.

### POST /api/payees

Create a payee.

### PUT /api/payees/:id

Rename a payee.

### DELETE /api/payees/:id

Delete a payee.

### POST /api/payees/merge

Merge duplicate payees.

**Request Body:**
```json
{
  "keepId": 1,
  "mergeIds": [2, 3]
}
```

---

## Quotes (Yahoo Finance)

### GET /api/quotes/search?q=

Search stocks by name or symbol.

**Response 200:**
```json
[
  {
    "symbol": "AAPL",
    "shortname": "Apple Inc.",
    "exchange": "NASDAQ",
    "quoteType": "EQUITY"
  }
]
```

### GET /api/quotes/:symbol

Get current quote.

**Response 200:**
```json
{
  "symbol": "AAPL",
  "shortName": "Apple Inc.",
  "regularMarketPrice": 185.50,
  "regularMarketChange": 2.35,
  "regularMarketChangePercent": 1.28,
  "regularMarketPreviousClose": 183.15,
  "currency": "USD"
}
```

### GET /api/quotes/:symbol/history

Get historical prices.

**Query Parameters:**
- `period`: `1w`, `1m`, `3m`, `6m`, `1y` (default), `5y`
- `interval`: `1d` (default), `1wk`, `1mo`

---

## Settings

### GET /api/dashboard/settings/currency

Get main currency setting.

### PUT /api/dashboard/settings/currency

Set main currency.

**Request Body:**
```json
{ "currency": "ALL" }
```

### GET /api/dashboard/settings/sidebar

Get sidebar collapsed state.

### PUT /api/dashboard/settings/sidebar

Set sidebar collapsed state.

**Request Body:**
```json
{ "collapsed": true }
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message describing what went wrong"
}
```

**Common Status Codes:**
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Server Error (database or Yahoo Finance issues)
