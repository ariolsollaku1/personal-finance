import type pg from 'pg';

/**
 * Migration Registry
 *
 * Import all migrations here and add them to the migrations array.
 * Migrations are run in order of their version number.
 *
 * Naming convention: XXX_description.ts (e.g., 001_create_test_table.ts)
 */

import * as m001 from './001_create_test_table.js';

export interface Migration {
  version: number;
  description: string;
  up: (client: pg.PoolClient) => Promise<void>;
  down?: (client: pg.PoolClient) => Promise<void>;
}

/**
 * All migrations in order.
 * Add new migrations to the end of this array.
 */
export const migrations: Migration[] = [
  {
    version: m001.version,
    description: m001.description,
    up: m001.up,
    down: m001.down,
  },
];
