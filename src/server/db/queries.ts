import { query, queryOne, insert } from './schema.js';

// Types
export type AccountType = 'stock' | 'bank' | 'cash' | 'loan' | 'credit' | 'asset';
export type Currency = 'EUR' | 'USD' | 'ALL';
export type TransactionType = 'inflow' | 'outflow';
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Account {
  id: number;
  user_id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  initial_balance: number;
  is_favorite: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  created_at: string;
}

export interface Payee {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
}

export interface AccountTransaction {
  id: number;
  account_id: number;
  type: TransactionType;
  amount: number;
  date: string;
  payee_id: number | null;
  category_id: number | null;
  notes: string | null;
  transfer_id: number | null;
  created_at: string;
  // Joined fields
  payee_name?: string;
  category_name?: string;
}

export interface RecurringTransaction {
  id: number;
  account_id: number;
  type: TransactionType;
  amount: number;
  payee_id: number | null;
  category_id: number | null;
  notes: string | null;
  frequency: Frequency;
  next_due_date: string;
  is_active: boolean;
  created_at: string;
  // Joined fields
  payee_name?: string;
  category_name?: string;
}

export interface Transfer {
  id: number;
  user_id: string;
  from_account_id: number;
  to_account_id: number;
  from_amount: number;
  to_amount: number;
  date: string;
  notes: string | null;
  created_at: string;
  // Joined fields
  from_account_name?: string;
  to_account_name?: string;
  from_account_currency?: Currency;
  to_account_currency?: Currency;
}

export interface Holding {
  id: number;
  symbol: string;
  shares: number;
  avg_cost: number;
  account_id: number | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  fees: number;
  date: string;
  account_id: number | null;
  created_at: string;
}

export interface Dividend {
  id: number;
  symbol: string;
  amount: number;
  shares_held: number;
  ex_date: string;
  pay_date: string | null;
  tax_rate: number;
  tax_amount: number;
  net_amount: number;
  account_id: number | null;
  created_at: string;
}

