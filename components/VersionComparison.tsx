"use client";

import { useMemo, useState } from "react";
import { SpendRow, ForecastVersion, CompareRow } from "@/lib/types";
import { useSpendStore } from "@/lib/store";
import {
  aggregateByChannel,
  aggregateByGeo,
  aggregateByPeriod,
  aggregateForecastByChannel,
  aggregateForecastByGeo,
  buildCompareRows,
  formatCurrency,
} from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

type Props = {
  actualRows: SpendRow[];
};

type GroupBy = "channel" | "geo";

function getSourceLabel(id: string, versions: ForecastVersion[]): string {
  if (id === "actual") return "Actual";
  if (id === "planned") return "Planned";
  const v = versions.find((v) => v.id === id);
  return v?.name ?? "Unknown";
}

function buildGroupedValues(
  sourceId: string,
  actualRows: SpendRow[],
  versions: ForecastVersion[],
  groupBy: GroupBy
): { key: string; label: string; value: number }[] {
  if (sourceId === "actual") {
    const agg = groupBy === "channel" ? aggregateByChannel(actualRows) : aggregateByGeo(actualRows);
    return agg.map((r) => ({ key: r.key, label: r.label, value: r.actual_spend }));
  }
  if (sourceId === "planned") {
    const agg = groupBy === "channel" ? aggregateByChannel(actualRows) : aggregateByGeo(actualRows);
    return agg.map((r) => ({ key: r.key, label: r.label, value: r.planned_spend }));
  }
  const version = versions.find((v) => v.id === sourceId);
  if (!version) return [];
  const agg = groupBy === "channel"
    ? aggregateForecastByChannel(version)
    : aggregateForecastByGeo(version);
  return agg.map((r) => ({ key: r.key, label: r.label, value: r.actual_spend }));
}

export default function VersionComparison({ actualRows }: Props) {
  const { versions } = useSpendStore();

  const [sourceA, setSourceA] = useState("actual");
  const [sourceB, setSourceB] = useState(versions[0]?.id ?? "planned");
  const [groupBy, setGroupBy] = useState<GroupBy>("channel");

  const sourceOptions = [
    { id: "actual", label: "Actual Spend" },
    { id: "planned", label: "Planned Spend" },
    ...versions.map((v) => ({ id: v.id, label: v.name })),
  ];

  const compareRows = useMemo(() => {
    const valA = buildGroupedValues(sourceA, actualRows, versions, groupBy);
    const valB = buildGroupedValues(sourceB, actualRows, versions, groupBy);
    return buildCompareRows(valA, valB);
  }, [sourceA, sourceB, actualRows, versions, groupBy]);

  const totalA = compareRows.reduce((s, r) => s + r.valueA, 0);
  const totalB = compareRows.reduce((s, r) => s + r.valueB, 0);
  const totalDelta = totalB - totalA;
  const totalDeltaPct = totalA !== 0 ? (totalDelta / totalA) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Version A:</label>
              <Select
                value={sourceA}
                onChange={(e) => setSourceA(e.target.value)}
                className="w-44"
              >
                {sourceOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <span className="text-muted-foreground font-bold">vs.</span>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Version B:</label>
              <Select
                value={sourceB}
                onChange={(e) => setSourceB(e.target.value)}
                className="w-44"
              >
                {sourceOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm font-medium text-muted-foreground">Group by:</label>
              <Select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="w-32"
              >
                <option value="channel">Channel</option>
                <option value="geo">GEO</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {getSourceLabel(sourceA, versions)}
            </p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalA)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {getSourceLabel(sourceB, versions)}
            </p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(totalB)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Delta (B − A)</p>
            <p
              className={cn(
                "text-2xl font-bold mt-1",
                totalDelta > 0 ? "text-red-600" : totalDelta < 0 ? "text-green-600" : "text-gray-600"
              )}
            >
              {totalDelta > 0 ? "+" : ""}{formatCurrency(totalDelta)}
              <span className="text-sm font-normal ml-1">
                ({totalDeltaPct > 0 ? "+" : ""}{totalDeltaPct.toFixed(1)}%)
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {getSourceLabel(sourceA, versions)} vs. {getSourceLabel(sourceB, versions)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {groupBy === "channel" ? "Channel" : "GEO"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    A: {getSourceLabel(sourceA, versions)}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-600 uppercase tracking-wider">
                    B: {getSourceLabel(sourceB, versions)}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Delta ($)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Delta (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr
                    key={row.key}
                    className={cn("border-b transition-colors hover:bg-muted/30", i % 2 === 0 ? "" : "bg-muted/10")}
                  >
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3 font-mono text-blue-700">{formatCurrency(row.valueA)}</td>
                    <td className="px-4 py-3 font-mono text-purple-700">{formatCurrency(row.valueB)}</td>
                    <td className="px-4 py-3 font-mono">
                      <span className={cn("font-medium", row.delta > 0 ? "text-red-600" : row.delta < 0 ? "text-green-600" : "text-gray-500")}>
                        {row.delta > 0 ? "+" : ""}{formatCurrency(row.delta)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                          Math.abs(row.deltaPct) < 2
                            ? "bg-gray-100 text-gray-600"
                            : row.deltaPct > 10
                            ? "bg-red-100 text-red-700"
                            : row.deltaPct > 0
                            ? "bg-orange-100 text-orange-700"
                            : row.deltaPct < -10
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        )}
                      >
                        {row.deltaPct > 0 ? "+" : ""}{row.deltaPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/30">
                  <td className="px-4 py-3 font-bold text-xs uppercase tracking-wider">Total</td>
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">{formatCurrency(totalA)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-purple-700">{formatCurrency(totalB)}</td>
                  <td className="px-4 py-3 font-mono font-bold">
                    <span className={cn(totalDelta > 0 ? "text-red-600" : "text-green-600")}>
                      {totalDelta > 0 ? "+" : ""}{formatCurrency(totalDelta)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                      totalDeltaPct > 5 ? "bg-red-100 text-red-700" : totalDeltaPct < -5 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {totalDeltaPct > 0 ? "+" : ""}{totalDeltaPct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
