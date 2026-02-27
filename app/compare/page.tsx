"use client";

import { useEffect, useState } from "react";
import { SpendRow } from "@/lib/types";
import { loadSpendData } from "@/lib/data";
import { useSpendStore } from "@/lib/store";
import VersionComparison from "@/components/VersionComparison";
import { Loader2 } from "lucide-react";

export default function ComparePage() {
  const [allRows, setAllRows] = useState<SpendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { versions } = useSpendStore();

  useEffect(() => {
    loadSpendData()
      .then(setAllRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Version Comparison</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare actual spend, planned spend, or any saved forecast version
        </p>
      </div>

      {allRows.length > 0 ? (
        <VersionComparison actualRows={allRows} />
      ) : (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          No spend data available
        </div>
      )}
    </div>
  );
}