// Account queries - all filtered by userId
export const accountQueries = {
  getAll: async (userId: string) => {
    return query<Account>('SELECT * FROM accounts WHERE user_id = $1 ORDER BY type, name', [userId]);
  },

  getById: async (userId: string, id: number) => {
    return queryOne<Account>('SELECT * FROM accounts WHERE id = $1 AND user_id = $2', [id, userId]);
  },

  getByType: async (userId: string, type: AccountType) => {
    return query<Account>('SELECT * FROM accounts WHERE user_id = $1 AND type = $2 ORDER BY name', [userId, type]);
  },

  create: async (userId: string, name: string, type: AccountType, currency: Currency, initialBalance: number = 0) => {
    const result = await insert<Account>(
      'INSERT INTO accounts (user_id, name, type, currency, initial_balance) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, name, type, currency, initialBalance]
    );
    return result.id;
  },

  update: async (userId: string, id: number, name: string, currency: Currency, initialBalance: number) => {
    await query(
      'UPDATE accounts SET name = $1, currency = $2, initial_balance = $3 WHERE id = $4 AND user_id = $5',
      [name, currency, initialBalance, id, userId]
    );
  },

  delete: async (userId: string, id: number) => {
    await query('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [id, userId]);
  },

  getBalance: async (userId: string, id: number) => {
    const account = await queryOne<Account>('SELECT * FROM accounts WHERE id = $1 AND user_id = $2', [id, userId]);
    if (!account) return null;

    const result = await queryOne<{ transaction_total: string }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'inflow' THEN amount ELSE -amount END), 0) as transaction_total
      FROM account_transactions
      WHERE account_id = $1`,
      [id]
    );

    return {
      account,
      balance: Number(account.initial_balance) + Number(result?.transaction_total || 0)
    };
  },

  setFavorite: async (userId: string, id: number, isFavorite: boolean) => {
    await query('UPDATE accounts SET is_favorite = $1 WHERE id = $2 AND user_id = $3', [isFavorite, id, userId]);
  },

  getFavorites: async (userId: string) => {
    return query<Account>('SELECT * FROM accounts WHERE user_id = $1 AND is_favorite = true ORDER BY type, name', [userId]);
  },
};

// Category queries - all filtered by userId
export const categoryQueries = {
  getAll: async (userId: string) => {
    return query<Category>('SELECT * FROM categories WHERE user_id = $1 ORDER BY type, name', [userId]);
  },

  getById: async (userId: string, id: number) => {
    return queryOne<Category>('SELECT * FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
  },

  getByType: async (userId: string, type: 'income' | 'expense') => {
    return query<Category>('SELECT * FROM categories WHERE user_id = $1 AND type = $2 ORDER BY name', [userId, type]);
  },

  getByName: async (userId: string, name: string) => {
    return queryOne<Category>('SELECT * FROM categories WHERE user_id = $1 AND name = $2', [userId, name]);
  },

  create: async (userId: string, name: string, type: 'income' | 'expense' = 'expense') => {
    const result = await insert<Category>(
      'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) RETURNING *',
      [userId, name, type]
    );
    return result.id;
  },

  getOrCreate: async (userId: string, name: string, type: 'income' | 'expense' = 'expense') => {
    const existing = await categoryQueries.getByName(userId, name);
    if (existing) return existing.id;
    return categoryQueries.create(userId, name, type);
  },

  update: async (userId: string, id: number, name: string) => {
    await query('UPDATE categories SET name = $1 WHERE id = $2 AND user_id = $3', [name, id, userId]);
  },

  delete: async (userId: string, id: number) => {
    await query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [id, userId]);
  },
};

// Payee queries - all filtered by userId
export const payeeQueries = {
  getAll: async (userId: string) => {
    return query<Payee>('SELECT * FROM payees WHERE user_id = $1 ORDER BY name', [userId]);
  },

  getById: async (userId: string, id: number) => {
    return queryOne<Payee>('SELECT * FROM payees WHERE id = $1 AND user_id = $2', [id, userId]);
  },

  getByName: async (userId: string, name: string) => {
    return queryOne<Payee>('SELECT * FROM payees WHERE user_id = $1 AND name = $2', [userId, name]);
  },

  search: async (userId: string, searchQuery: string, limit: number = 10) => {
    return query<Payee>(
      'SELECT * FROM payees WHERE user_id = $1 AND name ILIKE $2 ORDER BY name LIMIT $3',
      [userId, `%${searchQuery}%`, limit]
    );
  },

  create: async (userId: string, name: string) => {
    const result = await insert<Payee>(
      'INSERT INTO payees (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name]
    );
    return result.id;
  },

  getOrCreate: async (userId: string, name: string) => {
    const existing = await payeeQueries.getByName(userId, name);
    if (existing) return existing.id;
    return payeeQueries.create(userId, name);
  },

  update: async (userId: string, id: number, name: string) => {
    await query('UPDATE payees SET name = $1 WHERE id = $2 AND user_id = $3', [name, id, userId]);
  },

  delete: async (userId: string, id: number) => {
    await query('DELETE FROM payees WHERE id = $1 AND user_id = $2', [id, userId]);
  },

  merge: async (userId: string, sourceId: number, targetId: number) => {
    // Only merge payees that belong to the user
    const source = await payeeQueries.getById(userId, sourceId);
    const target = await payeeQueries.getById(userId, targetId);
    if (!source || !target) return;

    await query('UPDATE account_transactions SET payee_id = $1 WHERE payee_id = $2', [targetId, sourceId]);
    await query('UPDATE recurring_transactions SET payee_id = $1 WHERE payee_id = $2', [targetId, sourceId]);
    await query('DELETE FROM payees WHERE id = $1 AND user_id = $2', [sourceId, userId]);
  },
};

// Account Transaction queries (bank/cash transactions) - filtered via account ownership
export const accountTransactionQueries = {
  getByAccount: async (userId: string, accountId: number) => {
    // First verify the account belongs to the user
    const account = await accountQueries.getById(userId, accountId);
    if (!account) return [];

    return query<AccountTransaction>(
      `SELECT
        at.*,
        p.name as payee_name,
        c.name as category_name
      FROM account_transactions at
      LEFT JOIN payees p ON at.payee_id = p.id
      LEFT JOIN categories c ON at.category_id = c.id
      WHERE at.account_id = $1
      ORDER BY at.date DESC, at.id DESC`,
      [accountId]
    );
  },

  getById: async (userId: string, id: number) => {
    // Join with accounts to verify ownership
    return queryOne<AccountTransaction>(
      `SELECT
        at.*,
        p.name as payee_name,
        c.name as category_name
      FROM account_transactions at
      LEFT JOIN payees p ON at.payee_id = p.id
      LEFT JOIN categories c ON at.category_id = c.id
      JOIN accounts a ON at.account_id = a.id
      WHERE at.id = $1 AND a.user_id = $2`,
      [id, userId]
    );
  },

  create: async (
    userId: string,
    accountId: number,
    type: TransactionType,
    amount: number,
    date: string,
    payeeId: number | null = null,
    categoryId: number | null = null,
    notes: string | null = null,
    transferId: number | null = null
  ) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) throw new Error('Account not found');

    const result = await insert<AccountTransaction>(
      `INSERT INTO account_transactions (account_id, type, amount, date, payee_id, category_id, notes, transfer_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [accountId, type, amount, date, payeeId, categoryId, notes, transferId]
    );
    return result.id;
  },

  update: async (
    userId: string,
    id: number,
    type: TransactionType,
    amount: number,
    date: string,
    payeeId: number | null,
    categoryId: number | null,
    notes: string | null
  ) => {
    // Verify ownership via account
    const tx = await accountTransactionQueries.getById(userId, id);
    if (!tx) throw new Error('Transaction not found');

    await query(
      `UPDATE account_transactions
      SET type = $1, amount = $2, date = $3, payee_id = $4, category_id = $5, notes = $6
      WHERE id = $7`,
      [type, amount, date, payeeId, categoryId, notes, id]
    );
  },

  delete: async (userId: string, id: number) => {
    // Verify ownership via account
    const tx = await accountTransactionQueries.getById(userId, id);
    if (!tx) throw new Error('Transaction not found');

    await query('DELETE FROM account_transactions WHERE id = $1', [id]);
  },

  getByTransferId: async (userId: string, transferId: number) => {
    // Verify the transfer belongs to the user
    const transfer = await transferQueries.getById(userId, transferId);
    if (!transfer) return [];

    return query<AccountTransaction>(
      'SELECT * FROM account_transactions WHERE transfer_id = $1',
      [transferId]
    );
  },
};

