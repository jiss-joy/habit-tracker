'use client'

import { SyncStatus } from "../../db/enums/sync-status";
import { AppDatabase } from "../../dexie/db";

export type SyncDatabaseTables = "habits" | "habitLogs";
const tableKeys: SyncDatabaseTables[] = ["habits", "habitLogs"];

export async function runSyncEngine(dexieDb: AppDatabase) {
  if (dexieDb.isSyncing) return;

  const batchIds: Record<SyncDatabaseTables, string[]> = { habits: [], habitLogs: [] };
  const localDirtyRecords: Record<SyncDatabaseTables, any[]> = { habits: [], habitLogs: [] };

  try {
    console.log("🔄 [SYNC ENGINE V2] Commencing synchronization iteration...");
    dexieDb.isSyncing = true;

    // Fetch local timeline integer checkpoint
    const syncMetaRecord = await dexieDb.syncMeta.get("lastSyncId");
    const lastSyncId = syncMetaRecord ? Number(syncMetaRecord.value) : 0;

    // ========================================================
    // === STEP 1: Atomic Read-and-Mark Phase =================
    // ========================================================
    await dexieDb.transaction("rw", tableKeys, async () => {
      for (const tableKey of tableKeys) {
        const dirtyRows = await dexieDb
          .table(tableKey)
          .where("syncStatus")
          .equals(SyncStatus.MODIFIED)
          .toArray();

        batchIds[tableKey] = dirtyRows.map(row => row.id);
        localDirtyRecords[tableKey] = dirtyRows;

        if (batchIds[tableKey].length > 0) {
          await dexieDb.table(tableKey)
            .where("id")
            .anyOf(batchIds[tableKey])
            .modify({ syncStatus: SyncStatus.SYNCING });
        }
      }
    });

    // ========================================================
    // === STEP 2 & 3: Network Pipe Transmission ==============
    // ========================================================
    const response = await fetch("/api/sync-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lastSyncId, // 👈 Maps to your backend parameters
        localDirtyRecords,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with execution status code: ${response.status}`);
    }

    const { serverSequence, serverDirtyRecords } = await response.json() as {
      serverSequence: number;
      serverDirtyRecords: Partial<Record<SyncDatabaseTables, any[]>>;
    };

    // ========================================================
    // === STEP 4: Pull & Merge with Clock Tie-Breaker ========
    // ========================================================
    const remoteTableKeys = Object.keys(serverDirtyRecords) as SyncDatabaseTables[];

    if (remoteTableKeys.length > 0) {
      await dexieDb.transaction("rw", remoteTableKeys, async () => {
        for (const tableKey of remoteTableKeys) {
          const remoteRecords = serverDirtyRecords[tableKey];
          if (!remoteRecords || remoteRecords.length === 0) continue;

          const recordsToUpsert: any[] = [];
          const idsToHardDeleteLocally: string[] = [];

          for (const record of remoteRecords) {
            const baseHydration = {
              ...record,
              createdAt: record.createdAt ? new Date(record.createdAt) : undefined,
              updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined,
            };

            if (tableKey === "habitLogs" && typeof baseHydration.logDate === "string") {
              baseHydration.logDate = baseHydration.logDate.split("T")[0];
            }

            const localExisting = await dexieDb.table(tableKey).get(baseHydration.id);

            // Chronological tie-breaker
            if (localExisting) {
              if (localExisting.syncStatus === SyncStatus.MODIFIED || localExisting.syncStatus === SyncStatus.SYNCING) {
                const localTime = new Date(localExisting.updatedAt).getTime();
                const incomingTime = baseHydration.updatedAt ? baseHydration.updatedAt.getTime() : 0;

                if (localTime >= incomingTime) {
                  console.warn(`⚠️ [SYNC] Conflict dropped for ${tableKey} [${baseHydration.id}]. Local is newer.`);
                  continue;
                }
              }
            }

            // Optimization: If a record coming down from the server is marked deleted,
            // we can safely hard-delete it locally right now to clear up IndexedDB storage.
            if (baseHydration.isDeleted === 1) {
              idsToHardDeleteLocally.push(baseHydration.id);
            } else {
              baseHydration.syncStatus = SyncStatus.SYNCED;
              recordsToUpsert.push(baseHydration);
            }
          }

          if (recordsToUpsert.length > 0) {
            await dexieDb.table(tableKey).bulkPut(recordsToUpsert);
          }
          if (idsToHardDeleteLocally.length > 0) {
            await dexieDb.table(tableKey).bulkDelete(idsToHardDeleteLocally);
            console.debug(`🗑️ [SYNC] Purged ${idsToHardDeleteLocally.length} tombstones from local store: "${tableKey}"`);
          }
        }
      });
    }

    // ========================================================
    // === STEP 5: Atomic Commit & Milestone Advancement =======
    // ========================================================
    await dexieDb.transaction("rw", tableKeys, async () => {
      for (const tableKey of tableKeys) {
        if (batchIds[tableKey].length > 0) {

          // Separate clean records from locally pushed deleted records
          const syncedRecords = await dexieDb.table(tableKey)
            .where("id")
            .anyOf(batchIds[tableKey])
            .and(row => row.syncStatus === SyncStatus.SYNCING)
            .toArray();

          const cleanIds: string[] = [];
          const deletedIds: string[] = [];

          for (const row of syncedRecords) {
            if (row.isDeleted === 1) {
              deletedIds.push(row.id);
            } else {
              cleanIds.push(row.id);
            }
          }

          // Regular modifications change state to 'synced'
          if (cleanIds.length > 0) {
            await dexieDb.table(tableKey).where("id").anyOf(cleanIds).modify({ syncStatus: SyncStatus.SYNCED });
          }

          // Pushed deletes have safely hit Postgres; we can wipe them completely from device storage
          if (deletedIds.length > 0) {
            await dexieDb.table(tableKey).bulkDelete(deletedIds);
            console.debug(`🗑️ [SYNC] Evicted ${deletedIds.length} pushed tombstones from "${tableKey}"`);
          }
        }
      }
    });

    // Advance local layout tracking token
    await dexieDb.syncMeta.put({
      key: "lastSyncId",
      value: serverSequence,
    });

    console.log(`✨ [SYNC ENGINE V2] Engine pipeline clear. Sequence: ${serverSequence}`);

  } catch (error) {
    console.error("❌ [SYNC ENGINE V2] Execution fault encountered. Rolling back states:", error);
    try {
      await dexieDb.transaction("rw", tableKeys, async () => {
        for (const tableKey of tableKeys) {
          if (batchIds[tableKey].length > 0) {
            await dexieDb.table(tableKey)
              .where("id")
              .anyOf(batchIds[tableKey])
              .and(row => row.syncStatus === SyncStatus.SYNCING)
              .modify({ syncStatus: SyncStatus.MODIFIED });
          }
        }
      });
    } catch (rollbackError) {
      console.error("🚨 [CRITICAL] Failed to execute database restoration sweeps:", rollbackError);
    }
    throw error;
  } finally {
    dexieDb.isSyncing = false;
  }
}