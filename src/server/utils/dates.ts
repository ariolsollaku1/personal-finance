import { addDays, addMonths, addYears, format, parseISO } from 'date-fns';
import type { Frequency } from '../../shared/types.js';

/**
 * Calculate the next due date based on frequency.
 *
 * Uses date-fns to properly handle edge cases:
 * - Jan 31 + 1 month = Feb 28/29 (not March 3)
 * - Feb 29 + 1 year = Feb 28 (on non-leap years)
 *
 * @param currentDate - Current due date in YYYY-MM-DD format
 * @param frequency - Recurring frequency
 * @returns Next due date in YYYY-MM-DD format
 */
export function calculateNextDueDate(currentDate: string, frequency: Frequency): string {
  const date = parseISO(currentDate);

  let nextDate: Date;
  switch (frequency) {
    case 'weekly':
      nextDate = addDays(date, 7);
      break;
    case 'biweekly':
      nextDate = addDays(date, 14);
      break;
    case 'monthly':
      nextDate = addMonths(date, 1);
      break;
    case 'yearly':
      nextDate = addYears(date, 1);
      break;
    default:
      nextDate = addMonths(date, 1);
  }

  return format(nextDate, 'yyyy-MM-dd');
}
