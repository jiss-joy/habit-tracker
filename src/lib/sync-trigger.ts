// lib/sync-trigger.ts
import { AppDatabase } from '../dexie/db';
import { runSyncEngine } from './sync-engine';

const DEBOUNCE_DELAY = 3000;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

export function triggerDebouncedSync(dexieDb: AppDatabase) {
  if (timeoutId) clearTimeout(timeoutId);

  timeoutId = setTimeout(async () => {
    timeoutId = null;
    try {
      await runSyncEngine(dexieDb);
    } catch (error) {
      console.error("❌ Background sync failed:", error);
    }
  }, DEBOUNCE_DELAY);
}