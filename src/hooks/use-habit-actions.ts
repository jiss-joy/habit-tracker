import { db } from "../dexie/db";
import { useUuid } from "./use-uuid";

export function useHabitActions(userId: string = '00000000-0000-0000-0000-000000000000') {
  const getUuid = useUuid();
  async function deleteHabit(habitId: string) {
    if (!confirm("Are you sure you want to delete this habit and all its logged history?")) return false;

    await db.transaction('rw', ['habits', 'habitLogs'], async () => {
      await db.habits.delete(habitId);
      await db.habitLogs.where('habitId').equals(habitId).delete();
    });
    return true;
  }

  async function toggleBinaryLog(habitId: string, dateStr: string) {
    const logSlug = `${userId}_${habitId}_${dateStr}`;
    const logUuid = getUuid(logSlug);
    const existingLog = await db.habitLogs.get(logUuid);

    if (existingLog) {
      await db.habitLogs.update(logUuid, {
        value: existingLog.value === 1 ? 0 : 1,
        updatedAt: new Date(),
      });
    } else {
      await db.habitLogs.add({
        id: logUuid,
        habitId,
        userId: userId,
        logDate: dateStr,
        value: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  async function saveMeasurableLog(habitId: string, dateStr: string, value: number, existingLogId?: string) {
    const logSlug = `${userId}_${habitId}_${dateStr}`;
    const logUuid = getUuid(logSlug);

    await db.habitLogs.put({
      id: logUuid,
      habitId,
      userId: userId,
      logDate: dateStr,
      value,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return { deleteHabit, toggleBinaryLog, saveMeasurableLog };
}