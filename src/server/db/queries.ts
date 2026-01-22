import { db } from './schema.js';

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
  is_active: number;
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
  getAll: () => {
    return db.prepare('SELECT * FROM accounts ORDER BY type, name').all() as Account[];
  },

  getById: (id: number) => {
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account | undefined;
  },

  getByType: (type: AccountType) => {
    return db.prepare('SELECT * FROM accounts WHERE type = ? ORDER BY name').all(type) as Account[];
  },

  create: (name: string, type: AccountType, currency: Currency, initialBalance: number = 0) => {
    const stmt = db.prepare('INSERT INTO accounts (name, type, currency, initial_balance) VALUES (?, ?, ?, ?)');
    const result = stmt.run(name, type, currency, initialBalance);
    return result.lastInsertRowid;
  },

  update: (id: number, name: string, currency: Currency, initialBalance: number) => {
    const stmt = db.prepare('UPDATE accounts SET name = ?, currency = ?, initial_balance = ? WHERE id = ?');
    return stmt.run(name, currency, initialBalance, id);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
    return stmt.run(id);
  },

  getBalance: (id: number) => {
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account | undefined;
    if (!account) return null;

    // Calculate cash balance from transactions (for all account types including stock)
    const result = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'inflow' THEN amount ELSE -amount END), 0) as transaction_total
      FROM account_transactions
      WHERE account_id = ?
    `).get(id) as { transaction_total: number };

    return {
      account,
      balance: account.initial_balance + result.transaction_total
    };
  },
};

// Category queries
export const categoryQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM categories ORDER BY type, name').all() as Category[];
  },

  getById: (id: number) => {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
  },

  getByType: (type: 'income' | 'expense') => {
    return db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY name').all(type) as Category[];
  },

  getByName: (name: string) => {
    return db.prepare('SELECT * FROM categories WHERE name = ?').get(name) as Category | undefined;
  },

  create: (name: string, type: 'income' | 'expense' = 'expense') => {
    const stmt = db.prepare('INSERT INTO categories (name, type) VALUES (?, ?)');
    const result = stmt.run(name, type);
    return result.lastInsertRowid;
  },

  getOrCreate: (name: string, type: 'income' | 'expense' = 'expense') => {
    const existing = categoryQueries.getByName(name);
    if (existing) return existing.id;
    return categoryQueries.create(name, type);
  },

  update: (id: number, name: string) => {
    const stmt = db.prepare('UPDATE categories SET name = ? WHERE id = ?');
    return stmt.run(name, id);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    return stmt.run(id);
  },
};

// Payee queries
export const payeeQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM payees ORDER BY name').all() as Payee[];
  },

  getById: (id: number) => {
    return db.prepare('SELECT * FROM payees WHERE id = ?').get(id) as Payee | undefined;
  },

  getByName: (name: string) => {
    return db.prepare('SELECT * FROM payees WHERE name = ?').get(name) as Payee | undefined;
  },

  search: (query: string, limit: number = 10) => {
    return db.prepare('SELECT * FROM payees WHERE name LIKE ? ORDER BY name LIMIT ?').all(`%${query}%`, limit) as Payee[];
  },

  create: (name: string) => {
    const stmt = db.prepare('INSERT INTO payees (name) VALUES (?)');
    const result = stmt.run(name);
    return result.lastInsertRowid;
  },

  getOrCreate: (name: string) => {
    const existing = payeeQueries.getByName(name);
    if (existing) return existing.id;
    return payeeQueries.create(name);
  },

  update: (id: number, name: string) => {
    const stmt = db.prepare('UPDATE payees SET name = ? WHERE id = ?');
    return stmt.run(name, id);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM payees WHERE id = ?');
    return stmt.run(id);
  },

  merge: (sourceId: number, targetId: number) => {
    // Update all references to use target payee
    db.prepare('UPDATE account_transactions SET payee_id = ? WHERE payee_id = ?').run(targetId, sourceId);
    db.prepare('UPDATE recurring_transactions SET payee_id = ? WHERE payee_id = ?').run(targetId, sourceId);
    // Delete the source payee
    return db.prepare('DELETE FROM payees WHERE id = ?').run(sourceId);
  },
};

// Account Transaction queries (bank/cash transactions)
export const accountTransactionQueries = {
  getByAccount: (accountId: number) => {
    return db.prepare(`
      SELECT
        at.*,
        p.name as payee_name,
        c.name as category_name
      FROM account_transactions at
      LEFT JOIN payees p ON at.payee_id = p.id
      LEFT JOIN categories c ON at.category_id = c.id
      WHERE at.account_id = ?
      ORDER BY at.date DESC, at.id DESC
    `).all(accountId) as AccountTransaction[];
  },

  getById: (id: number) => {
    return db.prepare(`
      SELECT
        at.*,
        p.name as payee_name,
        c.name as category_name
      FROM account_transactions at
      LEFT JOIN payees p ON at.payee_id = p.id
      LEFT JOIN categories c ON at.category_id = c.id
      WHERE at.id = ?
    `).get(id) as AccountTransaction | undefined;
  },

  create: (
    accountId: number,
    type: TransactionType,
    amount: number,
    date: string,
    payeeId: number | null = null,
    categoryId: number | null = null,
    notes: string | null = null,
    transferId: number | null = null
  ) => {
    const stmt = db.prepare(`
      INSERT INTO account_transactions (account_id, type, amount, date, payee_id, category_id, notes, transfer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(accountId, type, amount, date, payeeId, categoryId, notes, transferId);
    return result.lastInsertRowid;
  },

  update: (
    id: number,
    type: TransactionType,
    amount: number,
    date: string,
    payeeId: number | null,
    categoryId: number | null,
    notes: string | null
  ) => {
    const stmt = db.prepare(`
      UPDATE account_transactions
      SET type = ?, amount = ?, date = ?, payee_id = ?, category_id = ?, notes = ?
      WHERE id = ?
    `);
    return stmt.run(type, amount, date, payeeId, categoryId, notes, id);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM account_transactions WHERE id = ?');
    return stmt.run(id);
  },

  getByTransferId: (transferId: number) => {
    return db.prepare('SELECT * FROM account_transactions WHERE transfer_id = ?').all(transferId) as AccountTransaction[];
  },
};

