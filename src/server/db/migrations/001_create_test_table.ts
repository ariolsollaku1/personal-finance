import type pg from 'pg';

/**
 * Migration 001: Create test table
 *
 * This is an example migration demonstrating the migration system.
 */

export const version = 1;
export const description = 'Create test table';

export async function up(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS test (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function down(client: pg.PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS test');
}
