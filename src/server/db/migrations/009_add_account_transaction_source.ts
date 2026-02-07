import type pg from 'pg';

/**
 * Migration 009: Add source column to account_transactions
 *
 * Replaces fragile string-based detection (notes starting with 'Buy '/'Sell '/
 * 'Dividend:') with an explicit source column. This enables reliable filtering
 * and display without depending on note formatting.
 *
 * Values: 'manual' | 'stock_trade' | 'dividend' | 'transfer'
 */

export const version = 9;
export const description = 'Add source column to account_transactions';

export async function up(client: pg.PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE account_transactions
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
  `);

  // Backfill existing data
  await client.query(`
    UPDATE account_transactions SET source = 'transfer'
    WHERE transfer_id IS NOT NULL AND source = 'manual'
  `);
  await client.query(`
    UPDATE account_transactions SET source = 'stock_trade'
    WHERE (notes LIKE 'Buy %' OR notes LIKE 'Sell %') AND source = 'manual'
  `);
  await client.query(`
    UPDATE account_transactions SET source = 'dividend'
    WHERE notes LIKE 'Dividend:%' AND source = 'manual'
  `);

  console.log('Added source column to account_transactions and backfilled existing data');
}

export async function down(client: pg.PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE account_transactions DROP COLUMN IF EXISTS source
  `);

  console.log('Removed source column from account_transactions');
}
