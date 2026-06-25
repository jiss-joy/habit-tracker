import { db } from "../dexie/db";

export function useHabitActions(mockUser: string = 'test-user-id') {
  async function deleteHabit(habitId: string) {
    if (!confirm("Are you sure you want to delete this habit and all its logged history?")) return false;
    
    await db.transaction('rw', ['habits', 'habitLogs'], async () => {
      await db.habits.delete(habitId);
      await db.habitLogs.where('habitId').equals(habitId).delete();
    });
    return true;
  }

  async function toggleBinaryLog(habitId: string, dateStr: string, existingLogId?: string) {
    if (existingLogId) {
      await db.habitLogs.delete(existingLogId);
    } else {
      await db.habitLogs.add({
        id: crypto.randomUUID(),
        habitId,
        userId: mockUser,
        logDate: dateStr,
        value: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  async function saveMeasurableLog(habitId: string, dateStr: string, value: number, existingLogId?: string) {
    if (existingLogId) {
      await db.habitLogs.update(existingLogId, {
        value,
        updatedAt: new Date()
      });
    } else {
      await db.habitLogs.add({
        id: crypto.randomUUID(),
        habitId,
        userId: mockUser,
        logDate: dateStr,
        value,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  return { deleteHabit, toggleBinaryLog, saveMeasurableLog };
}