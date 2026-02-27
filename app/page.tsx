"use client";

import { useEffect, useState } from "react";
import { SpendRow } from "@/lib/types";
import { loadSpendData } from "@/lib/data";
import { filterRows } from "@/lib/utils";
import { useSpendStore } from "@/lib/store";
import KPICards from "@/components/KPICards";
import SpendChart from "@/components/SpendChart";
import SpendTable from "@/components/SpendTable";
import Filters from "@/components/Filters";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const [allRows, setAllRows] = useState<SpendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { filters } = useSpendStore();

  useEffect(() => {
    loadSpendData()
      .then(setAllRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredRows = filterRows(allRows, filters);

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
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor actual vs. planned spend across channels and geographies
        </p>
      </div>

      <Filters rows={allRows} />

      <KPICards rows={filteredRows} />

      <SpendChart rows={filteredRows} />

      <SpendTable rows={filteredRows} />
    </div>
  );
}
