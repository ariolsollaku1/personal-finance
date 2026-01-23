import { query, queryOne, insert, DEFAULT_CATEGORIES } from '../db/schema.js';

// Default settings for new users
const DEFAULT_SETTINGS = [
  { key: 'dividend_tax_rate', value: '0.08' },
  { key: 'main_currency', value: 'ALL' },
  { key: 'sidebar_collapsed', value: '0' },
];

/**
 * Check if a user has been initialized (has any data)
 */
export async function isUserInitialized(userId: string): Promise<boolean> {
  const result = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM categories WHERE user_id = $1',
    [userId]
  );
  return parseInt(result?.count || '0') > 0;
}

/**
 * Seed default categories for a new user
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
 * Seed default settings for a new user
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
 * Initialize a new user with default data
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
