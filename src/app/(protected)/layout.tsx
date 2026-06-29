import { SyncEngineMount } from '@/src/lib/sync-engine/sync-engine-mount';
import { DexieProvider } from '../../providers/dexie-provider';

export default function HomeLayout({
  children,
}: Readonly<{
  children:
  React.ReactNode;
}>) {
  return (
    <DexieProvider>
      <SyncEngineMount />
      {children}
    </DexieProvider>
  );
}
