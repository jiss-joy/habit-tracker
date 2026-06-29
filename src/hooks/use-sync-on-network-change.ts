'use client';

import { useEffect } from 'react';
import { triggerSync } from '../lib/sync-engine/sync-trigger';
import { useDexieDb } from './use-dexie-db';

export function useSyncOnNetworkChange() {
  const db = useDexieDb();

  useEffect(() => {
    if (navigator.onLine) {
      triggerSync(db, false);
    }

    const handleRevalidation = () => {
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
