import { AuthGuard } from "@/src/guards/auth-guard";
import { DexieProvider } from "../../contexts/dexie-provider";
import { SyncEngineMount } from "@/src/lib/sync-engine/sync-engine-mount";

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard>
      <DexieProvider>
        <SyncEngineMount/>
        {children}
      </DexieProvider>
    </AuthGuard>
  );
}
