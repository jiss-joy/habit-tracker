import type { SyncEntity } from './types';
import type { AppDatabase, SyncDatabaseTables } from '@/src/dexie/db';
import { fetchDirtyRecords, finalizePushedRecords, getSyncTableNames, mergeIncomingChanges, pushToServer, revertDirtyRecords } from './helpers';

export async function runSyncEngine(dexieDb: AppDatabase): Promise<void> {
  if (dexieDb.isSyncing) return;
  const syncTables = getSyncTableNames(dexieDb);

  // Step 1: identify dirty rows, atomically, across all tables at once
  const dirtyRecordsByTable: Record<SyncDatabaseTables, SyncEntity[]> = { habits: [], habitLogs: [], test: [] };
  const dirtyRecordIdsByTable: Record<SyncDatabaseTables, string[]> = { habits: [], habitLogs: [], test: [] };

  try {
    dexieDb.isSyncing = true;
    const syncMetaRecord = await dexieDb.syncMeta.get('lastSyncId');
    const lastSyncId = syncMetaRecord ? Number(syncMetaRecord.value) : 0;

    await dexieDb.transaction('rw', syncTables, async () => {
      for (const tableName of syncTables) {
        const dirtyRecords = await fetchDirtyRecords(dexieDb, tableName);
        dirtyRecordsByTable[tableName] = dirtyRecords;
        dirtyRecordIdsByTable[tableName] = dirtyRecords.map(r => r.id);
      }
    });

    // step 2: push to server
    const { serverSequence, serverDirtyRecords } = await pushToServer(lastSyncId, dirtyRecordsByTable);

    // --- Step 3: merge whatever the server sent back ---
    const tablesWithIncomingChanges: SyncDatabaseTables[] = Object.keys(serverDirtyRecords) as SyncDatabaseTables[];
    if (tablesWithIncomingChanges.length > 0) {
      await dexieDb.transaction('rw', tablesWithIncomingChanges, async () => {
        for (const tableName of tablesWithIncomingChanges) {
          await mergeIncomingChanges(dexieDb, tableName, serverDirtyRecords[tableName] ?? []);
        }
      });
    }

    // --- Step 4: confirm our own pushed rows as synced ---
    await dexieDb.transaction('rw', syncTables, async () => {
      for (const tableName of syncTables) {
        await finalizePushedRecords(dexieDb, tableName, dirtyRecordIdsByTable[tableName]);
      }
    });

    await dexieDb.syncMeta.put({ key: 'lastSyncId', value: serverSequence });
  }
  catch (error) {
    try {
      await dexieDb.transaction('rw', syncTables, async () => {
        for (const tableName of syncTables) {
          await revertDirtyRecords(dexieDb, tableName, dirtyRecordIdsByTable[tableName]);
        }
      });
    }
    catch (rollbackError) {
      console.error('[sync] CRITICAL: rollback itself failed:', rollbackError);
    }
    throw error;
  }
  finally {
    dexieDb.isSyncing = false;
  }
}
