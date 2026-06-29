'use client'

import { AppDatabase } from "../../dexie/db";

// Define the table keys that participate in the sync cycle
export type SyncDatabaseTables = "habits" | "habitLogs";

export async function runSyncEngine(dexieDb: AppDatabase) {
	try {
		console.log("🔄 [SYNC ENGINE] Synchronization cycle initiated...");

		dexieDb.isSyncing = true;

		// ========================================================
		// === STEP 1: Gather Local Changes (Push Preparation) ====
		// ========================================================

		// Fetch the last successful sync checkpoint milestone
		const syncMetaRecord = await dexieDb.syncMeta.get("lastSyncedAt");
		const lastSyncedAt = syncMetaRecord ? syncMetaRecord.value : null;
		const lastSyncedAtDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);

		const localDirtyRecords: Record<SyncDatabaseTables, any[]> = {
			habits: [],
			habitLogs: [],
		};

		// Scan all participating tables for records modified since the last checkpoint
		const tableKeys: SyncDatabaseTables[] = ["habits", "habitLogs"];

		for (const tableKey of tableKeys) {
			const dirtyRows = await dexieDb
				.table(tableKey)
				.where("updatedAt")
				.above(lastSyncedAtDate)
				.toArray();

			localDirtyRecords[tableKey] = dirtyRows;
		}

		// Check if we even need to execute network traffic
		const hasLocalChanges = Object.values(localDirtyRecords).some(rows => rows.length > 0);
		if (!hasLocalChanges && lastSyncedAt) {
			console.log("😴 [SYNC ENGINE] No local modifications found. Proceeding to fetch cloud delta...");
		}

		// ========================================================
		// === STEP 2 & 3: Network Pipe Transmission ==============
		// ========================================================
		const response = await fetch("/api/sync", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				lastSyncedAt,
				localDirtyRecords,
			}),
		});

		// Network safety guard
		if (!response.ok) {
			throw new Error(`[SYNC ENGINE] Cloud synchronization endpoint rejected request with status: ${response.status}`);
		}

		// Parsing Cloud Response (Consuming the body stream exactly ONCE)
		const { serverTime, serverDirtyRecords } = await response.json() as {
			serverTime: string;
			serverDirtyRecords: Partial<Record<SyncDatabaseTables, any[]>>;
		};

		// ========================================================
		// === STEP 4: Merging Server Changes into IndexedDB ======
		// ========================================================
		const remoteTableKeys = Object.keys(serverDirtyRecords) as SyncDatabaseTables[];

		if (remoteTableKeys.length > 0) {
			// Execute an atomic Read/Write transaction across all tables being modified
			await dexieDb.transaction("rw", remoteTableKeys, async () => {
				for (const tableKey of remoteTableKeys) {
					const remoteRecords = serverDirtyRecords[tableKey];
					if (!remoteRecords || remoteRecords.length === 0) continue;

					const recordsToUpsert: unknown[] = [];

					for (const record of remoteRecords) {
						const baseHydration = {
							...record,
							createdAt: record.createdAt ? new Date(record.createdAt) : undefined,
							updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined,
						};

						// 2. 🛡️ Table-Specific Context Interceptor
						// This keeps the engine abstract while fixing the string format edge case
						if (tableKey === "habitLogs" && typeof baseHydration.logDate === "string") {
							baseHydration.logDate = baseHydration.logDate.split("T")[0];
						}

						// 3. ⚖️ Last-Write-Wins Conflict Resolution Check
						const localExisting = await dexieDb.table(tableKey).get(baseHydration.id);

						if (localExisting && localExisting.updatedAt) {
							const localTime = new Date(localExisting.updatedAt).getTime();
							const incomingTime = baseHydration.updatedAt ? baseHydration.updatedAt.getTime() : 0;

							// If our local un-pushed change is newer or identical to the server timestamp, 
							// reject the incoming server patch to prevent blowing away real-time user input.
							if (localTime >= incomingTime) {
								console.warn(`⚠️ [SYNC ENGINE] Conflict dropped for ${tableKey} [${baseHydration.id}]. Local data is newer.`);
								continue;
							}
						}

						recordsToUpsert.push(baseHydration);
					};

					// Bulk save only the items that survived conflict isolation
					if (recordsToUpsert.length > 0) {
						await dexieDb.table(tableKey).bulkPut(recordsToUpsert);
						console.debug(`📥 [SYNC ENGINE] Hydrated & merged ${recordsToUpsert.length} rows into local store: "${tableKey}"`);
					}
				}
			});
		}

		// ========================================================
		// === STEP 5: Baseline Milestone Advancement =============
		// ========================================================
		await dexieDb.syncMeta.put({
			key: "lastSyncedAt",
			value: serverTime,
		});

		console.log(`✨ [SYNC ENGINE] Sync cycle completed successfully. Baseline advanced to: ${serverTime}`);

	} catch (error) {
		console.error("❌ [SYNC ENGINE] The local sync engine encountered an execution fault:", error);
		throw error;
	} finally {
		dexieDb.isSyncing = false;
	}
}