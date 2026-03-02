"use client";

import { useEffect } from "react";
import { filterRows } from "@/lib/utils";
import { useSpendStore } from "@/lib/store";
import KPICards from "@/components/KPICards";
import SpendChart from "@/components/SpendChart";
import SpendTable from "@/components/SpendTable";
import Filters from "@/components/Filters";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { spendRows, isLoaded, loadSpendRows, filters } = useSpendStore();

  useEffect(() => {
    loadSpendRows().catch(console.error);
  }, []);

  const filteredRows = filterRows(spendRows, filters);

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
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor actual vs. planned spend across channels, geos, games, and platforms
        </p>
      </div>
      <Filters rows={spendRows} />
      <KPICards rows={filteredRows} />
      <SpendChart rows={filteredRows} />
      <SpendTable rows={filteredRows} />
    </div>
  );
}
