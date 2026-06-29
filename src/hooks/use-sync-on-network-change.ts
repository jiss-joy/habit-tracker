'use client';

import { useEffect } from 'react';
import { useDexieDb } from '../contexts/dexie-provider';
import { triggerSync } from '../lib/sync-engine/sync-trigger';

export function useSyncOnNetworkChange() {
  const db = useDexieDb();

  useEffect(() => {
    if (navigator.onLine) {
      triggerSync(db, false);
    }

    const handleRevalidation = () => {
      console.log("⚡ [SYNC TRIGGER] Network change or window focus detected.");
      if (navigator.onLine) {
        triggerSync(db, true, 150);
      }
    };

    window.addEventListener('online', handleRevalidation);
    window.addEventListener('focus', handleRevalidation);

    return () => {
      window.removeEventListener('online', handleRevalidation);
      window.removeEventListener('focus', handleRevalidation);
    };
  }, [db]);
}