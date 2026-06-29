import { SyncEngineMount } from '@/src/lib/sync-engine/sync-engine-mount';
import { DexieProvider } from '../../contexts/dexie-context';

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
