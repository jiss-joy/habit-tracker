import { pgEnum } from 'drizzle-orm/pg-core';
import { enumToPgEnum } from '../helpers/enum-to-pg-enum';

export enum SyncStatus {
  DIRTY = 'DIRTY',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
}

export const syncStatusEnum = pgEnum('sync_status_enums', enumToPgEnum(SyncStatus));
