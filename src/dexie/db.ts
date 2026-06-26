import Dexie, { type Table } from 'dexie';
import { Habit } from './habit';
import { HabitLog } from './habit-log';
import { SyncMeta } from './sync-meta';

export type SyncDatabaseTables = Exclude<keyof HabitDatabase, keyof import('dexie').Dexie | 'syncMeta'>;

// 💡 2. Subclass Dexie and pass the primary key type (string) explicitly
export class HabitDatabase extends Dexie {
  syncMeta!: Table<SyncMeta, string>
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;

  constructor() {
    super('HabitDatabase');
    this.version(2).stores({
      syncMeta: 'key',
      habits: 'id, userId, type, updatedAt',
      habitLogs: 'id, habitId, userId, logDate, updatedAt'
    });
  }
}

export const db = new HabitDatabase();