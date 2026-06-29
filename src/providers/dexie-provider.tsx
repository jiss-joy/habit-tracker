'use client';

import type { ReactNode } from 'react';
import type { AppDatabase } from '../dexie/db';
import { useEffect, useState } from 'react';
import { useSession } from '@/src/lib/auth/auth-client';
import { DexieContext } from '../contexts/dexie-context';
import { getDexieDb } from '../dexie/db';

export function DexieProvider({ children }: { children: ReactNode }) {
  const { data: authData } = useSession();
  const [db, setDb] = useState<AppDatabase | null>(null);

  useEffect(() => {
    if (!authData?.user) return;
    const { user } = authData;
    const dbInstance = getDexieDb(user.id);

    setDb(dbInstance);
  }, [authData?.user?.id]);

  if (!db) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="relative flex flex-col items-center max-w-sm w-full px-6 text-center">
          {/* Decorative App Icon / Logo Placeholder */}
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800/50">
            <svg
              className="h-6 w-6 text-indigo-600 dark:text-indigo-400 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>

          {/* Loading Text Typography */}
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 tracking-tight">
            Preparing your workspace
          </h3>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Securing offline storage & local sync engine...
          </p>

          {/* Sleek Minimalist Progress Bar */}
          <div className="mt-6 h-0.75 w-32 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full w-full bg-indigo-600 dark:bg-indigo-500 origin-left animate-infinite-loading rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <DexieContext value={db}>
      { children }
    </DexieContext>
  );
}
