"use client";

import { useEffect, useState } from "react";
import { SpendRow } from "@/lib/types";
import { getUniqueChannels, getUniqueGeos } from "@/lib/utils";
import { useSpendStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = {
  rows: SpendRow[];
};

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              selected.includes(opt)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-accent"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Filters({ rows }: Props) {
  const { filters, setFilters, resetFilters } = useSpendStore();
  const channels = getUniqueChannels(rows);
  const geos = getUniqueGeos(rows);

  const dates = rows.map((r) => r.date).sort();
  const minDate = dates[0] ?? "";
  const maxDate = dates[dates.length - 1] ?? "";

  const hasActiveFilters =
    filters.channels.length > 0 ||
    filters.geos.length > 0 ||
    filters.startDate !== "" ||
    filters.endDate !== "";

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-xs">
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Date Range
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate || minDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setFilters({ startDate: e.target.value })}
              className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={filters.endDate || maxDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setFilters({ endDate: e.target.value })}
              className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <MultiSelect
        label="Channels"
        options={channels}
        selected={filters.channels}
        onChange={(v) => setFilters({ channels: v })}
      />

      <MultiSelect
        label="GEOs"
        options={geos}
        selected={filters.geos}
        onChange={(v) => setFilters({ geos: v })}
      />
    </div>
  );
}
