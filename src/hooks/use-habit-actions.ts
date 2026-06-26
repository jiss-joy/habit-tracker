import { db } from "../dexie/db";
import { v5 as uuid } from 'uuid';

// 1. Define a permanent, static namespace UUID for your app's logs
// (Generated once, never change this or your hashes will shift!)
const LOG_NAMESPACE = "c3683354-a95a-4aeb-9d1f-230b9852aa55";

export function useHabitActions(userId: string = 'test-user-id') {
  async function deleteHabit(habitId: string) {
    if (!confirm("Are you sure you want to delete this habit and all its logged history?")) return false;

    await db.transaction('rw', ['habits', 'habitLogs'], async () => {
      await db.habits.delete(habitId);
      await db.habitLogs.where('habitId').equals(habitId).delete();
    });
    return true;
  }

  async function toggleBinaryLog(habitId: string, dateStr: string) {
    // ⚡ 1. Generate the deterministic compound string ID
    // const logId = `${userId}_${habitId}_${dateStr}`;
    const slotString = `${userId}_${habitId}_${dateStr}`;

    // ⚡ 2. Generate a flawless, deterministic UUID natively
    const logId = uuid(slotString, LOG_NAMESPACE);
    const existingLog = await db.habitLogs.get(logId);

    if (existingLog) {
      await db.habitLogs.update(logId, {
        value: existingLog.value === 1 ? 0 : 1,
        updatedAt: new Date(),
      });
    } else {
      await db.habitLogs.add({
        id: logId,
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
    // ⚡ 1. Generate the same slot target identity
    const logId = `${userId}_${habitId}_${dateStr}`;

    await db.habitLogs.put({
      id: logId,
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