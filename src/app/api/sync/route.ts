import { NextResponse } from "next/server";
import { sql, getTableColumns, gt } from "drizzle-orm";
import { db } from "../../../db";
import { SYNC_REGISTRY, SyncTableKey } from "../../../db/sync-registry";

type NetworkSyncRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: number; // 🪦 Explicitly typing our integer tombstone flag (0 or 1)
  [columnName: string]: unknown;
};

export async function POST(request: Request) {
  try {
    const serverTime = new Date().toISOString();
    const body = await request.json();

    const { lastSyncedAt, localDirtyRecords } = body as {
      lastSyncedAt: string | null;
      localDirtyRecords: Record<SyncTableKey, NetworkSyncRecord[]>;
    };

    const lastSyncedAtDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);
    const tableKeys = Object.keys(localDirtyRecords) as SyncTableKey[];

    // ========================================================
    // === STEP 2: Process the Push (Client -> Server) ========
    // ========================================================
    for (const key of tableKeys) {
      const records = localDirtyRecords[key];
      if (!records || records.length === 0) continue;

      const tableSchema = SYNC_REGISTRY[key];
      const columns = getTableColumns(tableSchema);

      for (const clientRecord of records) {
        // Rehydrate strings into proper JavaScript Dates
        const formattedRecord = {
          ...clientRecord,
          createdAt: new Date(clientRecord.createdAt),
          updatedAt: new Date(clientRecord.updatedAt),
          // Ensure isDeleted defaults safely to 0 if the client record dropped it
          isDeleted: clientRecord.isDeleted ?? 0,
        };

        const insertValues = formattedRecord as unknown as typeof tableSchema.$inferInsert;
        const { id, ...updateValues } = insertValues;

        // 🪦 Because of your generic design, updateValues dynamically includes 'isDeleted'.
        // Postgres receives the 1 or 0 and updates the cloud row perfectly.
        await db
          .insert(tableSchema)
          .values(insertValues)
          .onConflictDoUpdate({
            target: columns.id,
            set: updateValues,
            where: sql`${columns.updatedAt} < ${insertValues.updatedAt?.toISOString()}`,
          });
      }
    }

    // ========================================================
    // === STEP 3: Process the Pull (Server -> Client) ========
    // ========================================================
    const serverDirtyRecords: Partial<Record<SyncTableKey, unknown[]>> = {};
    const allRegistryKeys = Object.keys(SYNC_REGISTRY) as SyncTableKey[];

    for (const key of allRegistryKeys) {
      const tableSchema = SYNC_REGISTRY[key];
      const columns = getTableColumns(tableSchema);

      // 🪦 This query pulls ANY record modified since lastSyncedAtDate.
      // If a row was marked deleted (isDeleted = 1), its updatedAt was bumped, 
      // meaning it is caught here and broadcasted down to all other user devices!
      const remoteChanges = await db
        .select()
        .from(tableSchema)
        .where(gt(columns.updatedAt, lastSyncedAtDate));

      serverDirtyRecords[key] = remoteChanges;
    }

    return NextResponse.json({
      serverTime,
      serverDirtyRecords,
    });

  } catch (error) {
    console.error("Critical fault inside cloud sync pipeline handler:", error);
    return NextResponse.json({ error: "Internal Synchronizer Error" }, { status: 500 });
  }
}