import { Currency, settingsQueries } from '../db/queries.js';

/**
 * Exchange Rate Service
 *
 * Fetches exchange rates from frankfurter.app API and caches them for 24 hours.
 * Uses EUR as the base currency. Falls back to hardcoded rates if API fails.
 */

// Fallback rates (EUR as base) - used if API fails
const FALLBACK_RATES: Record<Currency, number> = {
  EUR: 1,
  USD: 1.08,  // 1 EUR = 1.08 USD (approximate)
  ALL: 100.0, // 1 EUR = 100 ALL (approximate)
};

// In-memory cache for exchange rates
let cachedRates: {
  rates: Record<Currency, number>;
  timestamp: number;
} | null = null;

// Cache duration: 24 hours in milliseconds
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

export interface ExchangeRates {
  EUR: number;
  USD: number;
  ALL: number;
}

/**
 * Fetch fresh exchange rates from frankfurter.app API
 * Returns rates with EUR as base (EUR = 1)
 */
async function fetchExchangeRates(): Promise<Record<Currency, number>> {
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,ALL');

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    // API returns: { rates: { USD: 1.08, ALL: 100.5 } }
    return {
      EUR: 1,
      USD: data.rates.USD || FALLBACK_RATES.USD,
      ALL: data.rates.ALL || FALLBACK_RATES.ALL,
    };
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
