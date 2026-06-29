import { SyncStatus } from '../db/enums/sync-status';
import { useDexieDb } from '../hooks/use-dexie-db';
import { useSession } from '../lib/auth/auth-client';
import { useUuid } from './use-uuid';

export function useHabitActions() {
  const getUuid = useUuid();
  const db = useDexieDb();
  const { data: session } = useSession();

  const userId = session?.user.id;

  // TODO: Add TTL for deleted habits and logs to clean up the database after a certain period, e.g., 30 days. This will help in maintaining a lean database and improve performance over time.
  async function deleteHabit(habitId: string) {
    // TODO: Add a confirmation dialog here before delete.
    await db.transaction('rw', [db.habits, db.habitLogs], async () => {
      await db.habits.update(habitId, {
        isDeleted: 1,
        syncStatus: SyncStatus.DIRTY,
        updatedAt: new Date(),
      });

      // 2. Cascade delete all associated logs for this habit locally
      // Fetch all logs connected to this habit
      const logs = await db.habitLogs.where('habitId').equals(habitId).toArray();

      for (const log of logs) {
        await db.habitLogs.update(log.id, {
          isDeleted: 1,
          syncStatus: SyncStatus.DIRTY,
          updatedAt: new Date(),
        });
      }
    });
    return true;
  }

  async function toggleBinaryLog(habitId: string, dateStr: string) {
    if (!userId) return;
    const logSlug = `${userId}_${habitId}_${dateStr}`;
    const logUuid = getUuid(logSlug);
    const existingLog = await db.habitLogs.get(logUuid);

    if (existingLog) {
      await db.habitLogs.update(logUuid, {
        value: existingLog.value === 1 ? 0 : 1,
        updatedAt: new Date(),
      });
    }
    else {
      await db.habitLogs.add({
        id: logUuid,
        habitId,
        userId,
        logDate: dateStr,
        value: 1,
        syncStatus: SyncStatus.DIRTY,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  async function saveMeasurableLog(habitId: string, dateStr: string, value: number) {
    if (!userId) return;

    const logSlug = `${userId}_${habitId}_${dateStr}`;
    const logUuid = getUuid(logSlug);

    await db.habitLogs.put({
      id: logUuid,
      habitId,
      userId,
      logDate: dateStr,
      value,
      syncStatus: SyncStatus.DIRTY,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return { deleteHabit, toggleBinaryLog, saveMeasurableLog };
}
