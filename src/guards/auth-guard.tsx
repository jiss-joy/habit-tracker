'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/src/lib/auth/auth-client';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { data: authData, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !authData) {
      router.replace('/login');
    }
  }, [isPending, authData, router]);

  if (isPending || !authData) {
    // TODO: Change this loading state
    return <div>Checking auth</div>
  }

  return <>{children}</>;
}