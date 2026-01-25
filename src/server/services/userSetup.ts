/**
 * User Setup Service
 *
 * Handles initialization of new users with default data.
 * Called when a user first authenticates via Supabase.
 *
 * Default data includes:
 * - 18 categories (3 income, 15 expense)
 * - Settings: dividend tax rate (8%), main currency (EUR), sidebar state
 *
 * @module services/userSetup
 */

import { query, queryOne, DEFAULT_CATEGORIES } from '../db/schema.js';

/**
 * Default settings for new users
 * - dividend_tax_rate: 8% (Albanian flat tax)
 * - main_currency: EUR (European standard)
 * - sidebar_collapsed: false (expanded)
 */
const DEFAULT_SETTINGS = [
  { key: 'dividend_tax_rate', value: '0.08' },
  { key: 'main_currency', value: 'EUR' },
  { key: 'sidebar_collapsed', value: '0' },
];

/**
 * Check if a user has been initialized.
 *
 * A user is considered initialized if they have at least one category.
 * This is checked before seeding to avoid duplicate data.
 *
 * @param userId - Supabase user UUID
 * @returns true if user has categories, false if new user
 */
export async function isUserInitialized(userId: string): Promise<boolean> {
  const result = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM categories WHERE user_id = $1',
    [userId]
  );
  return parseInt(result?.count || '0') > 0;
}

/**
 * Seed default categories for a new user.
 *
 * Creates 18 default categories:
 * - Income: Salary, Investment Income, Other Income
 * - Expense: Groceries, Utilities, Rent, Transportation, etc.
 *
 * Uses ON CONFLICT DO NOTHING for idempotency.
 *
 * @param userId - Supabase user UUID
 */
export async function seedDefaultCategories(userId: string): Promise<void> {
  console.log(`Seeding default categories for user ${userId}...`);

  for (const category of DEFAULT_CATEGORIES) {
    await query(
      'INSERT INTO categories (user_id, name, type) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO NOTHING',
      [userId, category.name, category.type]
    );
  }

  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories for user ${userId}`);
}

/**
 * Seed default settings for a new user.
 *
 * Creates default values for:
 * - dividend_tax_rate: 0.08 (8%)
 * - main_currency: EUR
 * - sidebar_collapsed: 0 (false)
 *
 * Uses ON CONFLICT DO NOTHING for idempotency.
 *
 * @param userId - Supabase user UUID
 */
export async function seedDefaultSettings(userId: string): Promise<void> {
  console.log(`Seeding default settings for user ${userId}...`);

  for (const setting of DEFAULT_SETTINGS) {
    await query(
      'INSERT INTO user_settings (user_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (user_id, key) DO NOTHING',
      [userId, setting.key, setting.value]
    );
  }

  console.log(`Seeded ${DEFAULT_SETTINGS.length} settings for user ${userId}`);
}

/**
 * Initialize a new user with default data.
 *
 * Called from POST /api/auth/init when a user first signs in.
 * Seeds default categories and settings if the user hasn't been initialized.
 *
 * @param userId - Supabase user UUID
 * @returns Object indicating if initialization occurred and message
 *
 * @example
 * ```typescript
 * const result = await initializeNewUser(userId);
 * if (result.initialized) {
 *   console.log('New user set up with defaults');
 * }
 * ```
 */
export async function initializeNewUser(userId: string): Promise<{ initialized: boolean; message: string }> {
  const alreadyInitialized = await isUserInitialized(userId);

  if (alreadyInitialized) {
    return { initialized: false, message: 'User already initialized' };
  }

  await seedDefaultCategories(userId);
  await seedDefaultSettings(userId);

  return { initialized: true, message: 'User initialized successfully' };
}
