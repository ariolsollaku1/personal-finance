import type pg from 'pg';

/**
 * Migration 003: Add account archived_at column
 *
 * Adds soft delete functionality to accounts via an archived_at timestamp.
 * Archived accounts are hidden from normal queries but can be restored.
 */

export const version = 3;
export const description = 'Add archived_at column to accounts for soft delete';

export async function up(client: pg.PoolClient): Promise<void> {
  // Add archived_at column (NULL = not archived)
  await client.query(`
    ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT NULL
  `);

  // Create partial index for efficient filtering of non-archived accounts
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_accounts_archived_at
    ON accounts (archived_at)
    WHERE archived_at IS NULL
  `);

  console.log('Added archived_at column and index to accounts table');
}

export async function down(client: pg.PoolClient): Promise<void> {
  await client.query('DROP INDEX IF EXISTS idx_accounts_archived_at');
  await client.query('ALTER TABLE accounts DROP COLUMN IF EXISTS archived_at');
  console.log('Removed archived_at column and index from accounts table');
}
