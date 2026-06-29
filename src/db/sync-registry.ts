import type { InferInsertModel } from 'drizzle-orm';
import { habitLogs } from './schemas/habit-logs';
import { habits } from './schemas/habits';

// 1. The Registry: Add new tables here in the future.
// You will never need to touch the sync engine code again.
export const SYNC_REGISTRY = {
  habits,
  habitLogs,
} as const;

// 2. Extract strict keys ("habits" | "habitLogs")
export type SyncTableKey = keyof typeof SYNC_REGISTRY;

// 3. Automate the Payload Type Map
// This dynamically creates a strict interface:
// { habits?: HabitInsertType[]; habitLogs?: HabitLogInsertType[]; }
export type SyncPayloadMap = {
  [K in SyncTableKey]?: InferInsertModel<typeof SYNC_REGISTRY[K]>[];
};
