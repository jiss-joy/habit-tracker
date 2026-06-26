import { HabitFrequencies } from "../db/enums/habit-frequency";
import { HabitType } from "../db/enums/habit-type";

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
  createdAt: Date;
  updatedAt: Date;
}