/**
 * Tax Service
 *
 * Calculates dividend taxes based on user's configured tax rate.
 * Default rate is 30% but can be customized per user (e.g., 8% for Albanian tax).
 *
 * Provides both individual dividend calculations and annual summaries.
 *
 * @module services/tax
 */

import { settingsQueries } from '../db/queries.js';

/**
 * Result of dividend tax calculation
 */
export interface DividendTaxCalculation {
  /** Gross dividend amount (before tax) */
  grossAmount: number;
  /** Tax rate applied (0-1) */
  taxRate: number;
  /** Tax amount withheld */
  taxAmount: number;
  /** Net amount received (gross - tax) */
  netAmount: number;
}

/** Default dividend tax rate (30%) - can be customized per user */
const DEFAULT_DIVIDEND_TAX_RATE = 0.30;

/**
 * Calculate tax for a dividend payment.
 *
 * @param userId - Supabase user UUID (for getting user's tax rate)
 * @param dividendPerShare - Dividend amount per share
 * @param sharesHeld - Number of shares held
 * @param taxRate - Optional override for tax rate (0-1)
 * @returns Dividend tax calculation with gross, tax, and net amounts
 *
 * @example
 * ```typescript
 * // $0.50 dividend on 100 shares with 8% tax
 * const tax = await calculateDividendTax(userId, 0.50, 100, 0.08);
 * // { grossAmount: 50, taxRate: 0.08, taxAmount: 4, netAmount: 46 }
 * ```
 */
export async function calculateDividendTax(
  userId: string,
  dividendPerShare: number,
  sharesHeld: number,
  taxRate?: number
): Promise<DividendTaxCalculation> {
  const rate = taxRate ?? (await settingsQueries.getDividendTaxRate(userId)) ?? DEFAULT_DIVIDEND_TAX_RATE;
  const grossAmount = dividendPerShare * sharesHeld;
  const taxAmount = grossAmount * rate;
  const netAmount = grossAmount - taxAmount;

  return {
    grossAmount: Math.round(grossAmount * 100) / 100,
    taxRate: rate,
    taxAmount: Math.round(taxAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
  };
}

/**
 * Calculate annual tax summary from multiple dividends.
 *
 * Aggregates all dividend tax calculations for a year to provide
 * total gross, tax withheld, net received, and effective tax rate.
 *
 * @param dividends - Array of dividend tax calculations
 * @returns Annual totals with effective tax rate
 *
 * @example
 * ```typescript
 * const annualTax = calculateAnnualTax(dividendCalculations);
 * console.log(`Total tax: ${annualTax.totalTax}`);
 * console.log(`Effective rate: ${(annualTax.effectiveRate * 100).toFixed(2)}%`);
 * ```
 */
export function calculateAnnualTax(dividends: DividendTaxCalculation[]): {
  totalGross: number;
  totalTax: number;
  totalNet: number;
  effectiveRate: number;
} {
  const totalGross = dividends.reduce((sum, d) => sum + d.grossAmount, 0);
  const totalTax = dividends.reduce((sum, d) => sum + d.taxAmount, 0);
  const totalNet = dividends.reduce((sum, d) => sum + d.netAmount, 0);
  const effectiveRate = totalGross > 0 ? totalTax / totalGross : 0;

  return {
    totalGross: Math.round(totalGross * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalNet: Math.round(totalNet * 100) / 100,
    effectiveRate: Math.round(effectiveRate * 10000) / 10000,
  };
}

/**
 * Get user's current dividend tax rate setting.
 *
 * @param userId - Supabase user UUID
 * @returns Tax rate as decimal (0-1), defaults to 0.30 (30%)
 */
export async function getCurrentTaxRate(userId: string): Promise<number> {
  return (await settingsQueries.getDividendTaxRate(userId)) ?? DEFAULT_DIVIDEND_TAX_RATE;
}

/**
 * Update user's dividend tax rate setting.
 *
 * @param userId - Supabase user UUID
 * @param rate - New tax rate as decimal (0-1)
 * @throws Error if rate is not between 0 and 1
 *
 * @example
 * ```typescript
 * // Set to Albanian 8% rate
 * await setTaxRate(userId, 0.08);
 * ```
 */
export async function setTaxRate(userId: string, rate: number): Promise<void> {
  if (rate < 0 || rate > 1) {
    throw new Error('Tax rate must be between 0 and 1');
  }
  await settingsQueries.set(userId, 'dividend_tax_rate', rate.toString());
}
