import type pg from 'pg';

/**
 * Migration 005: Add unique constraint on dividends (account_id, symbol, ex_date)
 *
 * Prevents duplicate dividend records from being created when checking dividends.
 * Also cleans up any existing duplicates, keeping only the oldest record.
 */

export const version = 5;
export const description = 'Add unique constraint on dividends (account_id, symbol, ex_date) and remove duplicates';

export async function up(client: pg.PoolClient): Promise<void> {
  // Delete duplicate dividends, keeping the one with the lowest id
  const { rowCount } = await client.query(`
    DELETE FROM dividends
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM dividends
      GROUP BY account_id, symbol, ex_date
    )
  `);
  if (rowCount && rowCount > 0) {
    console.log(`Removed ${rowCount} duplicate dividend records`);
  }

  // Add unique constraint
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_dividends_unique_per_exdate
    ON dividends (account_id, symbol, ex_date)
  `);

  console.log('Added unique constraint on dividends (account_id, symbol, ex_date)');
}

export async function down(client: pg.PoolClient): Promise<void> {
  await client.query('DROP INDEX IF EXISTS idx_dividends_unique_per_exdate');
  console.log('Removed unique constraint on dividends');
}