// Recurring Transaction queries - filtered via account ownership
export const recurringQueries = {
  getByAccount: async (userId: string, accountId: number) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) return [];

    return query<RecurringTransaction>(
      `SELECT
        rt.*,
        p.name as payee_name,
        c.name as category_name
      FROM recurring_transactions rt
      LEFT JOIN payees p ON rt.payee_id = p.id
      LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.account_id = $1
      ORDER BY rt.next_due_date ASC`,
      [accountId]
    );
  },

  getActiveCountsByAccount: async (userId: string, accountId: number) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) return { inflow_count: '0', outflow_count: '0' };

    return queryOne<{ inflow_count: string; outflow_count: string }>(
      `SELECT
        SUM(CASE WHEN type = 'inflow' THEN 1 ELSE 0 END) as inflow_count,
        SUM(CASE WHEN type = 'outflow' THEN 1 ELSE 0 END) as outflow_count
      FROM recurring_transactions
      WHERE account_id = $1 AND is_active = true`,
      [accountId]
    );
  },

  getById: async (userId: string, id: number) => {
    return queryOne<RecurringTransaction>(
      `SELECT
        rt.*,
        p.name as payee_name,
        c.name as category_name
      FROM recurring_transactions rt
      LEFT JOIN payees p ON rt.payee_id = p.id
      LEFT JOIN categories c ON rt.category_id = c.id
      JOIN accounts a ON rt.account_id = a.id
      WHERE rt.id = $1 AND a.user_id = $2`,
      [id, userId]
    );
  },

  getDue: async (userId: string, beforeDate: string) => {
    return query<RecurringTransaction & { account_name: string; account_currency: Currency }>(
      `SELECT
        rt.*,
        p.name as payee_name,
        c.name as category_name,
        a.name as account_name,
        a.currency as account_currency
      FROM recurring_transactions rt
      LEFT JOIN payees p ON rt.payee_id = p.id
      LEFT JOIN categories c ON rt.category_id = c.id
      JOIN accounts a ON rt.account_id = a.id
      WHERE a.user_id = $1 AND rt.is_active = true AND rt.next_due_date <= $2
      ORDER BY rt.next_due_date ASC`,
      [userId, beforeDate]
    );
  },

  getAll: async (userId: string) => {
    return query<RecurringTransaction & { account_name: string; account_currency: Currency }>(
      `SELECT
        rt.*,
        p.name as payee_name,
        c.name as category_name,
        a.name as account_name,
        a.currency as account_currency
      FROM recurring_transactions rt
      LEFT JOIN payees p ON rt.payee_id = p.id
      LEFT JOIN categories c ON rt.category_id = c.id
      JOIN accounts a ON rt.account_id = a.id
      WHERE a.user_id = $1 AND rt.is_active = true
      ORDER BY rt.next_due_date ASC`,
      [userId]
    );
  },

  create: async (
    userId: string,
    accountId: number,
    type: TransactionType,
    amount: number,
    payeeId: number | null,
    categoryId: number | null,
    notes: string | null,
    frequency: Frequency,
    nextDueDate: string
  ) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) throw new Error('Account not found');

    const result = await insert<RecurringTransaction>(
      `INSERT INTO recurring_transactions (account_id, type, amount, payee_id, category_id, notes, frequency, next_due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [accountId, type, amount, payeeId, categoryId, notes, frequency, nextDueDate]
    );
    return result.id;
  },

  update: async (
    userId: string,
    id: number,
    type: TransactionType,
    amount: number,
    payeeId: number | null,
    categoryId: number | null,
    notes: string | null,
    frequency: Frequency,
    nextDueDate: string,
    isActive: boolean
  ) => {
    // Verify ownership
    const recurring = await recurringQueries.getById(userId, id);
    if (!recurring) throw new Error('Recurring transaction not found');

    await query(
      `UPDATE recurring_transactions
      SET type = $1, amount = $2, payee_id = $3, category_id = $4, notes = $5, frequency = $6, next_due_date = $7, is_active = $8
      WHERE id = $9`,
      [type, amount, payeeId, categoryId, notes, frequency, nextDueDate, isActive, id]
    );
  },

  updateNextDueDate: async (userId: string, id: number, nextDueDate: string) => {
    // Verify ownership
    const recurring = await recurringQueries.getById(userId, id);
    if (!recurring) throw new Error('Recurring transaction not found');

    await query('UPDATE recurring_transactions SET next_due_date = $1 WHERE id = $2', [nextDueDate, id]);
  },

  delete: async (userId: string, id: number) => {
    // Verify ownership
    const recurring = await recurringQueries.getById(userId, id);
    if (!recurring) throw new Error('Recurring transaction not found');

    await query('DELETE FROM recurring_transactions WHERE id = $1', [id]);
  },
};

// Transfer queries - filtered by userId
export const transferQueries = {
  getAll: async (userId: string) => {
    return query<Transfer>(
      `SELECT
        t.*,
        fa.name as from_account_name,
        ta.name as to_account_name,
        fa.currency as from_account_currency,
        ta.currency as to_account_currency
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      JOIN accounts ta ON t.to_account_id = ta.id
      WHERE t.user_id = $1
      ORDER BY t.date DESC, t.id DESC`,
      [userId]
    );
  },

  getById: async (userId: string, id: number) => {
    return queryOne<Transfer>(
      `SELECT
        t.*,
        fa.name as from_account_name,
        ta.name as to_account_name,
        fa.currency as from_account_currency,
        ta.currency as to_account_currency
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      JOIN accounts ta ON t.to_account_id = ta.id
      WHERE t.id = $1 AND t.user_id = $2`,
      [id, userId]
    );
  },

  create: async (
    userId: string,
    fromAccountId: number,
    toAccountId: number,
    fromAmount: number,
    toAmount: number,
    date: string,
    notes: string | null = null
  ) => {
    // Verify both accounts belong to the user
    const fromAccount = await accountQueries.getById(userId, fromAccountId);
    const toAccount = await accountQueries.getById(userId, toAccountId);
    if (!fromAccount || !toAccount) throw new Error('Account not found');

    // Create the transfer record
    const result = await insert<Transfer>(
      `INSERT INTO transfers (user_id, from_account_id, to_account_id, from_amount, to_amount, date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, fromAccountId, toAccountId, fromAmount, toAmount, date, notes]
    );
    const transferId = result.id;

    // Create the linked account transactions
    await accountTransactionQueries.create(userId, fromAccountId, 'outflow', fromAmount, date, null, null, notes ? `Transfer: ${notes}` : 'Transfer', transferId);
    await accountTransactionQueries.create(userId, toAccountId, 'inflow', toAmount, date, null, null, notes ? `Transfer: ${notes}` : 'Transfer', transferId);

    return transferId;
  },

  delete: async (userId: string, id: number) => {
    // Verify ownership
    const transfer = await transferQueries.getById(userId, id);
    if (!transfer) throw new Error('Transfer not found');

    // Delete linked transactions first
    await query('DELETE FROM account_transactions WHERE transfer_id = $1', [id]);
    // Delete the transfer
    await query('DELETE FROM transfers WHERE id = $1', [id]);
  },
};

