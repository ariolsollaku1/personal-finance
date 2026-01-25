/**
 * Balance Service
 *
 * Calculates account balances and net worth contributions for all account types.
 * Handles the complex logic of different account types:
 * - Bank/Cash: Balance adds to net worth
 * - Stock: Cost basis (shares × avg cost) adds to net worth
 * - Asset: Initial value (current value) adds to net worth
 * - Loan: Balance subtracts from net worth
 * - Credit: Amount owed (limit - available) subtracts from net worth
 *
 * @module services/balance
 */

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

/**
 * Account balance information including recurring transaction counts
 */
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


/**
 * Account balance with currency conversion and net worth contribution
 */
export interface AccountBalanceWithConversion extends AccountBalance {
  /** Balance converted to user's main currency */
  balanceInMainCurrency: number;
  /** Contribution to net worth (can be negative for debt accounts) */
  netWorthContribution: number;
}

/**
 * Get the balance for a single account.
 *
 * Calculates balance based on account type:
 * - Stock accounts: Returns cost basis (sum of shares × avg cost)
 * - Other accounts: Returns initial_balance + sum of transactions
 *
 * @param userId - Supabase user UUID
 * @param accountId - Account ID to fetch balance for
 * @returns Account balance with recurring counts, or null if not found
 *
 * @remarks
 * For bulk operations, use {@link getAllAccountBalances} instead to avoid N+1 queries.
 *
 * @example
 * ```typescript
 * const balance = await getAccountBalance(userId, 123);
 * if (balance) {
 *   console.log(`${balance.name}: ${balance.balance} ${balance.currency}`);
 * }
 * ```
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
 * Get balances for all user accounts using batch queries.
 *
 * Uses parallel batch queries to efficiently fetch all account data in 3 queries
 * regardless of account count, avoiding N+1 query problems.
 *
 * @param userId - Supabase user UUID
 * @returns Array of account balances with recurring counts
 *
 * @remarks
 * Performance: 3 queries total (accounts+balances, holdings, recurring counts)
 * vs N+1 queries if fetching individually.
 *
 * @example
 * ```typescript
 * const balances = await getAllAccountBalances(userId);
 * const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
 * ```
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
 * Calculate net worth contribution for an account.
 *
 * Different account types contribute differently to net worth:
 * - **Bank/Cash**: Balance adds directly
 * - **Stock**: Balance (cost basis) adds directly
 * - **Asset**: Uses initial_balance as current value (adds)
 * - **Loan**: Balance subtracts (debt)
 * - **Credit**: Amount owed (limit - available) subtracts
 *
 * @param account - Account or account balance row
 * @param balance - Current balance in account's currency
 * @param mainCurrency - User's main currency for conversion
 * @returns Net worth contribution (negative for debt accounts)
 *
 * @example
 * ```typescript
 * // Credit card with $1000 limit and $800 available = $200 owed
 * const contribution = calculateNetWorthContribution(creditCard, 800, 'USD');
 * // Returns -200 (debt)
 * ```
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
 * Get all account balances with currency conversion and net worth contribution.
 *
 * Combines balance calculation with currency conversion in a single efficient
 * operation using batch queries.
 *
 * @param userId - Supabase user UUID
 * @param mainCurrency - Target currency for conversion
 * @returns Array of account balances with converted values and net worth contribution
 *
 * @remarks
 * This is the recommended method for dashboard and net worth calculations
 * as it provides all necessary data in one call.
 *
 * @example
 * ```typescript
 * const balances = await getAllAccountBalancesWithConversion(userId, 'EUR');
 * const netWorth = balances.reduce((sum, b) => sum + b.netWorthContribution, 0);
 * ```
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
 * Calculate credit card amount owed.
 *
 * Credit card logic:
 * - initial_balance = Credit limit
 * - balance = Available credit
 * - Amount owed = limit - available
 *
 * @param initialBalance - Credit limit in account currency
 * @param currentBalance - Available credit in account currency
 * @param currency - Account currency
 * @param mainCurrency - Target currency for conversion
 * @returns Amount owed converted to main currency
 *
 * @example
 * ```typescript
 * // $5000 limit, $3500 available = $1500 owed
 * const owed = getCreditCardOwed(5000, 3500, 'USD', 'EUR');
 * ```
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
