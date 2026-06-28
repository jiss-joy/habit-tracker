import { pgEnum } from "drizzle-orm/pg-core";
import { enumToPgEnum } from "../helpers/enum-to-pg-enum";

export enum SyncStatus {
  MODIFIED = 'MODIFIED',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
}

export const syncStatusEnum = pgEnum('sync_status_enums', enumToPgEnum(SyncStatus));