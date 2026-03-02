"use client";

import { useMemo, useState } from "react";
import { SpendRow, ForecastVersion, CompareRow, GroupBy } from "@/lib/types";
import { useSpendStore } from "@/lib/store";
import {
  aggregateByChannel, aggregateByGeo, aggregateByGame, aggregateByPlatform,
  aggregateForecastByChannel, aggregateForecastByGeo, aggregateForecastByGame, aggregateForecastByPlatform,
  buildCompareRows, formatCurrency,
} from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

type Props = { actualRows: SpendRow[] };

type CompareGroupBy = Exclude<GroupBy, "all" | "period">;

function getSourceLabel(id: string, versions: ForecastVersion[]): string {
  if (id === "actual") return "Actual";
  if (id === "planned") return "Planned";
  return versions.find((v) => v.id === id)?.name ?? "Unknown";
}

function buildGroupedValues(
  sourceId: string,
  actualRows: SpendRow[],
  versions: ForecastVersion[],
  groupBy: CompareGroupBy
): { key: string; label: string; value: number }[] {
  if (sourceId === "actual" || sourceId === "planned") {
    const isActual = sourceId === "actual";
    let agg;
    if (groupBy === "channel") agg = aggregateByChannel(actualRows);
    else if (groupBy === "geo") agg = aggregateByGeo(actualRows);
    else if (groupBy === "game") agg = aggregateByGame(actualRows);
    else agg = aggregateByPlatform(actualRows);
    return agg.map((r) => ({ key: r.key, label: r.label, value: isActual ? r.actual_spend : r.planned_spend }));
  }

  const version = versions.find((v) => v.id === sourceId);
  if (!version) return [];
  let agg;
  if (groupBy === "channel") agg = aggregateForecastByChannel(version);
  else if (groupBy === "geo") agg = aggregateForecastByGeo(version);
  else if (groupBy === "game") agg = aggregateForecastByGame(version);
  else agg = aggregateForecastByPlatform(version);
  return agg;
}

export default function VersionComparison({ actualRows }: Props) {
  const { versions } = useSpendStore();

  const [sourceA, setSourceA] = useState("actual");
  const [sourceB, setSourceB] = useState(versions[0]?.id ?? "planned");
  const [groupBy, setGroupBy] = useState<CompareGroupBy>("channel");

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

  function deltaBadge(pct: number) {
    const abs = Math.abs(pct);
    if (abs < 2) return "bg-muted text-muted-foreground";
    if (pct > 10) return "bg-red-950/60 text-red-400";
    if (pct > 0) return "bg-orange-950/60 text-orange-400";
    if (pct < -10) return "bg-green-950/60 text-green-400";
    return "bg-blue-950/60 text-blue-400";
  }

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Version A:</label>
              <Select value={sourceA} onChange={(e) => setSourceA(e.target.value)} className="w-44">
                {sourceOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
            </div>
            <span className="text-muted-foreground font-bold">vs.</span>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Version B:</label>
              <Select value={sourceB} onChange={(e) => setSourceB(e.target.value)} className="w-44">
                {sourceOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm font-medium text-muted-foreground">Group by:</label>
              <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as CompareGroupBy)} className="w-32">
                <option value="channel">Channel</option>
                <option value="geo">GEO</option>
                <option value="game">Game</option>
                <option value="platform">Platform</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: getSourceLabel(sourceA, versions), value: totalA, color: "text-primary" },
          { label: getSourceLabel(sourceB, versions), value: totalB, color: "text-purple-400" },
          {
            label: "Delta (B − A)",
            value: totalDelta,
            color: totalDelta > 0 ? "text-red-400" : totalDelta < 0 ? "text-green-400" : "text-muted-foreground",
            extra: `(${totalDeltaPct > 0 ? "+" : ""}${totalDeltaPct.toFixed(1)}%)`,
          },
        ].map((card) => (
          <Card key={card.label} className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                {card.value > 0 && card.extra ? "+" : ""}{formatCurrency(card.value)}
                {card.extra && <span className="text-sm font-normal ml-1 text-muted-foreground">{card.extra}</span>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            {getSourceLabel(sourceA, versions)} vs. {getSourceLabel(sourceB, versions)}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {[groupBy === "channel" ? "Channel" : groupBy === "geo" ? "GEO" : groupBy === "game" ? "Game" : "Platform",
                    `A: ${getSourceLabel(sourceA, versions)}`,
                    `B: ${getSourceLabel(sourceB, versions)}`,
                    "Delta ($)", "Delta (%)"
                  ].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={row.key} className={cn("border-b border-border/50 transition-colors hover:bg-muted/20", i % 2 === 1 && "bg-muted/5")}>
                    <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                    <td className="px-4 py-3 font-mono text-primary">{formatCurrency(row.valueA)}</td>
                    <td className="px-4 py-3 font-mono text-purple-400">{formatCurrency(row.valueB)}</td>
                    <td className="px-4 py-3 font-mono">
                      <span className={cn("font-medium", row.delta > 0 ? "text-red-400" : row.delta < 0 ? "text-green-400" : "text-muted-foreground")}>
                        {row.delta > 0 ? "+" : ""}{formatCurrency(row.delta)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", deltaBadge(row.deltaPct))}>
                        {row.deltaPct > 0 ? "+" : ""}{row.deltaPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20">
                  <td className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Total</td>
                  <td className="px-4 py-3 font-mono font-bold text-primary">{formatCurrency(totalA)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-purple-400">{formatCurrency(totalB)}</td>
                  <td className="px-4 py-3 font-mono font-bold">
                    <span className={cn(totalDelta > 0 ? "text-red-400" : "text-green-400")}>
                      {totalDelta > 0 ? "+" : ""}{formatCurrency(totalDelta)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", deltaBadge(totalDeltaPct))}>
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
