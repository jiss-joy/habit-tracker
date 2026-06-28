import { HabitFrequencies } from "../db/enums/habit-frequency";
import { HabitType } from "../db/enums/habit-type";
import { SyncStatus } from "../db/enums/sync-status";

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: HabitType;
  frequency: HabitFrequencies;
  targetValue: number | null;
  unit: string | null;
  isDeleted: 0 | 1;
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}