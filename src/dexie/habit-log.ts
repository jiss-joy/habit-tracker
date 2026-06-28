import { SyncStatus } from "../db/enums/sync-status";

export interface HabitLog {
  id: string; // Primary Key
  habitId: string;
  userId: string;
  logDate: string;
  value: number;
  isDeleted?: 0 | 1;
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}