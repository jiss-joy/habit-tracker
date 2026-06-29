import type { AppDatabase } from '@/src/dexie/db';
import { runSyncEngine } from './sync-engine';

const DEBOUNCE_DELAY = 3000;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

export function triggerSync(dexieDb: AppDatabase, debounced: boolean = false, debounceDelay: number = DEBOUNCE_DELAY) {
  if (timeoutId) clearTimeout(timeoutId);

  timeoutId = setTimeout(async () => {
    timeoutId = null;
    try {
      await runSyncEngine(dexieDb);
    }
    catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  }, debounced ? debounceDelay : 0);
}
