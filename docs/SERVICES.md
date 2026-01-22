# Backend Services Documentation

## Overview

The backend has two main services:

| Service | File | Purpose |
|---------|------|---------|
| Yahoo Finance | `src/server/services/yahoo.ts` | Stock quotes, search, historical data |
| Tax | `src/server/services/tax.ts` | Albanian dividend tax calculations |

---

## Yahoo Finance Service

**File**: `src/server/services/yahoo.ts`

**Library**: `yahoo-finance2` npm package

**Note**: Using v2 which is deprecated. Consider migrating to v3.

### Functions

#### getQuote(symbol: string): Promise<Quote | null>

Fetches current market data for a single symbol.

```typescript
const quote = await getQuote('AAPL');
// Returns:
{
  symbol: 'AAPL',
  shortName: 'Apple Inc.',
  longName: 'Apple Inc.',
  regularMarketPrice: 185.50,
  regularMarketChange: 2.35,
  regularMarketChangePercent: 1.28,
  regularMarketPreviousClose: 183.15,
  regularMarketOpen: 183.50,
  regularMarketDayHigh: 186.00,
  regularMarketDayLow: 183.00,
  regularMarketVolume: 45678900,
  marketCap: 2890000000000,
  fiftyTwoWeekHigh: 199.62,
  fiftyTwoWeekLow: 164.08,
  currency: 'USD'
}
```

**Error Handling**: Returns `null` if symbol not found or API error.

#### getMultipleQuotes(symbols: string[]): Promise<Map<string, Quote>>

Fetches quotes for multiple symbols in parallel.

```typescript
const quotes = await getMultipleQuotes(['AAPL', 'GOOGL', 'MSFT']);
const appleQuote = quotes.get('AAPL');
```

**Used By**: `/api/portfolio` endpoint to get live prices for all holdings.

#### getHistoricalPrices(symbol, period1, period2?, interval?): Promise<HistoricalPrice[]>

Fetches historical OHLCV data for charts.

```typescript
const history = await getHistoricalPrices(
  'AAPL',
  new Date('2023-01-01'),  // Start date
  new Date(),              // End date (optional, defaults to now)
  '1d'                     // Interval: '1d', '1wk', or '1mo'
);

// Returns array of:
{
  date: Date,
  open: 185.00,
  high: 186.50,
  low: 184.00,
  close: 185.50,
  volume: 45678900,
  adjClose: 185.50  // Adjusted for splits/dividends
}
```

#### searchStocks(query: string): Promise<SearchResult[]>

Search for stocks by name or symbol.

```typescript
const results = await searchStocks('apple');
// Returns:
[
  {
    symbol: 'AAPL',
    shortname: 'Apple Inc.',
    longname: 'Apple Inc.',
    exchange: 'NASDAQ',
    quoteType: 'EQUITY'
  },
  {
    symbol: 'APLE',
    shortname: 'Apple Hospitality REIT',
    exchange: 'NYSE',
    quoteType: 'EQUITY'
  }
]
```

**Filters**: Only returns EQUITY and ETF types (no bonds, options, etc.)
**Limit**: Returns max 10 results

#### getDividendHistory(symbol: string): Promise<DividendHistory[]>

Fetches historical dividend payments (last 5 years).

```typescript
const dividends = await getDividendHistory('AAPL');
// Returns:
[
  { date: Date, dividends: 0.24 },
  { date: Date, dividends: 0.24 },
  // ...
]
```

**Note**: Currently not exposed via API, available for future features.

### TypeScript Types

```typescript
interface Quote {
  symbol: string;
  shortName: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketPreviousClose: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currency?: string;
}

interface HistoricalPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

interface SearchResult {
  symbol: string;
  shortname: string;
  longname?: string;
  exchange: string;
  quoteType: string;
}
```

### API Limitations

- **Rate Limits**: Yahoo Finance may throttle requests
- **Data Delay**: Quotes may be delayed 15+ minutes for some exchanges
- **Market Hours**: Real-time only during market hours
- **Coverage**: Primarily US markets, limited international support

