import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { integer, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core'
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
  ...DEFAULT_COLUMNS,
})

/**
 * Type definitions for the habits table
 */
export type InsertHabitsType = InferInsertModel<typeof habits>
export type SelectHabitsType = InferSelectModel<typeof habits>