// Holdings queries - filtered via account ownership
export const holdingsQueries = {
  getAll: async (userId: string) => {
    return query<Holding>(
      `SELECT h.* FROM holdings h
      JOIN accounts a ON h.account_id = a.id
      WHERE a.user_id = $1
      ORDER BY h.symbol`,
      [userId]
    );
  },

  getByAccount: async (userId: string, accountId: number) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) return [];

    return query<Holding>('SELECT * FROM holdings WHERE account_id = $1 ORDER BY symbol', [accountId]);
  },

  getBySymbol: async (userId: string, symbol: string, accountId?: number) => {
    if (accountId) {
      // Verify account ownership
      const account = await accountQueries.getById(userId, accountId);
      if (!account) return undefined;

      return queryOne<Holding>(
        'SELECT * FROM holdings WHERE symbol = $1 AND account_id = $2',
        [symbol.toUpperCase(), accountId]
      );
    }
    // Get any holding for this symbol owned by the user
    return queryOne<Holding>(
      `SELECT h.* FROM holdings h
      JOIN accounts a ON h.account_id = a.id
      WHERE h.symbol = $1 AND a.user_id = $2`,
      [symbol.toUpperCase(), userId]
    );
  },

  create: async (userId: string, symbol: string, shares: number, avgCost: number, accountId: number) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) throw new Error('Account not found');

    const result = await insert<Holding>(
      'INSERT INTO holdings (symbol, shares, avg_cost, account_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [symbol.toUpperCase(), shares, avgCost, accountId]
    );
    return result.id;
  },

  update: async (userId: string, id: number, shares: number, avgCost: number) => {
    // Verify ownership via account
    const holding = await queryOne<Holding & { user_id: string }>(
      `SELECT h.*, a.user_id FROM holdings h
      JOIN accounts a ON h.account_id = a.id
      WHERE h.id = $1`,
      [id]
    );
    if (!holding || holding.user_id !== userId) throw new Error('Holding not found');

    await query('UPDATE holdings SET shares = $1, avg_cost = $2 WHERE id = $3', [shares, avgCost, id]);
  },

  delete: async (userId: string, id: number) => {
    // Verify ownership via account
    const holding = await queryOne<Holding & { user_id: string }>(
      `SELECT h.*, a.user_id FROM holdings h
      JOIN accounts a ON h.account_id = a.id
      WHERE h.id = $1`,
      [id]
    );
    if (!holding || holding.user_id !== userId) throw new Error('Holding not found');

    await query('DELETE FROM holdings WHERE id = $1', [id]);
  },

  deleteBySymbol: async (userId: string, symbol: string, accountId: number) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) throw new Error('Account not found');

    await query('DELETE FROM holdings WHERE symbol = $1 AND account_id = $2', [symbol.toUpperCase(), accountId]);
  },
};

