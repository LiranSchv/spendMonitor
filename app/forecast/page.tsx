"use client";

import { useEffect, useState } from "react";
import { useSpendStore } from "@/lib/store";
import ForecastEditor from "@/components/ForecastEditor";
import { buildFutureForecastSkeleton, getNextMonday, addWeeksToDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const TODAY = "2026-03-02";
const FORECAST_START = getNextMonday(TODAY);          // 2026-03-03
const DEFAULT_END = addWeeksToDate(FORECAST_START, 13); // 3 months default

export default function ForecastPage() {
  const { spendRows, isLoaded, loadSpendRows, currentForecastRows, setCurrentForecastRows } = useSpendStore();
  const [forecastEnd, setForecastEnd] = useState(DEFAULT_END);

  useEffect(() => {
    loadSpendRows().catch(console.error);
  }, []);

  // Init or rebuild forecast skeleton when data loads or end date changes
  useEffect(() => {
    if (!isLoaded || spendRows.length === 0) return;
    if (currentForecastRows.length > 0) return; // don't reset existing edits
    const skeleton = buildFutureForecastSkeleton(spendRows, FORECAST_START, forecastEnd);
    setCurrentForecastRows(skeleton);
  }, [isLoaded]);

  const handleEndDateChange = (newEnd: string) => {
    if (!isLoaded || spendRows.length === 0 || newEnd === forecastEnd) return;
    setForecastEnd(newEnd);
    if (newEnd < forecastEnd) {
      // Shrinking: drop rows beyond new end, preserve edits on remaining
      setCurrentForecastRows(currentForecastRows.filter((r) => r.date <= newEnd));
    } else {
      // Extending: keep existing edited rows, append skeleton for new weeks only
      const firstNewWeek = addWeeksToDate(forecastEnd, 1);
      const newRows = buildFutureForecastSkeleton(spendRows, firstNewWeek, newEnd);
      setCurrentForecastRows([...currentForecastRows, ...newRows]);
    }
  };

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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Forecast Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build forward-looking spend forecasts from {FORECAST_START} · Use bulk edit or AI assistant to update values
        </p>
      </div>

      {currentForecastRows.length > 0 ? (
        <ForecastEditor
          rows={currentForecastRows}
          forecastStart={FORECAST_START}
          forecastEnd={forecastEnd}
          onEndDateChange={handleEndDateChange}
        />
      ) : (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          Generating forecast skeleton…
        </div>
      )}
    </div>
  );
}
