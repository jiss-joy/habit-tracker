'use client';

import type { Table } from 'dexie';
import type { AppDatabase, SyncDatabaseTables } from '../../dexie/db';
import { SyncStatus } from '../../db/enums/sync-status';

// ============================================================================
// Types
// ============================================================================

/**
 * The minimal shape the sync engine actually cares about. Habit and HabitLog
 * both satisfy this structurally — we don't need their full domain shape here,
 * only the fields that drive sync logic. This keeps the engine decoupled from
 * domain models: adding a third syncable table later requires zero changes to
 * these types, as long as the new table's rows include these fields.
 *
 * `Record<string, unknown>` lets domain-specific fields (name, frequency, etc.)
 * pass through untouched when we read/write/serialize full rows, without the
 * sync engine needing to know what they are.
 */
interface SyncableEntity extends Record<string, unknown> {
  id: string;
  syncStatus: SyncStatus;
  isDeleted: 0 | 1;
  updatedAt: Date;
  createdAt: Date;
}

/** Same shape, but as it travels over the wire — dates are strings or absent, not Date objects. */
type WireSyncableEntity = Omit<SyncableEntity, 'updatedAt' | 'createdAt'> & {
  updatedAt?: string;
  createdAt?: string;
};

interface SyncPushResponse {
  serverSequence: number;
  serverDirtyRecords: Partial<Record<SyncDatabaseTables, WireSyncableEntity[]>>;
}

/**
 * Single source of truth for "which tables participate in sync," kept as a
 * runtime array (so we can loop over it) typed against SyncDatabaseTables
 * (so adding/removing a table here is checked against db.ts's table list).
 * Note: TypeScript can confirm every entry here is a *valid* table name, but
 * can't force you to list every table that exists — if you add a new
 * syncable table to AppDatabase, you still need to remember to add it here.
 */
const SYNC_TABLES: readonly SyncDatabaseTables[] = ['habits', 'habitLogs'] as const;

// ============================================================================
// Small typed helper — avoids `db.table(name)` returning an untyped Table<any>
// ============================================================================

function getSyncTable(db: AppDatabase, tableName: SyncDatabaseTables): Table<SyncableEntity, string> {
  return db.table<SyncableEntity, string>(tableName);
}

// ============================================================================
// Step 1 — Atomically read dirty rows and flip them to SYNCING
// ============================================================================

async function claimDirtyRecords(
  db: AppDatabase,
  tableName: SyncDatabaseTables,
): Promise<SyncableEntity[]> {
  const table = getSyncTable(db, tableName);

  const dirtyRows = await table.where('syncStatus').equals(SyncStatus.MODIFIED).toArray();
  if (dirtyRows.length === 0) return [];

  const ids = dirtyRows.map(row => row.id);
  await table.where('id').anyOf(ids).modify({ syncStatus: SyncStatus.SYNCING });

  return dirtyRows;
}

// ============================================================================
// Step 2 — Push to the server
// ============================================================================

async function pushToServer(
  lastSyncId: number,
  dirtyRecordsByTable: Record<SyncDatabaseTables, SyncableEntity[]>,
): Promise<SyncPushResponse> {
  const response = await fetch('/api/sync-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lastSyncId, localDirtyRecords: dirtyRecordsByTable }),
  });

  if (!response.ok) {
    throw new Error(`Sync push failed with status ${response.status}`);
  }

  return response.json() as Promise<SyncPushResponse>;
}

// ============================================================================
// Step 3 — Merge incoming server changes (last-write-wins on updatedAt)
// ============================================================================

function hydrateWireRecord(record: WireSyncableEntity, tableName: SyncDatabaseTables): SyncableEntity {
  const hydrated: SyncableEntity = {
    ...record,
    createdAt: record.createdAt ? new Date(record.createdAt) : new Date(0),
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(0),
  };

  // habitLogs store logDate as a plain date string (YYYY-MM-DD), strip any time component
  if (tableName === 'habitLogs' && typeof hydrated.logDate === 'string') {
    hydrated.logDate = (hydrated.logDate).split('T')[0];
  }

  return hydrated;
}

/** True if the local row has an unsynced edit that's at least as new as the incoming one. */
function localEditWins(local: SyncableEntity, incoming: SyncableEntity): boolean {
  const hasPendingLocalEdit
    = local.syncStatus === SyncStatus.MODIFIED || local.syncStatus === SyncStatus.SYNCING;
  if (!hasPendingLocalEdit) return false;

  return local.updatedAt.getTime() >= incoming.updatedAt.getTime();
}