// Transaction queries (stock transactions) - filtered via account ownership
export const transactionQueries = {
  getAll: async (userId: string) => {
    return query<Transaction>(
      `SELECT t.* FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE a.user_id = $1
      ORDER BY t.date DESC, t.id DESC`,
      [userId]
    );
  },

  getByAccount: async (userId: string, accountId: number) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) return [];

    return query<Transaction>(
      'SELECT * FROM transactions WHERE account_id = $1 ORDER BY date DESC, id DESC',
      [accountId]
    );
  },

  getBySymbol: async (userId: string, symbol: string, accountId?: number) => {
    if (accountId) {
      // Verify account ownership
      const account = await accountQueries.getById(userId, accountId);
      if (!account) return [];

      return query<Transaction>(
        'SELECT * FROM transactions WHERE symbol = $1 AND account_id = $2 ORDER BY date DESC',
        [symbol.toUpperCase(), accountId]
      );
    }
    return query<Transaction>(
      `SELECT t.* FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE t.symbol = $1 AND a.user_id = $2
      ORDER BY t.date DESC`,
      [symbol.toUpperCase(), userId]
    );
  },

  create: async (userId: string, symbol: string, type: 'buy' | 'sell', shares: number, price: number, fees: number, date: string, accountId: number) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) throw new Error('Account not found');

    const result = await insert<Transaction>(
      'INSERT INTO transactions (symbol, type, shares, price, fees, date, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [symbol.toUpperCase(), type, shares, price, fees, date, accountId]
    );
    return result.id;
  },

  delete: async (userId: string, id: number) => {
    // Verify ownership via account
    const tx = await queryOne<Transaction & { user_id: string }>(
      `SELECT t.*, a.user_id FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE t.id = $1`,
      [id]
    );
    if (!tx || tx.user_id !== userId) throw new Error('Transaction not found');

    await query('DELETE FROM transactions WHERE id = $1', [id]);
  },
};

