import { Currency, settingsQueries } from '../db/queries.js';

/**
 * Exchange Rate Service
 *
 * Fetches exchange rates from frankfurter.app API and caches them for 24 hours.
 * Uses EUR as the base currency. Falls back to hardcoded rates if API fails.
 */

// Exchange rates type - allows indexing by Currency
export type ExchangeRates = {
  [K in Currency]: number;
};

// Fallback rates (EUR as base) - used if API fails
// Approximate rates as of 2024
const FALLBACK_RATES: ExchangeRates = {
  EUR: 1,
  USD: 1.08,   // 1 EUR = 1.08 USD
  ALL: 100.0,  // 1 EUR = 100 ALL (Albanian Lek)
  GBP: 0.86,   // 1 EUR = 0.86 GBP (British Pound)
  CHF: 0.94,   // 1 EUR = 0.94 CHF (Swiss Franc)
  NOK: 11.5,   // 1 EUR = 11.5 NOK (Norwegian Krone)
  SEK: 11.2,   // 1 EUR = 11.2 SEK (Swedish Krona)
  DKK: 7.46,   // 1 EUR = 7.46 DKK (Danish Krone)
  PLN: 4.35,   // 1 EUR = 4.35 PLN (Polish Zloty)
  CZK: 25.0,   // 1 EUR = 25 CZK (Czech Koruna)
  HUF: 390.0,  // 1 EUR = 390 HUF (Hungarian Forint)
  RON: 4.97,   // 1 EUR = 4.97 RON (Romanian Leu)
  BGN: 1.96,   // 1 EUR = 1.96 BGN (Bulgarian Lev)
};

// In-memory cache for exchange rates
let cachedRates: {
  rates: ExchangeRates;
  timestamp: number;
} | null = null;

// Cache duration: 24 hours in milliseconds
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Fetch fresh exchange rates from frankfurter.app API
 * Returns rates with EUR as base (EUR = 1)
 */
// All supported currencies (except EUR which is the base)
const SUPPORTED_CURRENCIES = ['USD', 'ALL', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN'];

async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    const currencyList = SUPPORTED_CURRENCIES.join(',');
    const response = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${currencyList}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    // API returns: { rates: { USD: 1.08, ALL: 100.5, GBP: 0.86, ... } }
    const rates: ExchangeRates = {
      EUR: 1,
      USD: data.rates.USD || FALLBACK_RATES.USD,
      ALL: data.rates.ALL || FALLBACK_RATES.ALL,
      GBP: data.rates.GBP || FALLBACK_RATES.GBP,
      CHF: data.rates.CHF || FALLBACK_RATES.CHF,
      NOK: data.rates.NOK || FALLBACK_RATES.NOK,
      SEK: data.rates.SEK || FALLBACK_RATES.SEK,
      DKK: data.rates.DKK || FALLBACK_RATES.DKK,
      PLN: data.rates.PLN || FALLBACK_RATES.PLN,
      CZK: data.rates.CZK || FALLBACK_RATES.CZK,
      HUF: data.rates.HUF || FALLBACK_RATES.HUF,
      RON: data.rates.RON || FALLBACK_RATES.RON,
      BGN: data.rates.BGN || FALLBACK_RATES.BGN,
    };

    return rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates from API:', error);
    return FALLBACK_RATES;
  }
}

/**
 * Get current exchange rates (cached for 24 hours)
 * Rates are relative to EUR (EUR = 1)
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();

  // Return cached rates if still valid
  if (cachedRates && (now - cachedRates.timestamp) < CACHE_DURATION_MS) {
    return { ...cachedRates.rates };
  }

  // Fetch fresh rates
  console.log('Fetching fresh exchange rates from API...');
  const rates = await fetchExchangeRates();

  // Update cache
  cachedRates = {
    rates,
    timestamp: now,
  };

  console.log('Exchange rates updated:', rates);
  return { ...rates };
}

/**
 * Get exchange rates synchronously (returns cached or fallback)
 * Use this when you can't await, but prefer getExchangeRates() when possible
 */
export function getExchangeRatesSync(): ExchangeRates {
  if (cachedRates) {
    return { ...cachedRates.rates };
  }
  return { ...FALLBACK_RATES };
}

/**
 * Convert an amount from one currency to another
 *
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @param rates - Exchange rates (optional, uses cached/fallback if not provided)
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  rates?: ExchangeRates
): number {
  if (fromCurrency === toCurrency) return amount;

  const exchangeRates = rates || getExchangeRatesSync();

  // Convert to EUR first, then to target currency
  // If from EUR: amount * targetRate
  // If to EUR: amount / sourceRate
  // Otherwise: amount / sourceRate * targetRate
  const amountInEUR = amount / exchangeRates[fromCurrency];
  return amountInEUR * exchangeRates[toCurrency];
}

/**
 * Convert an amount to the user's main currency
 * Alias for convertCurrency for backwards compatibility
 */
export function convertToMainCurrency(
  amount: number,
  fromCurrency: Currency,
  mainCurrency: Currency,
  rates?: ExchangeRates
): number {
  return convertCurrency(amount, fromCurrency, mainCurrency, rates);
}

/**
 * Get the user's main currency setting
 */
export async function getMainCurrency(userId: string): Promise<Currency> {
  return settingsQueries.getMainCurrency(userId);
}

/**
 * Round to 2 decimal places for currency display
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Pre-warm the exchange rate cache on server startup
 * Call this from server initialization
 */
export async function initializeExchangeRates(): Promise<void> {
  console.log('Initializing exchange rate cache...');
  await getExchangeRates();
}
