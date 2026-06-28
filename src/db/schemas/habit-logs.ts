import { sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm'
import { bigint, index, integer, pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { DEFAULT_COLUMNS } from '../helpers/default-columns'
import { habits } from './habits'

export const habitLogs = pgTable('habit_logs', {
  id: uuid().primaryKey(),
  habitId: uuid().notNull().references(() => habits.id, { onDelete: 'cascade' }),
  userId: varchar().notNull(),
  logDate: text().notNull(),
  value: integer(),
  isDeleted: integer().notNull().default(0),
  lastSyncId: bigint({ mode: 'number' }).notNull().default(sql`nextval('sync_sequence')`),
  ...DEFAULT_COLUMNS,
}, table => [
  index("habit_logs_last_sync_id_idx").on(table.lastSyncId),
  uniqueIndex('user_habit_date_unique').on(table.userId, table.habitId, table.logDate),
])

/**
 * Type definitions for the habit_logs table
 */
export type InsertHabitLogsType = InferInsertModel<typeof habitLogs>
export type SelectHabitLogsType = InferSelectModel<typeof habitLogs>
