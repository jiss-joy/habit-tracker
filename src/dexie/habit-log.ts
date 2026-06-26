export interface HabitLog {
  id: string; // Primary Key
  habitId: string;
  userId: string;
  logDate: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}