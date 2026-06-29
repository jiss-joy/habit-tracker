import type { HabitFrequencies } from '../db/enums/habit-frequency';
import type { HabitType } from '../db/enums/habit-type';
import type { SyncEntity } from '../lib/sync-engine/types';

export interface Habit extends SyncEntity {
  userId: string;
  name: string;
  description: string | null;
  type: HabitType;
  frequency: HabitFrequencies;
  targetValue: number | null;
  unit: string | null;
}
