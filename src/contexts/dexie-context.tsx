// providers/dexie-provider.tsx
'use client';

import type { AppDatabase } from '../dexie/db';
import { createContext } from 'react';

export const DexieContext = createContext<AppDatabase | null>(null);
