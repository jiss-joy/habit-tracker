
import Dexie, { type Table } from 'dexie';
import { Habit } from './habit';
import { HabitLog } from './habit-log';
import { SyncMeta } from './sync-meta';
import { triggerDebouncedSync } from '../lib/sync-trigger';

export type SyncDatabaseTables = Exclude<keyof AppDatabase, keyof import('dexie').Dexie | 'syncMeta'>;

export class AppDatabase extends Dexie {
  syncMeta!: Table<SyncMeta, string>
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;

  // 2. Lock flag to prevent feedback loops
  public isSyncing = false;

  constructor() {
    super('AppDatabase');
    this.version(2).stores({
      syncMeta: 'key',
      habits: 'id, userId, type, updatedAt',
      habitLogs: 'id, habitId, userId, logDate, updatedAt'
    });

    this.use({
      stack: "dbcore",
      name: "debounce-mutation-listener",
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
                  triggerDebouncedSync(this);
                }

                return result;
              }
            }
          }
        }
      }
    });
  }
}

let db: AppDatabase | undefined;

export function getDexieDb(): AppDatabase {
  if (typeof window === 'undefined') {
    throw new Error('Dexie is not available on the server side.');
  }

  if (!db) db = new AppDatabase();

  return db;
}