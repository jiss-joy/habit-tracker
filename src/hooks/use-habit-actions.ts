import { useDexieDb } from "../contexts/dexie-provider";
import { SyncStatus } from "../db/enums/sync-status";
import { useUuid } from "./use-uuid";

export function useHabitActions(userId: string = '00000000-0000-0000-0000-000000000000') {
  const getUuid = useUuid();
  const db = useDexieDb();

  // TODO: Add TTL for deleted habits and logs to clean up the database after a certain period, e.g., 30 days. This will help in maintaining a lean database and improve performance over time.
  async function deleteHabit(habitId: string) {
    if (!confirm("Are you sure you want to delete this habit and all its logged history?")) return false;

    await db.transaction('rw', [db.habits, db.habitLogs], async () => {
      await db.habits.update(habitId, {
        isDeleted: 1,
        syncStatus: SyncStatus.MODIFIED,
        updatedAt: new Date()
      });

      // 2. Cascade delete all associated logs for this habit locally
      // Fetch all logs connected to this habit
      const logs = await db.habitLogs.where('habitId').equals(habitId).toArray();

      for (const log of logs) {
        await db.habitLogs.update(log.id, {
          isDeleted: 1,
          updatedAt: new Date()
        });
      }
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
        syncStatus: SyncStatus.MODIFIED,
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
      syncStatus: SyncStatus.MODIFIED,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return { deleteHabit, toggleBinaryLog, saveMeasurableLog };
}