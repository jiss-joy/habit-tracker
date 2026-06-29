// components/sync-engine-mount.tsx
'use client';
import { useSyncOnNetworkChange } from '../../hooks/use-sync-on-network-change';

export function SyncEngineMount() {
  useSyncOnNetworkChange();
  return null;
}