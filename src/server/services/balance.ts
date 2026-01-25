import {
  accountQueries,
  holdingsQueries,
  batchQueries,
  Account,
  Currency,
  AccountBalanceRow,
  RecurringCountRow,
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
 * Note: For bulk operations, use getAllAccountBalances instead to avoid N+1
 */
export async function getAccountBalance(
  userId: string,
  accountId: number
): Promise<AccountBalance | null> {
  const account = await accountQueries.getById(userId, accountId);
  if (!account) return null;

  const balanceInfo = await accountQueries.getBalance(userId, accountId);
  const cashBalance = balanceInfo?.balance || 0;

  // For single account, we still need individual query for recurring
  const allRecurring = await batchQueries.getAllRecurringCounts(userId);
  const recurring = allRecurring.find(r => r.account_id === accountId);
  const recurringInflow = recurring?.inflow_count || 0;
  const recurringOutflow = recurring?.outflow_count || 0;

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
 * Get balances for all accounts using batch queries (no N+1)
 */
export async function getAllAccountBalances(
  userId: string
): Promise<AccountBalance[]> {
  // Batch fetch all data in parallel
  const [accountsWithBalances, allHoldings, allRecurringCounts] = await Promise.all([
    batchQueries.getAllAccountsWithBalances(userId),
    holdingsQueries.getAll(userId),
    batchQueries.getAllRecurringCounts(userId),
  ]);

  // Group holdings by account_id
  const holdingsByAccount = new Map<number, typeof allHoldings>();
  for (const holding of allHoldings) {
    const accountId = holding.account_id!;
    if (!holdingsByAccount.has(accountId)) {
      holdingsByAccount.set(accountId, []);
    }
    holdingsByAccount.get(accountId)!.push(holding);
  }

  // Group recurring counts by account_id
  const recurringByAccount = new Map<number, RecurringCountRow>();
  for (const recurring of allRecurringCounts) {
    recurringByAccount.set(recurring.account_id, recurring);
  }

  // Build results
  return accountsWithBalances.map((account) => {
    const recurring = recurringByAccount.get(account.id);
    const recurringInflow = recurring?.inflow_count || 0;
    const recurringOutflow = recurring?.outflow_count || 0;

    // Calculate balance from initial_balance + transaction_total
    const balance = Number(account.initial_balance) + Number(account.transaction_total);

    if (account.type === 'stock') {
      const holdings = holdingsByAccount.get(account.id) || [];
      let costBasis = 0;
      for (const holding of holdings) {
        costBasis += Number(holding.shares) * Number(holding.avg_cost);
      }

      return {
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        balance: roundCurrency(balance),
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
      balance: roundCurrency(balance),
      recurringInflow,
      recurringOutflow,
    };
  });
}

/**
 * Calculate net worth contribution for an account
 * This handles the different logic for each account type
 */
export function calculateNetWorthContribution(
  account: Account | AccountBalanceRow,
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
 * Uses batch queries (no N+1)
 */
export async function getAllAccountBalancesWithConversion(
  userId: string,
  mainCurrency: Currency
): Promise<AccountBalanceWithConversion[]> {
  // Batch fetch all data in parallel
  const [accountsWithBalances, allHoldings, allRecurringCounts] = await Promise.all([
    batchQueries.getAllAccountsWithBalances(userId),
    holdingsQueries.getAll(userId),
    batchQueries.getAllRecurringCounts(userId),
  ]);

  // Group holdings by account_id
  const holdingsByAccount = new Map<number, typeof allHoldings>();
  for (const holding of allHoldings) {
    const accountId = holding.account_id!;
    if (!holdingsByAccount.has(accountId)) {
      holdingsByAccount.set(accountId, []);
    }
    holdingsByAccount.get(accountId)!.push(holding);
  }

  // Group recurring counts by account_id
  const recurringByAccount = new Map<number, RecurringCountRow>();
  for (const recurring of allRecurringCounts) {
    recurringByAccount.set(recurring.account_id, recurring);
  }

  // Build results
  return accountsWithBalances.map((account) => {
    const recurring = recurringByAccount.get(account.id);
    const recurringInflow = recurring?.inflow_count || 0;
    const recurringOutflow = recurring?.outflow_count || 0;

    // Calculate balance from initial_balance + transaction_total
    const balance = Number(account.initial_balance) + Number(account.transaction_total);
    const balanceInMainCurrency = convertToMainCurrency(balance, account.currency, mainCurrency);

    if (account.type === 'stock') {
      const holdings = holdingsByAccount.get(account.id) || [];
      let costBasis = 0;
      for (const holding of holdings) {
        costBasis += Number(holding.shares) * Number(holding.avg_cost);
      }
      const costBasisInMain = convertToMainCurrency(costBasis, account.currency, mainCurrency);

      return {
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        balance: roundCurrency(balance),
        costBasis: roundCurrency(costBasis),
        recurringInflow,
        recurringOutflow,
        balanceInMainCurrency: roundCurrency(balanceInMainCurrency),
        netWorthContribution: roundCurrency(costBasisInMain),
      };
    }

    const netWorthContribution = calculateNetWorthContribution(account, balance, mainCurrency);

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance: roundCurrency(balance),
      recurringInflow,
      recurringOutflow,
      balanceInMainCurrency: roundCurrency(balanceInMainCurrency),
      netWorthContribution: roundCurrency(netWorthContribution),
    };
  });
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
