import { timestamp } from 'drizzle-orm/pg-core';

/**
 * Default columns required for all tables.
 */
export const DEFAULT_COLUMNS = {
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
};
