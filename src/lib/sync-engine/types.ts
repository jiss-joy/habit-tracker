import type { SyncStatus } from '@/src/db/enums/sync-status';
import type { SyncDatabaseTables } from '@/src/dexie/db';

export interface SyncEntity {
  id: string;
  syncStatus: SyncStatus;
  isDeleted: 0 | 1;
  createdAt: Date;
  updatedAt: Date;
}

/** Same shape, but as it travels over the wire — dates are strings or absent, not Date objects. */
export type WireSyncEntity = Omit<SyncEntity, 'updatedAt' | 'createdAt'> & {
  createdAt?: string;
  updatedAt?: string;
};

export interface SyncPushResponse {
  serverSequence: number;
  serverDirtyRecords: Partial<Record<SyncDatabaseTables, WireSyncEntity[]>>;
}
