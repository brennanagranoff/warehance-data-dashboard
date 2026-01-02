"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download } from "lucide-react";
import { useRouter } from "next/navigation";

export function FullSyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const response = await fetch("/api/stripe/sync-full", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        const stats = [];
        if (data.customers) stats.push(`${data.customers.synced} customers`);
        if (data.invoices) stats.push(`${data.invoices.total} invoices`);
        if (data.usage) stats.push(`${data.usage.synced} usage records`);
        setResult(stats.join(", "));
        router.refresh();
      } else {
        setResult("Sync failed");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setResult("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-sm text-muted-foreground">Synced: {result}</span>
      )}
      <Button onClick={handleSync} disabled={syncing} variant="outline">
        {syncing ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {syncing ? "Syncing all data..." : "Full Sync"}
      </Button>
    </div>
  );
}





