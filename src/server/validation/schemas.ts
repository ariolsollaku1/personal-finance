/**
 * Zod validation schemas for API request validation
 * These schemas ensure type-safe, consistent validation across all routes
 */

import { z } from 'zod';

// =============================================================================
// Base Schemas (reusable enums and primitives)
// =============================================================================

export const accountTypeSchema = z.enum(['stock', 'bank', 'cash', 'loan', 'credit', 'asset']);
export const currencySchema = z.enum(['EUR', 'USD', 'ALL', 'GBP', 'CHF', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN']);
export const transactionTypeSchema = z.enum(['inflow', 'outflow']);
export const frequencySchema = z.enum(['weekly', 'biweekly', 'monthly', 'yearly']);
export const categoryTypeSchema = z.enum(['income', 'expense']);

// Common field schemas
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const accountIdParamSchema = z.object({
  accountId: z.string().regex(/^\d+$/).transform(Number),
});

// =============================================================================
// Account Schemas
// =============================================================================

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: accountTypeSchema,
  currency: currencySchema,
  initialBalance: z.number().default(0),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currency: currencySchema.optional(),
  initialBalance: z.number().optional(),
});

export const setFavoriteSchema = z.object({
  isFavorite: z.boolean(),
});

// =============================================================================
// Transaction Schemas
// =============================================================================

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().positive('Amount must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  payee: z.string().optional(),
  payeeId: z.number().int().positive().optional(),
  category: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const updateTransactionSchema = z.object({
  type: transactionTypeSchema.optional(),
  amount: z.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payee: z.string().optional(),
  payeeId: z.number().int().positive().optional(),
  category: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
});

// =============================================================================
// Recurring Transaction Schemas
// =============================================================================

export const createRecurringSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().positive('Amount must be positive'),
  payee: z.string().optional(),
  payeeId: z.number().int().positive().optional(),
  category: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  frequency: frequencySchema,
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

export const updateRecurringSchema = z.object({
  type: transactionTypeSchema.optional(),
  amount: z.number().positive().optional(),
  payee: z.string().optional(),
  payeeId: z.number().int().positive().optional(),
  category: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  frequency: frequencySchema.optional(),
  nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isActive: z.boolean().optional(),
});

export const applyRecurringSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// =============================================================================
// Transfer Schemas
// =============================================================================

export const createTransferSchema = z.object({
  fromAccountId: z.number().int().positive(),
  toAccountId: z.number().int().positive(),
  fromAmount: z.number().positive('Amount must be positive'),
  toAmount: z.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  notes: z.string().max(500).optional(),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: 'Cannot transfer to the same account',
  path: ['toAccountId'],
});

// =============================================================================
// Category Schemas
// =============================================================================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  type: categoryTypeSchema.default('expense'),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50),
});

// =============================================================================
// Payee Schemas
// =============================================================================

export const createPayeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export const updatePayeeSchema = z.object({
  name: z.string().min(1).max(100),
});

export const mergePayeesSchema = z.object({
  sourceId: z.number().int().positive(),
  targetId: z.number().int().positive(),
}).refine(data => data.sourceId !== data.targetId, {
  message: 'Cannot merge payee with itself',
  path: ['targetId'],
});

// =============================================================================
// Holdings Schemas
// =============================================================================

export const createHoldingSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  shares: z.number().positive('Shares must be positive'),
  price: z.number().positive('Price must be positive'),
  fees: z.number().min(0).default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  accountId: z.number().int().positive(),
});

export const sellHoldingSchema = z.object({
  shares: z.number().positive('Shares must be positive'),
  price: z.number().positive('Price must be positive'),
  fees: z.number().min(0).default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  accountId: z.number().int().positive(),
});

// =============================================================================
// Dividend Schemas
// =============================================================================

export const createDividendSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  amountPerShare: z.number().positive('Amount per share must be positive'),
  sharesHeld: z.number().positive().optional(),
  exDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  accountId: z.number().int().positive(),
});

export const setTaxRateSchema = z.object({
  rate: z.number().min(0).max(1, 'Tax rate must be between 0 and 1'),
});

// =============================================================================
// Settings Schemas
// =============================================================================

export const setCurrencySchema = z.object({
  currency: currencySchema,
});

export const setSidebarCollapsedSchema = z.object({
  collapsed: z.boolean(),
});

// =============================================================================
// Type exports for use in route handlers
// =============================================================================

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreatePayeeInput = z.infer<typeof createPayeeSchema>;
export type CreateHoldingInput = z.infer<typeof createHoldingSchema>;
export type SellHoldingInput = z.infer<typeof sellHoldingSchema>;
export type CreateDividendInput = z.infer<typeof createDividendSchema>;
