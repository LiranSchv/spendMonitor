"use client";

import { useEffect, useState } from "react";
import { SpendRow } from "@/lib/types";
import { loadSpendData } from "@/lib/data";
import { useSpendStore } from "@/lib/store";
import ForecastEditor from "@/components/ForecastEditor";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForecastPage() {
  const [allRows, setAllRows] = useState<SpendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentForecastRows, initForecastFromActual } = useSpendStore();

  useEffect(() => {
    loadSpendData()
      .then((rows) => {
        setAllRows(rows);
        // Only init if no forecast rows exist
        if (currentForecastRows.length === 0) {
          initForecastFromActual(rows);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleReset = () => {
    if (allRows.length > 0) {
      initForecastFromActual(allRows);
    }
  };

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forecast Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit spend forecasts by channel and geo, save versions for comparison
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Reset to Actual
        </Button>
      </div>

      {currentForecastRows.length > 0 ? (
        <ForecastEditor rows={currentForecastRows} />
      ) : (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          No forecast data. Loading...
        </div>
      )}
    </div>
  );
}
