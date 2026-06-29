import { use } from 'react';
import { DexieContext } from '../contexts/dexie-context';

export function useDexieDb() {
  const context = use(DexieContext);
  if (!context) {
    throw new Error('useDexieDb must be used within a DbProvider');
  }

  return context;
}
