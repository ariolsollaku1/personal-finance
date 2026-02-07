import type pg from 'pg';

/**
 * Migration 008: Add ON DELETE SET NULL to payee_id and category_id foreign keys
 *
 * The FK constraints on account_transactions and recurring_transactions for
 * payee_id and category_id have no ON DELETE action. Deleting a payee or
 * category leaves orphaned references. This migration recreates the constraints
 * with ON DELETE SET NULL.
 */

export const version = 8;
export const description = 'Add ON DELETE SET NULL to payee_id and category_id foreign keys';

export async function up(client: pg.PoolClient): Promise<void> {
  // Drop existing FK constraints and recreate with ON DELETE SET NULL
  // PostgreSQL names auto-generated FKs as: {table}_{column}_fkey

  // account_transactions.payee_id
  await client.query(`
    ALTER TABLE account_transactions
    DROP CONSTRAINT IF EXISTS account_transactions_payee_id_fkey
  `);
  await client.query(`
    ALTER TABLE account_transactions
    ADD CONSTRAINT account_transactions_payee_id_fkey
    FOREIGN KEY (payee_id) REFERENCES payees(id) ON DELETE SET NULL
  `);

  // account_transactions.category_id
  await client.query(`
    ALTER TABLE account_transactions
    DROP CONSTRAINT IF EXISTS account_transactions_category_id_fkey
  `);
  await client.query(`
    ALTER TABLE account_transactions
    ADD CONSTRAINT account_transactions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  `);

  // recurring_transactions.payee_id
  await client.query(`
    ALTER TABLE recurring_transactions
    DROP CONSTRAINT IF EXISTS recurring_transactions_payee_id_fkey
  `);
  await client.query(`
    ALTER TABLE recurring_transactions
    ADD CONSTRAINT recurring_transactions_payee_id_fkey
    FOREIGN KEY (payee_id) REFERENCES payees(id) ON DELETE SET NULL
  `);

  // recurring_transactions.category_id
  await client.query(`
    ALTER TABLE recurring_transactions
    DROP CONSTRAINT IF EXISTS recurring_transactions_category_id_fkey
  `);
  await client.query(`
    ALTER TABLE recurring_transactions
    ADD CONSTRAINT recurring_transactions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  `);

  console.log('Updated FK constraints with ON DELETE SET NULL for payee_id and category_id');
}

export async function down(client: pg.PoolClient): Promise<void> {
  // Revert to FK constraints without ON DELETE action

  // account_transactions.payee_id
  await client.query(`
    ALTER TABLE account_transactions
    DROP CONSTRAINT IF EXISTS account_transactions_payee_id_fkey
  `);
  await client.query(`
    ALTER TABLE account_transactions
    ADD CONSTRAINT account_transactions_payee_id_fkey
    FOREIGN KEY (payee_id) REFERENCES payees(id)
  `);

  // account_transactions.category_id
  await client.query(`
    ALTER TABLE account_transactions
    DROP CONSTRAINT IF EXISTS account_transactions_category_id_fkey
  `);
  await client.query(`
    ALTER TABLE account_transactions
    ADD CONSTRAINT account_transactions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id)
  `);

  // recurring_transactions.payee_id
  await client.query(`
    ALTER TABLE recurring_transactions
    DROP CONSTRAINT IF EXISTS recurring_transactions_payee_id_fkey
  `);
  await client.query(`
    ALTER TABLE recurring_transactions
    ADD CONSTRAINT recurring_transactions_payee_id_fkey
    FOREIGN KEY (payee_id) REFERENCES payees(id)
  `);

  // recurring_transactions.category_id
  await client.query(`
    ALTER TABLE recurring_transactions
    DROP CONSTRAINT IF EXISTS recurring_transactions_category_id_fkey
  `);
  await client.query(`
    ALTER TABLE recurring_transactions
    ADD CONSTRAINT recurring_transactions_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES categories(id)
  `);

  console.log('Reverted FK constraints to original (no ON DELETE action)');
}
