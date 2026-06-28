export interface HabitLog {
  id: string; // Primary Key
  habitId: string;
  userId: string;
  logDate: string;
  value: number;
  isDeleted?: 0 | 1;
  createdAt: Date;
  updatedAt: Date;
}