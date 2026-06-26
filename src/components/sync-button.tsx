"use client";

import { useState } from "react";
import { runSyncEngine } from "../lib/sync-engine"; // Adjust path to your client file

export function SyncStatusBar() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    console.log("🚀 Manual sync triggered...");
    
    await runSyncEngine();
    
    setIsSyncing(false);
    console.log("🏁 Manual sync execution finished.");
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "8px", margin: "1rem 0" }}>
      <button 
        onClick={handleSyncClick} 
        disabled={isSyncing}
        style={{ padding: "0.5rem 1rem", cursor: isSyncing ? "not-allowed" : "pointer" }}
      >
        {isSyncing ? "🔄 Synchronizing Cloud..." : "⚡ Sync Data Now"}
      </button>
    </div>
  );
}