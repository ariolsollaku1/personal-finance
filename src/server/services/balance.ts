import {
  accountQueries,
  holdingsQueries,
  recurringQueries,
  Account,
  Currency,
} from '../db/queries.js';
import { convertToMainCurrency, roundCurrency } from './currency.js';

export interface AccountBalance {
  id: number;
  name: string;
  type: string;
  currency: Currency;
  balance: number;
  costBasis?: number; // For stock accounts
  recurringInflow: number;
  recurringOutflow: number;
}

export interface AccountBalanceWithConversion extends AccountBalance {
  balanceInMainCurrency: number;
  netWorthContribution: number;
}

/**
 * Get the balance for a single account
 */
export async function getAccountBalance(
  userId: string,
  accountId: number
): Promise<AccountBalance | null> {
  const account = await accountQueries.getById(userId, accountId);
  if (!account) return null;

  const balanceInfo = await accountQueries.getBalance(userId, accountId);
  const cashBalance = balanceInfo?.balance || 0;

  const recurringCounts = await recurringQueries.getActiveCountsByAccount(userId, accountId);
  const recurringInflow = Number(recurringCounts?.inflow_count) || 0;
  const recurringOutflow = Number(recurringCounts?.outflow_count) || 0;

  if (account.type === 'stock') {
    const holdings = await holdingsQueries.getByAccount(userId, accountId);
    let costBasis = 0;
    for (const holding of holdings) {
      costBasis += Number(holding.shares) * Number(holding.avg_cost);
    }

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance: roundCurrency(cashBalance),
      costBasis: roundCurrency(costBasis),
      recurringInflow,
      recurringOutflow,
    };
  }

  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    balance: roundCurrency(cashBalance),
    recurringInflow,
    recurringOutflow,
  };
}

/**
 * Get balances for all accounts (batch query to avoid N+1)
 */
export async function getAllAccountBalances(
  userId: string
): Promise<AccountBalance[]> {
  const accounts = await accountQueries.getAll(userId);
  const balances: AccountBalance[] = [];

  // Process all accounts
  for (const account of accounts) {
    const balance = await getAccountBalance(userId, account.id);
    if (balance) {
      balances.push(balance);
    }
  }

  return balances;
}

/**
 * Calculate net worth contribution for an account
 * This handles the different logic for each account type
 */
export function calculateNetWorthContribution(
  account: Account,
  balance: number,
  mainCurrency: Currency
): number {
  const balanceInMainCurrency = convertToMainCurrency(balance, account.currency, mainCurrency);

  switch (account.type) {
    case 'loan':
      // Loans subtract from net worth
      return -balanceInMainCurrency;

    case 'credit':
      // For credit cards: initial_balance is the limit, balance is available credit
      // Amount owed = limit - balance, net worth contribution = -(amount owed)
      const limitInMainCurrency = convertToMainCurrency(
        Number(account.initial_balance),
        account.currency,
        mainCurrency
      );
      const amountOwed = limitInMainCurrency - balanceInMainCurrency;
      return -amountOwed;

    case 'asset':
      // Asset accounts use initial_balance as the current value
      return convertToMainCurrency(
        Number(account.initial_balance),
        account.currency,
        mainCurrency
      );

    case 'stock':
      // For stock accounts in net worth calculation, we use cost basis (balance already includes it)
      return balanceInMainCurrency;

    default:
      // Bank and cash accounts add directly to net worth
      return balanceInMainCurrency;
  }
}

/**
 * Get all account balances with currency conversion and net worth contribution
 */
export async function getAllAccountBalancesWithConversion(
  userId: string,
  mainCurrency: Currency
): Promise<AccountBalanceWithConversion[]> {
  const accounts = await accountQueries.getAll(userId);
  const result: AccountBalanceWithConversion[] = [];

  for (const account of accounts) {
    const balance = await getAccountBalance(userId, account.id);
    if (!balance) continue;

    const balanceInMainCurrency = convertToMainCurrency(balance.balance, account.currency, mainCurrency);

    // For stock accounts, use cost basis for net worth calculation
    let netWorthContribution: number;
    if (account.type === 'stock') {
      const costBasisInMain = convertToMainCurrency(
        balance.costBasis || 0,
        account.currency,
        mainCurrency
      );
      netWorthContribution = costBasisInMain;
    } else {
      netWorthContribution = calculateNetWorthContribution(account, balance.balance, mainCurrency);
    }

    result.push({
      ...balance,
      balanceInMainCurrency: roundCurrency(balanceInMainCurrency),
      netWorthContribution: roundCurrency(netWorthContribution),
    });
  }

  return result;
}

/**
 * Get credit card amount owed
 */
export function getCreditCardOwed(
  initialBalance: number,
  currentBalance: number,
  currency: Currency,
  mainCurrency: Currency
): number {
  const limitInMain = convertToMainCurrency(initialBalance, currency, mainCurrency);
  const balanceInMain = convertToMainCurrency(currentBalance, currency, mainCurrency);
  return limitInMain - balanceInMain;
}
