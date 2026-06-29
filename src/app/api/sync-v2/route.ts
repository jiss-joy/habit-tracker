import { db } from "@/src/db";
import { SYNC_REGISTRY, SyncTableKey } from "@/src/db/sync-registry";
import { auth } from "@/src/lib/auth/auth";
import { and, eq, getTableColumns, gt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// TODO: Rename?
type NetworkSyncRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: number; // 🪦 Explicitly typing our integer tombstone flag (0 or 1)
  [columnName: string]: unknown;
};

type RequestParams = {
  lastSyncId: number;
  localDirtyRecords: Record<SyncTableKey, NetworkSyncRecord[]>;
}


export async function POST(request: Request) {
  try {
    const session = auth.api.getSession({
      headers: await headers(),
    });
    if (!session) return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    // 🔒 Extract active user identity context (replace with your auth session)
    const userId = "current_authenticated_user_id";
    const body = await request.json() as RequestParams;
    const { lastSyncId, localDirtyRecords } = body;

    if (typeof lastSyncId !== "number" || !localDirtyRecords) {
      return NextResponse.json({ error: "Malformed sync payload parameters." }, { status: 400 });
    }

    const serverDirtyRecords: Partial<Record<SyncTableKey, unknown[]>> = {};
    let currentGlobalSequenceHead = lastSyncId;

    await db.transaction(async (tx) => {
      const tableKeys = Object.keys(localDirtyRecords) as SyncTableKey[];

      for (const key of tableKeys) {
        const records = localDirtyRecords[key];
        if (!records || records.length === 0) continue;

        const tableSchema = SYNC_REGISTRY[key];
        const columns = getTableColumns(tableSchema);

        for (const clientRecord of records) {
          // Strip the local IndexedDB runtime synchronization state flag
          const { syncStatus, ...cleanedPayload } = clientRecord;

          const insertValues = {
            ...cleanedPayload,
            userId, // Enforce current tenant ownership context
            createdAt: new Date(clientRecord.createdAt),
            updatedAt: new Date(clientRecord.updatedAt),
            isDeleted: clientRecord.isDeleted ?? 0,
            // Defaults kick in here on initialization insertions automatically
          } as unknown as typeof tableSchema.$inferInsert;

          const { id, ...updateValues } = insertValues;

          await tx
            .insert(tableSchema)
            .values(insertValues)
            .onConflictDoUpdate({
              target: columns.id,
              set: {
                ...updateValues,
                // 💡 CRUCIAL: On conflict updates, default values are bypassed.
                // We must explicitly advance the sequence wheel for modified data rows.
                lastSyncId: sql`nextval('sync_sequence')`,
              },
              // Only overwrite database timeline if the incoming record is genuinely newer
              where: sql`${columns.updatedAt} < ${insertValues.updatedAt?.toISOString()}`,
            });
        }
      }

      // 2. Fetch the absolute current state value of the sequence tracker
      // This ensures we get the true timeline location, regardless of whether updates were made
      const seqResult = await tx.execute(sql`SELECT last_value FROM sync_sequence;`);
      currentGlobalSequenceHead = Number(seqResult[0].last_value);

      // ========================================================
      // === STEP 3: Process the Pull (Server -> Client) ========
      // ========================================================
      const allRegistryKeys = Object.keys(SYNC_REGISTRY) as SyncTableKey[];

      for (const key of allRegistryKeys) {
        const tableSchema = SYNC_REGISTRY[key];
        const columns = getTableColumns(tableSchema);

        // 🛡️ User Privacy Isolation: Multi-tenancy layer applied via query constraints
        const remoteChanges = await tx
          .select()
          .from(tableSchema)
          .where(
            and(
              eq(columns.userId, userId), // 🔒 Keep other users' modifications completely invisible
              gt(columns.lastSyncId, lastSyncId)
            )
          );

        serverDirtyRecords[key] = remoteChanges;
      }
    })

    // 4. Return accurate current sequence location along with localized deltas
    return NextResponse.json({
      serverSequence: currentGlobalSequenceHead,
      serverDirtyRecords,
    });
  } catch (error) {
    console.error("Critical error inside global sequence sync pipeline backend:", error);
    return NextResponse.json({ error: "Internal Synchronizer Error" }, { status: 500 });
  }
}