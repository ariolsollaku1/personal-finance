import { Currency } from './api';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  ALL: 'L',
};

const CURRENCY_FORMATS: Record<Currency, { locale: string; decimals: number }> = {
  EUR: { locale: 'de-DE', decimals: 2 },
  USD: { locale: 'en-US', decimals: 2 },
  ALL: { locale: 'sq-AL', decimals: 0 },
};

export function formatCurrency(amount: number, currency: Currency): string {
  const { decimals } = CURRENCY_FORMATS[currency];
  const symbol = CURRENCY_SYMBOLS[currency];

  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = amount < 0 ? '-' : '';

  // Position symbol based on currency
  if (currency === 'EUR') {
    return `${sign}${formatted} ${symbol}`;
  } else if (currency === 'ALL') {
    return `${sign}${formatted} ${symbol}`;
  } else {
    return `${sign}${symbol}${formatted}`;
  }
}

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}
