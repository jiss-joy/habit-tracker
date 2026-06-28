import { sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm'
import { boolean, index, integer, pgSequence, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
import { DEFAULT_COLUMNS } from '../helpers/default-columns'
import { HabitFrequencies, habitFrequencyEnum } from '../enums/habit-frequency'
import { HabitType, habitTypeEnum } from '../enums/habit-type'

export const habits = pgTable('habits', {
  id: uuid().primaryKey(),
  userId: varchar().notNull(),
  name: text().notNull(),
  description: text(),
  frequency: habitFrequencyEnum().notNull().default(HabitFrequencies.DAILY),
  type: habitTypeEnum().notNull().default(HabitType.BINARY),
  targetValue: integer(),
  unit: text(),
  // Note: We are using an integer to represent a boolean for the isDeleted flag (0 = false, 1 = true)
  // This was kept as integer and not a boolean because IndexedDB does not support indexing boolean fields, and we want to maintain consistency across our sync engine.
  isDeleted: integer().notNull().default(0),
  lastSyncId: integer().notNull().default(sql`nextval('sync_sequence')`),
  ...DEFAULT_COLUMNS,
}, (table) => [
  index("habits_updated_at_idx").on(table.updatedAt),
])

/**
 * Type definitions for the habits table
 */
export type InsertHabitsType = InferInsertModel<typeof habits>
export type SelectHabitsType = InferSelectModel<typeof habits>
