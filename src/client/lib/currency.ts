import { Currency } from './api';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  ALL: 'L',
  GBP: '£',
  CHF: 'Fr.',
  NOK: 'kr',
  SEK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
};

const CURRENCY_FORMATS: Record<Currency, { locale: string; decimals: number }> = {
  EUR: { locale: 'de-DE', decimals: 2 },
  USD: { locale: 'en-US', decimals: 2 },
  ALL: { locale: 'sq-AL', decimals: 0 },
  GBP: { locale: 'en-GB', decimals: 2 },
  CHF: { locale: 'de-CH', decimals: 2 },
  NOK: { locale: 'nb-NO', decimals: 2 },
  SEK: { locale: 'sv-SE', decimals: 2 },
  DKK: { locale: 'da-DK', decimals: 2 },
  PLN: { locale: 'pl-PL', decimals: 2 },
  CZK: { locale: 'cs-CZ', decimals: 2 },
  HUF: { locale: 'hu-HU', decimals: 0 },  // Forint typically shown without decimals
  RON: { locale: 'ro-RO', decimals: 2 },
  BGN: { locale: 'bg-BG', decimals: 2 },
};

// Currencies where symbol comes after the amount
const SYMBOL_SUFFIX_CURRENCIES: Currency[] = ['EUR', 'ALL', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'CHF'];

export function formatCurrency(amount: number, currency: Currency): string {
  const { decimals } = CURRENCY_FORMATS[currency];
  const symbol = CURRENCY_SYMBOLS[currency];

  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const sign = amount < 0 ? '-' : '';

  // Position symbol based on currency convention
  if (SYMBOL_SUFFIX_CURRENCIES.includes(currency)) {
    return `${sign}${formatted} ${symbol}`;
  } else {
    // USD, GBP use prefix
    return `${sign}${symbol}${formatted}`;
  }
}

// Compact currency formatter (e.g., 494k L, 1.5M €)
export function formatCompactCurrency(amount: number, currency: Currency): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const symbol = CURRENCY_SYMBOLS[currency];

  let formatted: string;
  if (absAmount >= 1_000_000) {
    const millions = absAmount / 1_000_000;
    formatted = millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  } else if (absAmount >= 1_000) {
    const thousands = absAmount / 1_000;
    formatted = thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1)}k`;
  } else {
    formatted = absAmount.toFixed(0);
  }

  if (SYMBOL_SUFFIX_CURRENCIES.includes(currency)) {
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
