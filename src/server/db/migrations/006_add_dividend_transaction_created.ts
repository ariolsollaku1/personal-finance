import type pg from 'pg';

/**
 * Migration 006: Add transaction_created flag to dividends
 *
 * Tracks whether the account inflow transaction has been created for a dividend.
 * This allows the dividend check to create missing account transactions for
 * dividends whose payment date has since passed.
 */

export const version = 6;
export const description = 'Add transaction_created flag to dividends';

export async function up(client: pg.PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE dividends
    ADD COLUMN IF NOT EXISTS transaction_created BOOLEAN DEFAULT FALSE
  `);

  // Mark existing dividends with pay_date in the past as transaction_created = true
  // (assume they were already processed)
  await client.query(`
    UPDATE dividends SET transaction_created = TRUE WHERE pay_date <= CURRENT_DATE
  `);

  console.log('Added transaction_created column to dividends');
}

export async function down(client: pg.PoolClient): Promise<void> {
  await client.query('ALTER TABLE dividends DROP COLUMN IF EXISTS transaction_created');
  console.log('Removed transaction_created column from dividends');
}
