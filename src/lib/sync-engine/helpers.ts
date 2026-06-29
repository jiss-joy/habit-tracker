import type { Table } from 'dexie';
import type { SyncEntity, SyncPushResponse, WireSyncEntity } from './types';
import type { AppDatabase, SyncDatabaseTables } from '@/src/dexie/db';
import { SyncStatus } from '@/src/db/enums/sync-status';
import { getDexieDb, NON_SYNC_TABLES } from '@/src/dexie/db';
import { API_PATHS } from '../api-paths';

function getSyncTable(dexieDb: AppDatabase, tableName: SyncDatabaseTables): Table<SyncEntity, string> {
  return dexieDb.table<SyncEntity, string>(tableName);
}

export function getSyncTableNames(db: AppDatabase): SyncDatabaseTables[] {
  return db.tables
    .map(table => table.name)
    .filter(name => !NON_SYNC_TABLES.has(name)) as SyncDatabaseTables[];
}

export async function fetchDirtyRecords(dexieDb: AppDatabase, tableName: SyncDatabaseTables): Promise<SyncEntity[]> {
  const table = getSyncTable(dexieDb, tableName);
  const dirtyRecords = await table.where('syncStatus').equals(SyncStatus.MODIFIED).toArray();
  if (dirtyRecords.length === 0) return [];

  const ids = dirtyRecords.map(row => row.id);
  await table.where('id').anyOf(ids).modify({ syncStatus: SyncStatus.SYNCING });

  return dirtyRecords;
}

export async function pushToServer(lastSyncId: number, dirtyRecordsByTable: Record<SyncDatabaseTables, SyncEntity[]>) {
  const response = await fetch(API_PATHS.v1Sync, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lastSyncId, localDirtyRecords: dirtyRecordsByTable }),
  });

  if (!response.ok) {
    throw new Error(`Sync push failed with status ${response.status}`);
  }

  return response.json() as Promise<SyncPushResponse>;
}

function hydrateWireRecord(record: WireSyncEntity) {
  const defaultDate = new Date(0);
  const hydrated: SyncEntity = {
    ...record,
    createdAt: record.createdAt ? new Date(record.createdAt) : defaultDate,
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : defaultDate,
  };

  return hydrated;
}

function checkIfLocalEditWins(incomingRecord: SyncEntity, localRecord?: SyncEntity): boolean {
  if (!localRecord) return false;

  const hasPendingLocalEdit = localRecord.syncStatus === SyncStatus.MODIFIED || localRecord.syncStatus === SyncStatus.SYNCING;
  if (!hasPendingLocalEdit) return false;

  return localRecord.updatedAt.getTime() >= incomingRecord.updatedAt.getTime();
}

export async function mergeIncomingChanges(
  dexieDb: AppDatabase,
  tableName: SyncDatabaseTables,
  incomingRecords: WireSyncEntity[],
): Promise<void> {
  if (incomingRecords.length === 0) return;

  const table = getSyncTable(dexieDb, tableName);
  const recordsToUpsert: SyncEntity[] = [];
  const idsToDelete: string[] = [];

  for (const wireRecord of incomingRecords) {
    const incomingRecord = hydrateWireRecord(wireRecord);
    const existingLocalRecord = await table.get(incomingRecord.id);

    const isLocalEditWins = checkIfLocalEditWins(incomingRecord, existingLocalRecord);
    if (existingLocalRecord && isLocalEditWins) {
      continue;
    }

    if (incomingRecord.isDeleted === 1) {
      idsToDelete.push(incomingRecord.id);
    }
    else {
      recordsToUpsert.push({ ...incomingRecord, syncStatus: SyncStatus.SYNCED });
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
export async function finalizePushedRecords(
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

// Rollback — on failure, dirty records are kept back so they're picked up again next cycle.
// Same "only touch rows still SYNCING" guard as finalize, for the same reason.
// ============================================================================

export async function revertDirtyRecords(
  db: AppDatabase,
  tableName: SyncDatabaseTables,
  dirtyRecordIds: string[],
): Promise<void> {
  if (dirtyRecordIds.length === 0) return;

  const table = getSyncTable(db, tableName);
  await table
    .where('id')
    .anyOf(dirtyRecordIds)
    .and(row => row.syncStatus === SyncStatus.SYNCING)
    .modify({ syncStatus: SyncStatus.MODIFIED });
}
