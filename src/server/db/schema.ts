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
  ssl: {
    rejectUnauthorized: false,
  },
});

// Default categories to seed
const DEFAULT_CATEGORIES = [
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
        name TEXT NOT NULL,
        type account_type NOT NULL,
        currency currency NOT NULL,
        initial_balance DECIMAL(15,2) DEFAULT 0,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories: income/expense types
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type category_type DEFAULT 'expense',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payees: global, shared across accounts
    await client.query(`
      CREATE TABLE IF NOT EXISTS payees (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
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
        from_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        to_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        from_amount DECIMAL(15,2) NOT NULL,
        to_amount DECIMAL(15,2) NOT NULL,
        date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
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

    // Settings: user preferences
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Set default settings if not exists
    await client.query(`
      INSERT INTO settings (key, value) VALUES ('dividend_tax_rate', '0.08')
      ON CONFLICT (key) DO NOTHING
    `);
    await client.query(`
      INSERT INTO settings (key, value) VALUES ('main_currency', 'ALL')
      ON CONFLICT (key) DO NOTHING
    `);
    await client.query(`
      INSERT INTO settings (key, value) VALUES ('sidebar_collapsed', '0')
      ON CONFLICT (key) DO NOTHING
    `);

    // Seed default categories
    await seedCategories(client);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

async function seedCategories(client: pg.PoolClient) {
  const result = await client.query('SELECT COUNT(*) as count FROM categories');
  const count = parseInt(result.rows[0].count);

  if (count === 0) {
    console.log('Seeding default categories...');
    for (const category of DEFAULT_CATEGORIES) {
      await client.query(
        'INSERT INTO categories (name, type) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [category.name, category.type]
      );
    }
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
