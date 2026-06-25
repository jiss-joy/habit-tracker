// import { Dexie, type EntityTable } from "dexie"
// import { SelectHabitsType } from "../db/schemas/habits";
// import { SelectHabitLogsType } from "../db/schemas/habit-logs";

// const db = new Dexie('HabitsDatabase') as Dexie & {
//     habits: EntityTable<SelectHabitsType>,
//     habitLogs: EntityTable<SelectHabitLogsType>
// };

// db.version(1).stores({
//     habits: '++id, name, description, frequency, lastCompleted',
//     habitLogs: '++id, habitId, userId, logDate, value'
// })

// export { db }

import Dexie, { type Table } from 'dexie';
import { HabitType } from '../db/enums/habit-type';
import { HabitFrequencies } from '../db/enums/habit-frequency';

// 💡 1. Define strict interfaces for your entities
export interface Habit {
  id: string; // Primary Key
  userId: string;
  name: string;
  description: string | null;
  type: HabitType;
  frequency: HabitFrequencies;
  targetValue: number | null;
  unit: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitLog {
  id: string; // Primary Key
  habitId: string;
  userId: string;
  logDate: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

// 💡 2. Subclass Dexie and pass the primary key type (string) explicitly
export class HabitDatabase extends Dexie {
  habits!: Table<Habit, string>; // <--- Crucial: Tells Dexie the key is a string
  habitLogs!: Table<HabitLog, string>;

  constructor() {
    super('HabitDatabase');
    this.version(1).stores({
      habits: 'id, userId, type',
      habitLogs: 'id, habitId, userId, logDate'
    });
  }
}

export const db = new HabitDatabase();