"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  invoices: number;
  unbilled: number;
}

export function SyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch("/api/stripe/sync", { method: "POST" });
      const data = await response.json();
      if (data.success) {
        setResult({
          synced: data.synced,
          created: data.created,
          updated: data.updated,
          invoices: data.invoices,
          unbilled: data.unbilled,
        });
        // Refresh the page data
        router.refresh();
      } else {
        setError(data.error || "Sync failed");
      }
    } catch (err) {
      console.error("Sync failed:", err);
      setError("Network error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Check className="h-3 w-3 text-green-600" />
          {result.synced} customers, {result.invoices} invoices, {result.unbilled} projections
        </span>
      )}
      {error && (
        <span className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </span>
      )}
      <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync Now"}
      </Button>
    </div>
  );
}



