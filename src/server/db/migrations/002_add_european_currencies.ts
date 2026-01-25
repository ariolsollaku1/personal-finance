import type pg from 'pg';

/**
 * Migration 002: Add European Currencies
 *
 * Adds support for 10 new European currencies:
 * GBP, CHF, NOK, SEK, DKK, PLN, CZK, HUF, RON, BGN
 */

export const version = 2;
export const description = 'Add European currencies (GBP, CHF, NOK, SEK, DKK, PLN, CZK, HUF, RON, BGN)';

const NEW_CURRENCIES = ['GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN'];

export async function up(client: pg.PoolClient): Promise<void> {
  // Add each new currency value to the currency enum
  for (const currency of NEW_CURRENCIES) {
    await client.query(`
      DO $$ BEGIN
        ALTER TYPE currency ADD VALUE IF NOT EXISTS '${currency}';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  console.log(`Added ${NEW_CURRENCIES.length} new currency values to enum`);
}

export async function down(client: pg.PoolClient): Promise<void> {
  // Note: PostgreSQL doesn't support removing enum values directly.
  // To fully roll back, you would need to:
  // 1. Create a new enum without the values
  // 2. Update all columns using the enum
  // 3. Drop the old enum
  // 4. Rename the new enum
  // This is destructive, so we just log a warning.
  console.warn('Cannot remove enum values in PostgreSQL. Manual intervention required to rollback.');
}
