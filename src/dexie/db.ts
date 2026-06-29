import type { Table } from 'dexie';
import type { Habit } from './habit';
import type { HabitLog } from './habit-log';
import type { SyncMeta } from './sync-meta';
import Dexie from 'dexie';
import { triggerSync } from '../lib/sync-engine/sync-trigger';

export const NON_SYNC_TABLES = new Set<string>(['syncMeta']);
export type SyncDatabaseTables = Exclude<keyof AppDatabase, keyof import('dexie').Dexie | 'syncMeta' | 'isSyncing'>;

export class AppDatabase extends Dexie {
  syncMeta!: Table<SyncMeta, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  test!: Table;

  // 2. Lock flag to prevent feedback loops
  public isSyncing = false;

  constructor(userId: string) {
    super(`AppDatabase_${userId}`);
    this.version(3).stores({
      syncMeta: 'key',
      habits: 'id, userId, type, updatedAt, syncStatus',
      habitLogs: 'id, habitId, userId, logDate, updatedAt, syncStatus',
    });

    this.use({
      stack: 'dbcore',
      name: 'debounce-mutation-listener',
      create: (downlevel) => {
        return {
          ...downlevel,
          table: (tableName: string) => {
            const table = downlevel.table(tableName);
            if (tableName === 'syncMeta') return table;

            return {
              ...table,
              mutate: async (req) => {
                const result = await table.mutate(req);
                if (!this.isSyncing) {
                  triggerSync(this, true);
                }

                return result;
              },
            };
          },
        };
      },
    });
  }
}

let db: AppDatabase | undefined;
let currentUserId: string | undefined;

export function getDexieDb(userId: string): AppDatabase {
  if (typeof window === 'undefined') {
    throw new TypeError('Dexie is not available on the server side.');
  }

  // Close the db instance if it does not belong to the signed in user.
  if (db && currentUserId !== userId) {
    db.close(); // release the previous user's db connection
    db = undefined;
  }

  if (!db) {
    db = new AppDatabase(userId);
    currentUserId = userId;
  }

  return db;
}
