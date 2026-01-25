import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create connection pool
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Default categories to seed for new users
export const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income' },
  { name: 'Investment Income', type: 'income' },
  { name: 'Other Income', type: 'income' },
  { name: 'Groceries', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Rent', type: 'expense' },
  { name: 'Transportation', type: 'expense' },
  { name: 'Dining Out', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Healthcare', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Insurance', type: 'expense' },
  { name: 'Education', type: 'expense' },
  { name: 'Personal Care', type: 'expense' },
  { name: 'Gifts', type: 'expense' },
  { name: 'Travel', type: 'expense' },
  { name: 'Subscriptions', type: 'expense' },
  { name: 'Other Expenses', type: 'expense' },
];


export async function initDatabase() {
  const client = await pool.connect();

  try {
    // Create account_type enum if not exists
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE account_type AS ENUM ('stock', 'bank', 'cash', 'loan', 'credit', 'asset');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create currency enum if not exists
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE currency AS ENUM ('EUR', 'USD', 'ALL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create transaction_type enum if not exists
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE transaction_type AS ENUM ('inflow', 'outflow');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create stock_transaction_type enum if not exists
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE stock_transaction_type AS ENUM ('buy', 'sell');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create frequency enum if not exists
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'yearly');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create category_type enum if not exists
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE category_type AS ENUM ('income', 'expense');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Accounts: central entity for all account types
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        name TEXT NOT NULL,
        type account_type NOT NULL,
        currency currency NOT NULL,
        initial_balance DECIMAL(15,2) DEFAULT 0,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add user_id column if it doesn't exist (migration for existing tables)
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id UUID;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Create index on user_id for accounts
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
    `);

    // Categories: income/expense types
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        name TEXT NOT NULL,
        type category_type DEFAULT 'expense',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `);

    // Migration: add user_id column if it doesn't exist
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Create index on user_id for categories
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    `);

    // Payees: per-user
    await client.query(`
      CREATE TABLE IF NOT EXISTS payees (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `);

    // Migration: add user_id column if it doesn't exist
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE payees ADD COLUMN IF NOT EXISTS user_id UUID;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Create index on user_id for payees
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payees_user_id ON payees(user_id);
    `);

    // Holdings: current stock positions
    await client.query(`
      CREATE TABLE IF NOT EXISTS holdings (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        shares DECIMAL(15,6) NOT NULL,
        avg_cost DECIMAL(15,6) NOT NULL,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(symbol, account_id)
      )
    `);

    // Transactions: stock buy/sell history
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        type stock_transaction_type NOT NULL,
        shares DECIMAL(15,6) NOT NULL,
        price DECIMAL(15,6) NOT NULL,
        fees DECIMAL(15,2) DEFAULT 0,
        date DATE NOT NULL,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Dividends: dividend payments received
    await client.query(`
      CREATE TABLE IF NOT EXISTS dividends (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        shares_held DECIMAL(15,6) NOT NULL,
        ex_date DATE NOT NULL,
        pay_date DATE,
        tax_rate DECIMAL(5,4) NOT NULL,
        tax_amount DECIMAL(15,2) NOT NULL,
        net_amount DECIMAL(15,2) NOT NULL,
        account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Transfers: links two account_transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        from_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        to_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        from_amount DECIMAL(15,2) NOT NULL,
        to_amount DECIMAL(15,2) NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration: add user_id column to transfers if it doesn't exist
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE transfers ADD COLUMN IF NOT EXISTS user_id UUID;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Create index on user_id for transfers
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
    `);

    // Account Transactions: for bank/cash accounts (NOT stock transactions)
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_transactions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        type transaction_type NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        date DATE NOT NULL,
        payee_id INTEGER REFERENCES payees(id),
        category_id INTEGER REFERENCES categories(id),
        notes TEXT,
        transfer_id INTEGER REFERENCES transfers(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Recurring Transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS recurring_transactions (
        id SERIAL PRIMARY KEY,
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        type transaction_type NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        payee_id INTEGER REFERENCES payees(id),
        category_id INTEGER REFERENCES categories(id),
        notes TEXT,
        frequency frequency NOT NULL,
        next_due_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User Settings: per-user preferences
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id UUID NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (user_id, key)
      )
    `);

    // Legacy settings table (kept for migration, can be removed later)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // ===========================================
    // Performance indexes for foreign keys
    // ===========================================

    // Index on account_transactions for fast lookups by account
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions(account_id);
    `);

    // Index on account_transactions for date-based queries (P&L, reports)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_account_transactions_date ON account_transactions(date);
    `);

    // Index on holdings for fast lookups by account
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_holdings_account_id ON holdings(account_id);
    `);

    // Index on recurring_transactions for fast lookups by account
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_recurring_transactions_account_id ON recurring_transactions(account_id);
    `);

    // Index on dividends for fast lookups by account
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dividends_account_id ON dividends(account_id);
    `);

    // Indexes on transfers for fast lookups by from/to account
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_from_account ON transfers(from_account_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_to_account ON transfers(to_account_id);
    `);

    // Index on stock transactions for fast lookups by account
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
    `);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

// Helper function to run queries
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Helper function to run a query and get single row
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | undefined> {
  const result = await pool.query(text, params);
  return result.rows[0] as T | undefined;
}

// Helper function to run insert and return the inserted row
export async function insert<T = any>(text: string, params?: any[]): Promise<T> {
  const result = await pool.query(text, params);
  return result.rows[0] as T;
}
