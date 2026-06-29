import { DexieProvider } from "../../contexts/dexie-provider";
import { SyncEngineMount } from "@/src/lib/sync-engine/sync-engine-mount";

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DexieProvider>
      <SyncEngineMount />
      {children}
    </DexieProvider>
  );
}