async function mergeIncomingChanges(
  db: AppDatabase,
  tableName: SyncDatabaseTables,
  incomingRecords: WireSyncableEntity[],
): Promise<void> {
  if (incomingRecords.length === 0) return;

  const table = getSyncTable(db, tableName);
  const recordsToUpsert: SyncableEntity[] = [];
  const idsToDelete: string[] = [];

  for (const wireRecord of incomingRecords) {
    const incoming = hydrateWireRecord(wireRecord, tableName);
    const existingLocal = await table.get(incoming.id);

    if (existingLocal && localEditWins(existingLocal, incoming)) {
      console.warn(`[sync] Dropped incoming change for ${tableName}/${incoming.id} — local edit is newer`);
      continue;
    }

    if (incoming.isDeleted === 1) {
      idsToDelete.push(incoming.id);
    }
    else {
      recordsToUpsert.push({ ...incoming, syncStatus: SyncStatus.SYNCED });
    }
  }

  if (recordsToUpsert.length > 0) await table.bulkPut(recordsToUpsert);
  if (idsToDelete.length > 0) await table.bulkDelete(idsToDelete);
}

// ============================================================================
// Step 4 — Finalize: confirm pushed rows as SYNCED (or remove if deleted),
// but only the ones still SYNCING — a row bumped back to MODIFIED mid-flight
// (because the user edited it again during the network round trip) is left
// alone, so the next sync cycle picks up the newer edit.
// ============================================================================

async function finalizePushedRecords(
  db: AppDatabase,
  tableName: SyncDatabaseTables,
  pushedIds: string[],
): Promise<void> {
  if (pushedIds.length === 0) return;

  const table = getSyncTable(db, tableName);
  const stillSyncing = await table
    .where('id')
    .anyOf(pushedIds)
    .and(row => row.syncStatus === SyncStatus.SYNCING)
    .toArray();

  const confirmedIds = stillSyncing.filter(row => row.isDeleted !== 1).map(row => row.id);
  const deletedIds = stillSyncing.filter(row => row.isDeleted === 1).map(row => row.id);

  if (confirmedIds.length > 0) {
    await table.where('id').anyOf(confirmedIds).modify({ syncStatus: SyncStatus.SYNCED });
  }
  if (deletedIds.length > 0) {
    await table.bulkDelete(deletedIds);
  }
}

// ============================================================================
// Rollback — on failure, un-claim rows so they're picked up again next cycle.
// Same "only touch rows still SYNCING" guard as finalize, for the same reason.
// ============================================================================

async function revertClaimedRecords(
  db: AppDatabase,
  tableName: SyncDatabaseTables,
  claimedIds: string[],
): Promise<void> {
  if (claimedIds.length === 0) return;

  const table = getSyncTable(db, tableName);
  await table
    .where('id')
    .anyOf(claimedIds)
    .and(row => row.syncStatus === SyncStatus.SYNCING)
    .modify({ syncStatus: SyncStatus.MODIFIED });
}

// ============================================================================
// Entry point
// ============================================================================

export async function runSyncEngine(db: AppDatabase): Promise<void> {
  if (db.isSyncing) return;

  const claimedIdsByTable: Record<SyncDatabaseTables, string[]> = { habits: [], habitLogs: [] };

  try {
    db.isSyncing = true;

    const syncMetaRecord = await db.syncMeta.get('lastSyncId');
    const lastSyncId = syncMetaRecord ? Number(syncMetaRecord.value) : 0;

    // --- Step 1: claim dirty rows, atomically, across all tables at once ---
    const dirtyRecordsByTable = { habits: [], habitLogs: [] } as Record<SyncDatabaseTables, SyncableEntity[]>;

    await db.transaction('rw', SYNC_TABLES, async () => {
      for (const tableName of SYNC_TABLES) {
        const claimed = await claimDirtyRecords(db, tableName);
        dirtyRecordsByTable[tableName] = claimed;
        claimedIdsByTable[tableName] = claimed.map(r => r.id);
      }
    });

    // --- Step 2: push to server ---
    const { serverSequence, serverDirtyRecords } = await pushToServer(lastSyncId, dirtyRecordsByTable);

    // --- Step 3: merge whatever the server sent back ---
    const tablesWithIncomingChanges = Object.keys(serverDirtyRecords) as SyncDatabaseTables[];
    if (tablesWithIncomingChanges.length > 0) {
      await db.transaction('rw', tablesWithIncomingChanges, async () => {
        for (const tableName of tablesWithIncomingChanges) {
          await mergeIncomingChanges(db, tableName, serverDirtyRecords[tableName] ?? []);
        }
      });
    }

    // --- Step 4: confirm our own pushed rows as synced ---
    await db.transaction('rw', SYNC_TABLES, async () => {
      for (const tableName of SYNC_TABLES) {
        await finalizePushedRecords(db, tableName, claimedIdsByTable[tableName]);
      }
    });

    await db.syncMeta.put({ key: 'lastSyncId', value: serverSequence });
  }
  catch (error) {
    console.error('[sync] Sync cycle failed, reverting claimed rows:', error);
    try {
      await db.transaction('rw', SYNC_TABLES, async () => {
        for (const tableName of SYNC_TABLES) {
          await revertClaimedRecords(db, tableName, claimedIdsByTable[tableName]);
        }
      });
    }
    catch (rollbackError) {
      console.error('[sync] CRITICAL: rollback itself failed:', rollbackError);
    }
    throw error;
  }
  finally {
    db.isSyncing = false;
  }
}
