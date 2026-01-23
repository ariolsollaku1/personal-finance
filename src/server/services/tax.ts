import { settingsQueries } from '../db/queries.js';

export interface DividendTaxCalculation {
  grossAmount: number;
  taxRate: number;
  taxAmount: number;
  netAmount: number;
}

// Dividend tax rate (30%)
const DEFAULT_DIVIDEND_TAX_RATE = 0.30;

export async function calculateDividendTax(
  dividendPerShare: number,
  sharesHeld: number,
  taxRate?: number
): Promise<DividendTaxCalculation> {
  const rate = taxRate ?? (await settingsQueries.getDividendTaxRate()) ?? DEFAULT_DIVIDEND_TAX_RATE;
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

export async function getCurrentTaxRate(): Promise<number> {
  return (await settingsQueries.getDividendTaxRate()) ?? DEFAULT_DIVIDEND_TAX_RATE;
}

export async function setTaxRate(rate: number): Promise<void> {
  if (rate < 0 || rate > 1) {
    throw new Error('Tax rate must be between 0 and 1');
  }
  await settingsQueries.set('dividend_tax_rate', rate.toString());
}
