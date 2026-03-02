"use client";

import { useEffect } from "react";
import { useSpendStore } from "@/lib/store";
import VersionComparison from "@/components/VersionComparison";
import { Loader2 } from "lucide-react";

export default function ComparePage() {
  const { spendRows, isLoaded, loadSpendRows } = useSpendStore();

  useEffect(() => {
    loadSpendRows().catch(console.error);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Version Comparison</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare actual spend, planned spend, or any saved forecast version
        </p>
      </div>
      <VersionComparison actualRows={spendRows} />
    </div>
  );
}