---

## Tax Service

**File**: `src/server/services/tax.ts`

Handles Albanian dividend tax calculations.

### Albanian Dividend Tax

- **Rate**: 8% flat tax (as of 2024)
- **Stored In**: `settings` table, key `dividend_tax_rate`
- **Default**: 0.08 (8%)

### Functions

#### calculateDividendTax(dividendPerShare, sharesHeld, taxRate?): DividendTaxCalculation

Calculates tax for a dividend payment.

```typescript
const result = calculateDividendTax(0.24, 100);
// dividendPerShare = $0.24
// sharesHeld = 100 shares
// taxRate = 0.08 (default from settings)

// Returns:
{
  grossAmount: 24.00,    // 0.24 * 100
  taxRate: 0.08,
  taxAmount: 1.92,       // 24.00 * 0.08
  netAmount: 22.08       // 24.00 - 1.92
}
```

**Optional taxRate**: If not provided, reads from database settings.

#### calculateAnnualTax(dividends: DividendTaxCalculation[]): AnnualTaxSummary

Aggregates tax calculations for multiple dividends.

```typescript
const annual = calculateAnnualTax([
  { grossAmount: 24.00, taxRate: 0.08, taxAmount: 1.92, netAmount: 22.08 },
  { grossAmount: 50.00, taxRate: 0.08, taxAmount: 4.00, netAmount: 46.00 },
]);

// Returns:
{
  totalGross: 74.00,
  totalTax: 5.92,
  totalNet: 68.08,
  effectiveRate: 0.08   // totalTax / totalGross
}
```

#### getCurrentTaxRate(): number

Gets the current tax rate from database.

```typescript
const rate = getCurrentTaxRate();
// Returns: 0.08
```

#### setTaxRate(rate: number): void

Updates the tax rate in database.

```typescript
setTaxRate(0.10);  // Change to 10%
```

**Validation**: Rate must be between 0 and 1.

### TypeScript Types

```typescript
interface DividendTaxCalculation {
  grossAmount: number;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
}

interface AnnualTaxSummary {
  totalGross: number;
  totalTax: number;
  totalNet: number;
  effectiveRate: number;
}
```

### Tax Calculation Logic

```
Gross Amount = Dividend Per Share × Shares Held
Tax Amount = Gross Amount × Tax Rate
Net Amount = Gross Amount - Tax Amount
```

**Rounding**: All amounts rounded to 2 decimal places.

### Integration with Dividends Route

When creating a dividend (`POST /api/dividends`):

1. Get current tax rate from settings
2. Calculate tax using `calculateDividendTax()`
3. Store gross, tax_rate, tax_amount, net_amount in database

```typescript
// routes/dividends.ts
const taxCalc = calculateDividendTax(amountPerShare, shares);
dividendQueries.create(
  symbol,
  taxCalc.grossAmount,
  shares,
  exDate,
  payDate,
  taxCalc.taxRate,
  taxCalc.taxAmount,
  taxCalc.netAmount
);
```

---

## Error Handling

Both services use try-catch with console logging:

```typescript
try {
  const result = await yahooFinance.quote(symbol);
  // process result
} catch (error) {
  console.error(`Error fetching quote for ${symbol}:`, error);
  return null;  // Return null/empty instead of throwing
}
```

**Pattern**: Services return `null` or empty arrays on error. Routes check for this and return appropriate HTTP status codes.

---

## Future Improvements

### Yahoo Finance
- Migrate to yahoo-finance2 v3
- Add caching layer (Redis or in-memory)
- Add rate limiting
- Support more international exchanges
- Add real-time WebSocket quotes

### Tax Service
- Support multiple tax jurisdictions
- Add tax treaty calculations (US-Albania 15% withholding)
- Support different tax rates per symbol (REITs vs regular dividends)
- Generate tax reports (PDF export)
- Add dividend reinvestment (DRIP) tracking
