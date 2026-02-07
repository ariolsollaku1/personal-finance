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
import * as m002 from './002_add_european_currencies.js';
import * as m003 from './003_add_account_archived.js';
import * as m004 from './004_recalc_holdings_from_transactions.js';
import * as m005 from './005_unique_dividends_per_symbol_exdate.js';
import * as m006 from './006_add_dividend_transaction_created.js';
import * as m007 from './007_recalc_holdings_fix_string_coercion.js';
import * as m008 from './008_add_fk_on_delete_set_null.js';

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
  {
    version: m002.version,
    description: m002.description,
    up: m002.up,
    down: m002.down,
  },
  {
    version: m003.version,
    description: m003.description,
    up: m003.up,
    down: m003.down,
  },
  {
    version: m004.version,
    description: m004.description,
    up: m004.up,
  },
  {
    version: m005.version,
    description: m005.description,
    up: m005.up,
    down: m005.down,
  },
  {
    version: m006.version,
    description: m006.description,
    up: m006.up,
    down: m006.down,
  },
  {
    version: m007.version,
    description: m007.description,
    up: m007.up,
  },
  {
    version: m008.version,
    description: m008.description,
    up: m008.up,
    down: m008.down,
  },
];