// Recurring Transaction queries
export const recurringQueries = {
  getByAccount: (accountId: number) => {
    return db.prepare(`
      SELECT
        rt.*,
        p.name as payee_name,
        c.name as category_name
      FROM recurring_transactions rt
      LEFT JOIN payees p ON rt.payee_id = p.id
      LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.account_id = ?
      ORDER BY rt.next_due_date ASC
    `).all(accountId) as RecurringTransaction[];
  },

  getActiveCountsByAccount: (accountId: number) => {
    return db.prepare(`
      SELECT
        SUM(CASE WHEN type = 'inflow' THEN 1 ELSE 0 END) as inflow_count,
        SUM(CASE WHEN type = 'outflow' THEN 1 ELSE 0 END) as outflow_count
      FROM recurring_transactions
      WHERE account_id = ? AND is_active = 1
    `).get(accountId) as { inflow_count: number; outflow_count: number };
  },

  getById: (id: number) => {
    return db.prepare(`
      SELECT
        rt.*,
        p.name as payee_name,
        c.name as category_name
      FROM recurring_transactions rt
      LEFT JOIN payees p ON rt.payee_id = p.id
      LEFT JOIN categories c ON rt.category_id = c.id
      WHERE rt.id = ?
    `).get(id) as RecurringTransaction | undefined;
  },

  getDue: (beforeDate: string) => {
    return db.prepare(`
      SELECT
        rt.*,
        p.name as payee_name,
        c.name as category_name,
        a.name as account_name,
        a.currency as account_currency
      FROM recurring_transactions rt
      LEFT JOIN payees p ON rt.payee_id = p.id
      LEFT JOIN categories c ON rt.category_id = c.id
      LEFT JOIN accounts a ON rt.account_id = a.id
      WHERE rt.is_active = 1 AND rt.next_due_date <= ?
      ORDER BY rt.next_due_date ASC
    `).all(beforeDate) as (RecurringTransaction & { account_name: string; account_currency: Currency })[];
  },

  create: (
    accountId: number,
    type: TransactionType,
    amount: number,
    payeeId: number | null,
    categoryId: number | null,
    notes: string | null,
    frequency: Frequency,
    nextDueDate: string
  ) => {
    const stmt = db.prepare(`
      INSERT INTO recurring_transactions (account_id, type, amount, payee_id, category_id, notes, frequency, next_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(accountId, type, amount, payeeId, categoryId, notes, frequency, nextDueDate);
    return result.lastInsertRowid;
  },

  update: (
    id: number,
    type: TransactionType,
    amount: number,
    payeeId: number | null,
    categoryId: number | null,
    notes: string | null,
    frequency: Frequency,
    nextDueDate: string,
    isActive: number
  ) => {
    const stmt = db.prepare(`
      UPDATE recurring_transactions
      SET type = ?, amount = ?, payee_id = ?, category_id = ?, notes = ?, frequency = ?, next_due_date = ?, is_active = ?
      WHERE id = ?
    `);
    return stmt.run(type, amount, payeeId, categoryId, notes, frequency, nextDueDate, isActive, id);
  },

  updateNextDueDate: (id: number, nextDueDate: string) => {
    const stmt = db.prepare('UPDATE recurring_transactions SET next_due_date = ? WHERE id = ?');
    return stmt.run(nextDueDate, id);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM recurring_transactions WHERE id = ?');
    return stmt.run(id);
  },
};

// Transfer queries
export const transferQueries = {
  getAll: () => {
    return db.prepare(`
      SELECT
        t.*,
        fa.name as from_account_name,
        ta.name as to_account_name,
        fa.currency as from_account_currency,
        ta.currency as to_account_currency
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      JOIN accounts ta ON t.to_account_id = ta.id
      ORDER BY t.date DESC, t.id DESC
    `).all() as Transfer[];
  },

  getById: (id: number) => {
    return db.prepare(`
      SELECT
        t.*,
        fa.name as from_account_name,
        ta.name as to_account_name,
        fa.currency as from_account_currency,
        ta.currency as to_account_currency
      FROM transfers t
      JOIN accounts fa ON t.from_account_id = fa.id
      JOIN accounts ta ON t.to_account_id = ta.id
      WHERE t.id = ?
    `).get(id) as Transfer | undefined;
  },

  create: (
    fromAccountId: number,
    toAccountId: number,
    fromAmount: number,
    toAmount: number,
    date: string,
    notes: string | null = null
  ) => {
    // Create the transfer record
    const stmt = db.prepare(`
      INSERT INTO transfers (from_account_id, to_account_id, from_amount, to_amount, date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(fromAccountId, toAccountId, fromAmount, toAmount, date, notes);
    const transferId = result.lastInsertRowid as number;

    // Create the linked account transactions
    accountTransactionQueries.create(fromAccountId, 'outflow', fromAmount, date, null, null, notes ? `Transfer: ${notes}` : 'Transfer', transferId);
    accountTransactionQueries.create(toAccountId, 'inflow', toAmount, date, null, null, notes ? `Transfer: ${notes}` : 'Transfer', transferId);

    return transferId;
  },

  delete: (id: number) => {
    // Delete linked transactions first
    db.prepare('DELETE FROM account_transactions WHERE transfer_id = ?').run(id);
    // Delete the transfer
    const stmt = db.prepare('DELETE FROM transfers WHERE id = ?');
    return stmt.run(id);
  },
};

// Holdings queries
export const holdingsQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM holdings ORDER BY symbol').all() as Holding[];
  },

  getByAccount: (accountId: number) => {
    return db.prepare('SELECT * FROM holdings WHERE account_id = ? ORDER BY symbol').all(accountId) as Holding[];
  },

  getBySymbol: (symbol: string, accountId?: number) => {
    if (accountId) {
      return db.prepare('SELECT * FROM holdings WHERE symbol = ? AND account_id = ?').get(symbol.toUpperCase(), accountId) as Holding | undefined;
    }
    return db.prepare('SELECT * FROM holdings WHERE symbol = ?').get(symbol.toUpperCase()) as Holding | undefined;
  },

  create: (symbol: string, shares: number, avgCost: number, accountId?: number) => {
    const stmt = db.prepare('INSERT INTO holdings (symbol, shares, avg_cost, account_id) VALUES (?, ?, ?, ?)');
    const result = stmt.run(symbol.toUpperCase(), shares, avgCost, accountId || null);
    return result.lastInsertRowid;
  },

  update: (id: number, shares: number, avgCost: number) => {
    const stmt = db.prepare('UPDATE holdings SET shares = ?, avg_cost = ? WHERE id = ?');
    return stmt.run(shares, avgCost, id);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM holdings WHERE id = ?');
    return stmt.run(id);
  },

  deleteBySymbol: (symbol: string, accountId?: number) => {
    if (accountId) {
      const stmt = db.prepare('DELETE FROM holdings WHERE symbol = ? AND account_id = ?');
      return stmt.run(symbol.toUpperCase(), accountId);
    }
    const stmt = db.prepare('DELETE FROM holdings WHERE symbol = ?');
    return stmt.run(symbol.toUpperCase());
  },
};

