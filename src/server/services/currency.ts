import { Currency, settingsQueries } from '../db/queries.js';

// Exchange rates relative to ALL (Albanian Lek)
// In production, these would come from an API
export const EXCHANGE_RATES: Record<Currency, number> = {
  ALL: 1,
  EUR: 102.5, // 1 EUR = 102.5 ALL (approximate)
  USD: 95.0,  // 1 USD = 95 ALL (approximate)
};

export interface ExchangeRates {
  ALL: number;
  EUR: number;
  USD: number;
}

/**
 * Convert an amount from one currency to another
 */
export function convertToMainCurrency(
  amount: number,
  fromCurrency: Currency,
  mainCurrency: Currency
): number {
  if (fromCurrency === mainCurrency) return amount;

  // Convert to ALL first, then to main currency
  const amountInALL = amount * EXCHANGE_RATES[fromCurrency];
  return amountInALL / EXCHANGE_RATES[mainCurrency];
}

/**
 * Convert an amount from one currency to another (alias for clarity)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  return convertToMainCurrency(amount, fromCurrency, toCurrency);
}

/**
 * Get current exchange rates
 */
export function getExchangeRates(): ExchangeRates {
  return { ...EXCHANGE_RATES };
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