// Dividend queries - filtered via account ownership
export const dividendQueries = {
  getAll: async (userId: string) => {
    return query<Dividend>(
      `SELECT d.* FROM dividends d
      JOIN accounts a ON d.account_id = a.id
      WHERE a.user_id = $1
      ORDER BY d.ex_date DESC, d.id DESC`,
      [userId]
    );
  },

  getByAccount: async (userId: string, accountId: number) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) return [];

    return query<Dividend>(
      'SELECT * FROM dividends WHERE account_id = $1 ORDER BY ex_date DESC, id DESC',
      [accountId]
    );
  },

  getBySymbol: async (userId: string, symbol: string, accountId?: number) => {
    if (accountId) {
      // Verify account ownership
      const account = await accountQueries.getById(userId, accountId);
      if (!account) return [];

      return query<Dividend>(
        'SELECT * FROM dividends WHERE symbol = $1 AND account_id = $2 ORDER BY ex_date DESC',
        [symbol.toUpperCase(), accountId]
      );
    }
    return query<Dividend>(
      `SELECT d.* FROM dividends d
      JOIN accounts a ON d.account_id = a.id
      WHERE d.symbol = $1 AND a.user_id = $2
      ORDER BY d.ex_date DESC`,
      [symbol.toUpperCase(), userId]
    );
  },

  getByYear: async (userId: string, year: number, accountId?: number) => {
    if (accountId) {
      // Verify account ownership
      const account = await accountQueries.getById(userId, accountId);
      if (!account) return [];

      return query<Dividend>(
        "SELECT * FROM dividends WHERE EXTRACT(YEAR FROM ex_date) = $1 AND account_id = $2 ORDER BY ex_date DESC",
        [year, accountId]
      );
    }
    return query<Dividend>(
      `SELECT d.* FROM dividends d
      JOIN accounts a ON d.account_id = a.id
      WHERE EXTRACT(YEAR FROM d.ex_date) = $1 AND a.user_id = $2
      ORDER BY d.ex_date DESC`,
      [year, userId]
    );
  },

  create: async (
    userId: string,
    symbol: string,
    amount: number,
    sharesHeld: number,
    exDate: string,
    payDate: string | null,
    taxRate: number,
    taxAmount: number,
    netAmount: number,
    accountId: number
  ) => {
    // Verify account ownership
    const account = await accountQueries.getById(userId, accountId);
    if (!account) throw new Error('Account not found');

    const result = await insert<Dividend>(
      'INSERT INTO dividends (symbol, amount, shares_held, ex_date, pay_date, tax_rate, tax_amount, net_amount, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [symbol.toUpperCase(), amount, sharesHeld, exDate, payDate, taxRate, taxAmount, netAmount, accountId]
    );
    return result.id;
  },

  delete: async (userId: string, id: number) => {
    // Verify ownership via account
    const dividend = await queryOne<Dividend & { user_id: string }>(
      `SELECT d.*, a.user_id FROM dividends d
      JOIN accounts a ON d.account_id = a.id
      WHERE d.id = $1`,
      [id]
    );
    if (!dividend || dividend.user_id !== userId) throw new Error('Dividend not found');

    await query('DELETE FROM dividends WHERE id = $1', [id]);
  },

  getTaxSummary: async (userId: string, year?: number, accountId?: number) => {
    let whereClause = 'WHERE a.user_id = $1';
    const params: (string | number)[] = [userId];
    let paramIndex = 2;

    if (year && accountId) {
      whereClause += ` AND EXTRACT(YEAR FROM COALESCE(d.pay_date, d.ex_date)) = $${paramIndex++} AND d.account_id = $${paramIndex++}`;
      params.push(year, accountId);
    } else if (year) {
      whereClause += ` AND EXTRACT(YEAR FROM COALESCE(d.pay_date, d.ex_date)) = $${paramIndex++}`;
      params.push(year);
    } else if (accountId) {
      whereClause += ` AND d.account_id = $${paramIndex++}`;
      params.push(accountId);
    }

    const sql = `
      SELECT
        EXTRACT(YEAR FROM COALESCE(d.pay_date, d.ex_date))::text as year,
        SUM(d.amount) as total_gross,
        SUM(d.tax_amount) as total_tax,
        SUM(d.net_amount) as total_net,
        COUNT(*) as dividend_count
      FROM dividends d
      JOIN accounts a ON d.account_id = a.id
      ${whereClause}
      GROUP BY EXTRACT(YEAR FROM COALESCE(d.pay_date, d.ex_date))
      ORDER BY year DESC
    `;

    return query<{
      year: string;
      total_gross: number;
      total_tax: number;
      total_net: number;
      dividend_count: number;
    }>(sql, params);
  },
};

// Settings queries - now using user_settings table
export const settingsQueries = {
  get: async (userId: string, key: string) => {
    const result = await queryOne<{ value: string }>(
      'SELECT value FROM user_settings WHERE user_id = $1 AND key = $2',
      [userId, key]
    );
    return result?.value;
  },

  set: async (userId: string, key: string, value: string) => {
    await query(
      'INSERT INTO user_settings (user_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (user_id, key) DO UPDATE SET value = $3',
      [userId, key, value]
    );
  },

  getDividendTaxRate: async (userId: string) => {
    const rate = await settingsQueries.get(userId, 'dividend_tax_rate');
    return rate ? parseFloat(rate) : 0.08;
  },

  getMainCurrency: async (userId: string): Promise<Currency> => {
    const currency = await settingsQueries.get(userId, 'main_currency');
    return (currency as Currency) || 'ALL';
  },

  getSidebarCollapsed: async (userId: string) => {
    const collapsed = await settingsQueries.get(userId, 'sidebar_collapsed');
    return collapsed === '1';
  },
};