// Transaction queries (stock transactions)
export const transactionQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM transactions ORDER BY date DESC, id DESC').all() as Transaction[];
  },

  getByAccount: (accountId: number) => {
    return db.prepare('SELECT * FROM transactions WHERE account_id = ? ORDER BY date DESC, id DESC').all(accountId) as Transaction[];
  },

  getBySymbol: (symbol: string, accountId?: number) => {
    if (accountId) {
      return db.prepare('SELECT * FROM transactions WHERE symbol = ? AND account_id = ? ORDER BY date DESC').all(symbol.toUpperCase(), accountId) as Transaction[];
    }
    return db.prepare('SELECT * FROM transactions WHERE symbol = ? ORDER BY date DESC').all(symbol.toUpperCase()) as Transaction[];
  },

  create: (symbol: string, type: 'buy' | 'sell', shares: number, price: number, fees: number, date: string, accountId?: number) => {
    const stmt = db.prepare(
      'INSERT INTO transactions (symbol, type, shares, price, fees, date, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(symbol.toUpperCase(), type, shares, price, fees, date, accountId || null);
    return result.lastInsertRowid;
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    return stmt.run(id);
  },
};

// Dividend queries
export const dividendQueries = {
  getAll: () => {
    return db.prepare('SELECT * FROM dividends ORDER BY ex_date DESC, id DESC').all() as Dividend[];
  },

  getByAccount: (accountId: number) => {
    return db.prepare('SELECT * FROM dividends WHERE account_id = ? ORDER BY ex_date DESC, id DESC').all(accountId) as Dividend[];
  },

  getBySymbol: (symbol: string, accountId?: number) => {
    if (accountId) {
      return db.prepare('SELECT * FROM dividends WHERE symbol = ? AND account_id = ? ORDER BY ex_date DESC').all(symbol.toUpperCase(), accountId) as Dividend[];
    }
    return db.prepare('SELECT * FROM dividends WHERE symbol = ? ORDER BY ex_date DESC').all(symbol.toUpperCase()) as Dividend[];
  },

  getByYear: (year: number, accountId?: number) => {
    if (accountId) {
      return db.prepare('SELECT * FROM dividends WHERE strftime("%Y", ex_date) = ? AND account_id = ? ORDER BY ex_date DESC').all(year.toString(), accountId) as Dividend[];
    }
    return db.prepare('SELECT * FROM dividends WHERE strftime("%Y", ex_date) = ? ORDER BY ex_date DESC').all(year.toString()) as Dividend[];
  },

  create: (
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
    const stmt = db.prepare(
      'INSERT INTO dividends (symbol, amount, shares_held, ex_date, pay_date, tax_rate, tax_amount, net_amount, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(symbol.toUpperCase(), amount, sharesHeld, exDate, payDate, taxRate, taxAmount, netAmount, accountId || null);
    return result.lastInsertRowid;
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM dividends WHERE id = ?');
    return stmt.run(id);
  },

  getTaxSummary: (year?: number, accountId?: number) => {
    let whereClause = '';
    const params: (string | number)[] = [];

    // Use pay_date for yearly grouping (fall back to ex_date if pay_date is null)
    if (year && accountId) {
      whereClause = "WHERE strftime('%Y', COALESCE(pay_date, ex_date)) = ? AND account_id = ?";
      params.push(year.toString(), accountId);
    } else if (year) {
      whereClause = "WHERE strftime('%Y', COALESCE(pay_date, ex_date)) = ?";
      params.push(year.toString());
    } else if (accountId) {
      whereClause = 'WHERE account_id = ?';
      params.push(accountId);
    }

    const query = `
      SELECT
        strftime('%Y', COALESCE(pay_date, ex_date)) as year,
        SUM(amount) as total_gross,
        SUM(tax_amount) as total_tax,
        SUM(net_amount) as total_net,
        COUNT(*) as dividend_count
      FROM dividends
      ${whereClause}
      GROUP BY strftime('%Y', COALESCE(pay_date, ex_date))
      ORDER BY year DESC
    `;

    return db.prepare(query).all(...params) as {
      year: string;
      total_gross: number;
      total_tax: number;
      total_net: number;
      dividend_count: number;
    }[];
  },
};

// Settings queries
export const settingsQueries = {
  get: (key: string) => {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return result?.value;
  },

  set: (key: string, value: string) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    return stmt.run(key, value);
  },

  getDividendTaxRate: () => {
    const rate = settingsQueries.get('dividend_tax_rate');
    return rate ? parseFloat(rate) : 0.08; // Default 8% Albanian dividend tax
  },

  getMainCurrency: (): Currency => {
    const currency = settingsQueries.get('main_currency');
    return (currency as Currency) || 'ALL';
  },

  getSidebarCollapsed: () => {
    const collapsed = settingsQueries.get('sidebar_collapsed');
    return collapsed === '1';
  },
};
