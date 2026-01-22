import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../../data');
const dbPath = path.join(dataDir, 'portfolio.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);

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

export function initDatabase() {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Accounts: central entity for all account types
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('stock', 'bank', 'cash')),
      currency TEXT NOT NULL CHECK(currency IN ('EUR', 'USD', 'ALL')),
      initial_balance REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories: income/expense types
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'expense' CHECK(type IN ('income', 'expense')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Payees: global, shared across accounts
  db.exec(`
    CREATE TABLE IF NOT EXISTS payees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Holdings: current stock positions (add account_id)
  db.exec(`
    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      shares REAL NOT NULL,
      avg_cost REAL NOT NULL,
      account_id INTEGER REFERENCES accounts(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(symbol, account_id)
    )
  `);

  // Transactions: stock buy/sell history (add account_id)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
      shares REAL NOT NULL,
      price REAL NOT NULL,
      fees REAL DEFAULT 0,
      date TEXT NOT NULL,
      account_id INTEGER REFERENCES accounts(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Dividends: dividend payments received (add account_id)
  db.exec(`
    CREATE TABLE IF NOT EXISTS dividends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      amount REAL NOT NULL,
      shares_held REAL NOT NULL,
      ex_date TEXT NOT NULL,
      pay_date TEXT,
      tax_rate REAL NOT NULL,
      tax_amount REAL NOT NULL,
      net_amount REAL NOT NULL,
      account_id INTEGER REFERENCES accounts(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Account Transactions: for bank/cash accounts (NOT stock transactions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('inflow', 'outflow')),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      payee_id INTEGER REFERENCES payees(id),
      category_id INTEGER REFERENCES categories(id),
      notes TEXT,
      transfer_id INTEGER REFERENCES transfers(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Recurring Transactions
  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('inflow', 'outflow')),
      amount REAL NOT NULL,
      payee_id INTEGER REFERENCES payees(id),
      category_id INTEGER REFERENCES categories(id),
      notes TEXT,
      frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
      next_due_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Transfers: links two account_transactions
  db.exec(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_account_id INTEGER NOT NULL REFERENCES accounts(id),
      to_account_id INTEGER NOT NULL REFERENCES accounts(id),
      from_amount REAL NOT NULL,
      to_amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Settings: user preferences
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Run migrations for existing data
  runMigrations();

  // Set default settings if not exists
  const settingsStmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  settingsStmt.run('dividend_tax_rate', '0.08');
  settingsStmt.run('main_currency', 'ALL');
  settingsStmt.run('sidebar_collapsed', '0');

  // Seed default categories
  seedCategories();

  console.log('Database initialized successfully');
}

function runMigrations() {
  // Check if we need to add account_id columns to existing tables
  const holdingsInfo = db.prepare("PRAGMA table_info(holdings)").all() as { name: string }[];
  const hasAccountId = holdingsInfo.some(col => col.name === 'account_id');

  if (!hasAccountId) {
    console.log('Running migration: Adding account_id to existing tables...');

    // Add account_id columns to existing tables
    try {
      db.exec('ALTER TABLE holdings ADD COLUMN account_id INTEGER REFERENCES accounts(id)');
    } catch (e) {
      // Column might already exist
    }
    try {
      db.exec('ALTER TABLE transactions ADD COLUMN account_id INTEGER REFERENCES accounts(id)');
    } catch (e) {
      // Column might already exist
    }
    try {
      db.exec('ALTER TABLE dividends ADD COLUMN account_id INTEGER REFERENCES accounts(id)');
    } catch (e) {
      // Column might already exist
    }
  }

  // Check if holdings has symbol UNIQUE constraint without account_id
  // We need symbol+account_id to be unique, not just symbol
  // For existing data, we'll handle this at the application level

  // Check if there's existing data without account_id and create default account
  const existingHoldings = db.prepare('SELECT COUNT(*) as count FROM holdings WHERE account_id IS NULL').get() as { count: number };
  const existingTransactions = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE account_id IS NULL').get() as { count: number };
  const existingDividends = db.prepare('SELECT COUNT(*) as count FROM dividends WHERE account_id IS NULL').get() as { count: number };

  if (existingHoldings.count > 0 || existingTransactions.count > 0 || existingDividends.count > 0) {
    console.log('Migrating existing data to default account...');

    // Check if default account already exists
    let defaultAccount = db.prepare("SELECT id FROM accounts WHERE name = 'My Portfolio' AND type = 'stock'").get() as { id: number } | undefined;

    if (!defaultAccount) {
      // Create default stock account
      db.prepare("INSERT INTO accounts (name, type, currency, initial_balance) VALUES ('My Portfolio', 'stock', 'USD', 0)").run();
      defaultAccount = db.prepare("SELECT id FROM accounts WHERE name = 'My Portfolio' AND type = 'stock'").get() as { id: number };
    }

    const accountId = defaultAccount.id;

    // Update existing records with default account_id
    db.prepare('UPDATE holdings SET account_id = ? WHERE account_id IS NULL').run(accountId);
    db.prepare('UPDATE transactions SET account_id = ? WHERE account_id IS NULL').run(accountId);
    db.prepare('UPDATE dividends SET account_id = ? WHERE account_id IS NULL').run(accountId);

    console.log(`Migrated existing data to account ID: ${accountId}`);
  }
}

function seedCategories() {
  const existingCount = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }).count;

  if (existingCount === 0) {
    console.log('Seeding default categories...');
    const stmt = db.prepare('INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)');

    for (const category of DEFAULT_CATEGORIES) {
      stmt.run(category.name, category.type);
    }
  }
}
