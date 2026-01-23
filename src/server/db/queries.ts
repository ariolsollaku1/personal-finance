import { query, queryOne, insert, pool } from './schema.js';

// Types
export type AccountType = 'stock' | 'bank' | 'cash' | 'loan' | 'credit' | 'asset';
export type Currency = 'EUR' | 'USD' | 'ALL';
export type TransactionType = 'inflow' | 'outflow';
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: Currency;
  initial_balance: number;
  is_favorite: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  created_at: string;
}

export interface Payee {
  id: number;
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

// Account queries
export const accountQueries = {
  getAll: async () => {
    return query<Account>('SELECT * FROM accounts ORDER BY type, name');
  },

  getById: async (id: number) => {
    return queryOne<Account>('SELECT * FROM accounts WHERE id = $1', [id]);
  },

  getByType: async (type: AccountType) => {
    return query<Account>('SELECT * FROM accounts WHERE type = $1 ORDER BY name', [type]);
  },

  create: async (name: string, type: AccountType, currency: Currency, initialBalance: number = 0) => {
    const result = await insert<Account>(
      'INSERT INTO accounts (name, type, currency, initial_balance) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, type, currency, initialBalance]
    );
    return result.id;
  },

  update: async (id: number, name: string, currency: Currency, initialBalance: number) => {
    await query(
      'UPDATE accounts SET name = $1, currency = $2, initial_balance = $3 WHERE id = $4',
      [name, currency, initialBalance, id]
    );
  },

  delete: async (id: number) => {
    await query('DELETE FROM accounts WHERE id = $1', [id]);
  },

  getBalance: async (id: number) => {
    const account = await queryOne<Account>('SELECT * FROM accounts WHERE id = $1', [id]);
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

  setFavorite: async (id: number, isFavorite: boolean) => {
    await query('UPDATE accounts SET is_favorite = $1 WHERE id = $2', [isFavorite, id]);
  },

  getFavorites: async () => {
    return query<Account>('SELECT * FROM accounts WHERE is_favorite = true ORDER BY type, name');
  },
};

// Category queries
export const categoryQueries = {
  getAll: async () => {
    return query<Category>('SELECT * FROM categories ORDER BY type, name');
  },

  getById: async (id: number) => {
    return queryOne<Category>('SELECT * FROM categories WHERE id = $1', [id]);
  },

  getByType: async (type: 'income' | 'expense') => {
    return query<Category>('SELECT * FROM categories WHERE type = $1 ORDER BY name', [type]);
  },

  getByName: async (name: string) => {
    return queryOne<Category>('SELECT * FROM categories WHERE name = $1', [name]);
  },

  create: async (name: string, type: 'income' | 'expense' = 'expense') => {
    const result = await insert<Category>(
      'INSERT INTO categories (name, type) VALUES ($1, $2) RETURNING *',
      [name, type]
    );
    return result.id;
  },

  getOrCreate: async (name: string, type: 'income' | 'expense' = 'expense') => {
    const existing = await categoryQueries.getByName(name);
    if (existing) return existing.id;
    return categoryQueries.create(name, type);
  },

  update: async (id: number, name: string) => {
    await query('UPDATE categories SET name = $1 WHERE id = $2', [name, id]);
  },

  delete: async (id: number) => {
    await query('DELETE FROM categories WHERE id = $1', [id]);
  },
};

// Payee queries
export const payeeQueries = {
  getAll: async () => {
    return query<Payee>('SELECT * FROM payees ORDER BY name');
  },

  getById: async (id: number) => {
    return queryOne<Payee>('SELECT * FROM payees WHERE id = $1', [id]);
  },

  getByName: async (name: string) => {
    return queryOne<Payee>('SELECT * FROM payees WHERE name = $1', [name]);
  },

  search: async (searchQuery: string, limit: number = 10) => {
    return query<Payee>(
      'SELECT * FROM payees WHERE name ILIKE $1 ORDER BY name LIMIT $2',
      [`%${searchQuery}%`, limit]
    );
  },

  create: async (name: string) => {
    const result = await insert<Payee>(
      'INSERT INTO payees (name) VALUES ($1) RETURNING *',
      [name]
    );
    return result.id;
  },

  getOrCreate: async (name: string) => {
    const existing = await payeeQueries.getByName(name);
    if (existing) return existing.id;
    return payeeQueries.create(name);
  },

  update: async (id: number, name: string) => {
    await query('UPDATE payees SET name = $1 WHERE id = $2', [name, id]);
  },

  delete: async (id: number) => {
    await query('DELETE FROM payees WHERE id = $1', [id]);
  },

  merge: async (sourceId: number, targetId: number) => {
    await query('UPDATE account_transactions SET payee_id = $1 WHERE payee_id = $2', [targetId, sourceId]);
    await query('UPDATE recurring_transactions SET payee_id = $1 WHERE payee_id = $2', [targetId, sourceId]);
    await query('DELETE FROM payees WHERE id = $1', [sourceId]);
  },
};

// Account Transaction queries (bank/cash transactions)
export const accountTransactionQueries = {
  getByAccount: async (accountId: number) => {
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

  getById: async (id: number) => {
    return queryOne<AccountTransaction>(
      `SELECT
        at.*,
        p.name as payee_name,
        c.name as category_name
      FROM account_transactions at
      LEFT JOIN payees p ON at.payee_id = p.id
      LEFT JOIN categories c ON at.category_id = c.id
      WHERE at.id = $1`,
      [id]
    );
  },

  create: async (
    accountId: number,
    type: TransactionType,
    amount: number,
    date: string,
    payeeId: number | null = null,
    categoryId: number | null = null,
    notes: string | null = null,
    transferId: number | null = null
  ) => {
    const result = await insert<AccountTransaction>(
      `INSERT INTO account_transactions (account_id, type, amount, date, payee_id, category_id, notes, transfer_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [accountId, type, amount, date, payeeId, categoryId, notes, transferId]
    );
    return result.id;
  },

  update: async (
    id: number,
    type: TransactionType,
    amount: number,
    date: string,
    payeeId: number | null,
    categoryId: number | null,
    notes: string | null
  ) => {
    await query(
      `UPDATE account_transactions
      SET type = $1, amount = $2, date = $3, payee_id = $4, category_id = $5, notes = $6
      WHERE id = $7`,
      [type, amount, date, payeeId, categoryId, notes, id]
    );
  },

  delete: async (id: number) => {
    await query('DELETE FROM account_transactions WHERE id = $1', [id]);
  },

  getByTransferId: async (transferId: number) => {
    return query<AccountTransaction>(
      'SELECT * FROM account_transactions WHERE transfer_id = $1',
      [transferId]
    );
  },
};

// Recurring Transaction queries
export const recurringQueries = {
  getByAccount: async (accountId: number) => {
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

  getActiveCountsByAccount: async (accountId: number) => {
    return queryOne<{ inflow_count: string; outflow_count: string }>(
      `SELECT
        SUM(CASE WHEN type = 'inflow' THEN 1 ELSE 0 END) as inflow_count,
        SUM(CASE WHEN type = 'outflow' THEN 1 ELSE 0 END) as outflow_count
      FROM recurring_transactions
      WHERE account_id = $1 AND is_active = true`,
      [accountId]
    );
  },

  getById: async (id: number) => {
    return queryOne<RecurringTransaction>(
      `SELECT
        rt.*,
        p.name as payee_name,
        c.name as category_name
      FROM recurring_transactions rt
      LEFT JOIN payees p ON rt.payee_id = p.id
      LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.id = $1`,
      [id]
    );
  },

  getDue: async (beforeDate: string) => {
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
      LEFT JOIN accounts a ON rt.account_id = a.id
      WHERE rt.is_active = true AND rt.next_due_date <= $1
      ORDER BY rt.next_due_date ASC`,
      [beforeDate]
    );
  },

  create: async (
    accountId: number,
    type: TransactionType,
    amount: number,
    payeeId: number | null,
    categoryId: number | null,
    notes: string | null,
    frequency: Frequency,
    nextDueDate: string
  ) => {
    const result = await insert<RecurringTransaction>(
      `INSERT INTO recurring_transactions (account_id, type, amount, payee_id, category_id, notes, frequency, next_due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [accountId, type, amount, payeeId, categoryId, notes, frequency, nextDueDate]
    );
    return result.id;
  },

  update: async (
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
    await query(
      `UPDATE recurring_transactions
      SET type = $1, amount = $2, payee_id = $3, category_id = $4, notes = $5, frequency = $6, next_due_date = $7, is_active = $8
      WHERE id = $9`,
      [type, amount, payeeId, categoryId, notes, frequency, nextDueDate, isActive, id]
    );
  },

  updateNextDueDate: async (id: number, nextDueDate: string) => {
    await query('UPDATE recurring_transactions SET next_due_date = $1 WHERE id = $2', [nextDueDate, id]);
  },

  delete: async (id: number) => {
    await query('DELETE FROM recurring_transactions WHERE id = $1', [id]);
  },
};

// Transfer queries
export const transferQueries = {
  getAll: async () => {
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
      ORDER BY t.date DESC, t.id DESC`
    );
  },

  getById: async (id: number) => {
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
      WHERE t.id = $1`,
      [id]
    );
  },

  create: async (
    fromAccountId: number,
    toAccountId: number,
    fromAmount: number,
    toAmount: number,
    date: string,
    notes: string | null = null
  ) => {
    // Create the transfer record
    const result = await insert<Transfer>(
      `INSERT INTO transfers (from_account_id, to_account_id, from_amount, to_amount, date, notes)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [fromAccountId, toAccountId, fromAmount, toAmount, date, notes]
    );
    const transferId = result.id;

    // Create the linked account transactions
    await accountTransactionQueries.create(fromAccountId, 'outflow', fromAmount, date, null, null, notes ? `Transfer: ${notes}` : 'Transfer', transferId);
    await accountTransactionQueries.create(toAccountId, 'inflow', toAmount, date, null, null, notes ? `Transfer: ${notes}` : 'Transfer', transferId);

    return transferId;
  },

  delete: async (id: number) => {
    // Delete linked transactions first
    await query('DELETE FROM account_transactions WHERE transfer_id = $1', [id]);
    // Delete the transfer
    await query('DELETE FROM transfers WHERE id = $1', [id]);
  },
};

// Holdings queries
export const holdingsQueries = {
  getAll: async () => {
    return query<Holding>('SELECT * FROM holdings ORDER BY symbol');
  },

  getByAccount: async (accountId: number) => {
    return query<Holding>('SELECT * FROM holdings WHERE account_id = $1 ORDER BY symbol', [accountId]);
  },

  getBySymbol: async (symbol: string, accountId?: number) => {
    if (accountId) {
      return queryOne<Holding>(
        'SELECT * FROM holdings WHERE symbol = $1 AND account_id = $2',
        [symbol.toUpperCase(), accountId]
      );
    }
    return queryOne<Holding>('SELECT * FROM holdings WHERE symbol = $1', [symbol.toUpperCase()]);
  },

  create: async (symbol: string, shares: number, avgCost: number, accountId?: number) => {
    const result = await insert<Holding>(
      'INSERT INTO holdings (symbol, shares, avg_cost, account_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [symbol.toUpperCase(), shares, avgCost, accountId || null]
    );
    return result.id;
  },

  update: async (id: number, shares: number, avgCost: number) => {
    await query('UPDATE holdings SET shares = $1, avg_cost = $2 WHERE id = $3', [shares, avgCost, id]);
  },

  delete: async (id: number) => {
    await query('DELETE FROM holdings WHERE id = $1', [id]);
  },

  deleteBySymbol: async (symbol: string, accountId?: number) => {
    if (accountId) {
      await query('DELETE FROM holdings WHERE symbol = $1 AND account_id = $2', [symbol.toUpperCase(), accountId]);
    } else {
      await query('DELETE FROM holdings WHERE symbol = $1', [symbol.toUpperCase()]);
    }
  },
};

// Transaction queries (stock transactions)
export const transactionQueries = {
  getAll: async () => {
    return query<Transaction>('SELECT * FROM transactions ORDER BY date DESC, id DESC');
  },

  getByAccount: async (accountId: number) => {
    return query<Transaction>(
      'SELECT * FROM transactions WHERE account_id = $1 ORDER BY date DESC, id DESC',
      [accountId]
    );
  },

  getBySymbol: async (symbol: string, accountId?: number) => {
    if (accountId) {
      return query<Transaction>(
        'SELECT * FROM transactions WHERE symbol = $1 AND account_id = $2 ORDER BY date DESC',
        [symbol.toUpperCase(), accountId]
      );
    }
    return query<Transaction>(
      'SELECT * FROM transactions WHERE symbol = $1 ORDER BY date DESC',
      [symbol.toUpperCase()]
    );
  },

  create: async (symbol: string, type: 'buy' | 'sell', shares: number, price: number, fees: number, date: string, accountId?: number) => {
    const result = await insert<Transaction>(
      'INSERT INTO transactions (symbol, type, shares, price, fees, date, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [symbol.toUpperCase(), type, shares, price, fees, date, accountId || null]
    );
    return result.id;
  },

  delete: async (id: number) => {
    await query('DELETE FROM transactions WHERE id = $1', [id]);
  },
};

// Dividend queries
export const dividendQueries = {
  getAll: async () => {
    return query<Dividend>('SELECT * FROM dividends ORDER BY ex_date DESC, id DESC');
  },

  getByAccount: async (accountId: number) => {
    return query<Dividend>(
      'SELECT * FROM dividends WHERE account_id = $1 ORDER BY ex_date DESC, id DESC',
      [accountId]
    );
  },

  getBySymbol: async (symbol: string, accountId?: number) => {
    if (accountId) {
      return query<Dividend>(
        'SELECT * FROM dividends WHERE symbol = $1 AND account_id = $2 ORDER BY ex_date DESC',
        [symbol.toUpperCase(), accountId]
      );
    }
    return query<Dividend>(
      'SELECT * FROM dividends WHERE symbol = $1 ORDER BY ex_date DESC',
      [symbol.toUpperCase()]
    );
  },

  getByYear: async (year: number, accountId?: number) => {
    if (accountId) {
      return query<Dividend>(
        "SELECT * FROM dividends WHERE EXTRACT(YEAR FROM ex_date) = $1 AND account_id = $2 ORDER BY ex_date DESC",
        [year, accountId]
      );
    }
    return query<Dividend>(
      "SELECT * FROM dividends WHERE EXTRACT(YEAR FROM ex_date) = $1 ORDER BY ex_date DESC",
      [year]
    );
  },

  create: async (
    symbol: string,
    amount: number,
    sharesHeld: number,
    exDate: string,
    payDate: string | null,
    taxRate: number,
    taxAmount: number,
    netAmount: number,
    accountId?: number
  ) => {
    const result = await insert<Dividend>(
      'INSERT INTO dividends (symbol, amount, shares_held, ex_date, pay_date, tax_rate, tax_amount, net_amount, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [symbol.toUpperCase(), amount, sharesHeld, exDate, payDate, taxRate, taxAmount, netAmount, accountId || null]
    );
    return result.id;
  },

  delete: async (id: number) => {
    await query('DELETE FROM dividends WHERE id = $1', [id]);
  },

  getTaxSummary: async (year?: number, accountId?: number) => {
    let whereClause = '';
    const params: (number)[] = [];
    let paramIndex = 1;

    if (year && accountId) {
      whereClause = `WHERE EXTRACT(YEAR FROM COALESCE(pay_date, ex_date)) = $${paramIndex++} AND account_id = $${paramIndex++}`;
      params.push(year, accountId);
    } else if (year) {
      whereClause = `WHERE EXTRACT(YEAR FROM COALESCE(pay_date, ex_date)) = $${paramIndex++}`;
      params.push(year);
    } else if (accountId) {
      whereClause = `WHERE account_id = $${paramIndex++}`;
      params.push(accountId);
    }

    const sql = `
      SELECT
        EXTRACT(YEAR FROM COALESCE(pay_date, ex_date))::text as year,
        SUM(amount) as total_gross,
        SUM(tax_amount) as total_tax,
        SUM(net_amount) as total_net,
        COUNT(*) as dividend_count
      FROM dividends
      ${whereClause}
      GROUP BY EXTRACT(YEAR FROM COALESCE(pay_date, ex_date))
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

// Settings queries
export const settingsQueries = {
  get: async (key: string) => {
    const result = await queryOne<{ value: string }>('SELECT value FROM settings WHERE key = $1', [key]);
    return result?.value;
  },

  set: async (key: string, value: string) => {
    await query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, value]
    );
  },

  getDividendTaxRate: async () => {
    const rate = await settingsQueries.get('dividend_tax_rate');
    return rate ? parseFloat(rate) : 0.08;
  },

  getMainCurrency: async (): Promise<Currency> => {
    const currency = await settingsQueries.get('main_currency');
    return (currency as Currency) || 'ALL';
  },

  getSidebarCollapsed: async () => {
    const collapsed = await settingsQueries.get('sidebar_collapsed');
    return collapsed === '1';
  },
};
