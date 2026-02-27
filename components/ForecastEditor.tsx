"use client";

import { useState, useMemo } from "react";
import { ForecastRow } from "@/lib/types";
import { useSpendStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Save, FolderOpen, Trash2, PlusCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  rows: ForecastRow[];
};

type GroupKey = "channel" | "geo";

function groupRows(rows: ForecastRow[], by: GroupKey) {
  const map = new Map<string, ForecastRow[]>();
  for (const row of rows) {
    const key = row[by];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return map;
}

export default function ForecastEditor({ rows }: Props) {
  const {
    versions,
    activeVersionId,
    updateForecastCell,
    saveVersion,
    loadVersion,
    deleteVersion,
    currentForecastRows,
  } = useSpendStore();

  const [saveName, setSaveName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupKey>("channel");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => groupRows(rows, groupBy), [rows, groupBy]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveVersion(saveName.trim(), rows);
    setSaveName("");
    setShowSaveForm(false);
  };

  // Map rows to their global indices for updates
  const rowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, i) => {
      map.set(`${row.date}|${row.channel}|${row.geo}`, i);
    });
    return map;
  }, [rows]);

  const getRowIndex = (row: ForecastRow) => rowIndexMap.get(`${row.date}|${row.channel}|${row.geo}`) ?? -1;

  const groupTotal = (groupRows: ForecastRow[]) =>
    groupRows.reduce((s, r) => s + r.forecast_spend, 0);

  const grandTotal = rows.reduce((s, r) => s + r.forecast_spend, 0);

  return (
    <div className="space-y-4">
      {/* Version toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-medium text-muted-foreground">Active version:</span>
              <span className="text-sm font-semibold">
                {activeVersionId
                  ? versions.find((v) => v.id === activeVersionId)?.name ?? "Unknown"
                  : "Unsaved draft"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Load version dropdown */}
              {versions.length > 0 && (
                <Select
                  value={activeVersionId ?? ""}
                  onChange={(e) => {
                    if (e.target.value) loadVersion(e.target.value);
                  }}
                  className="w-44"
                >
                  <option value="">Load version...</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowSaveForm((p) => !p)}
              >
                <Save className="h-3.5 w-3.5" />
                Save version
              </Button>
            </div>
          </div>

          {showSaveForm && (
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Version name (e.g. Q2 Aggressive)"
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              <Button size="sm" onClick={handleSave} disabled={!saveName.trim()}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSaveForm(false)}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved versions list */}
      {versions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Saved Versions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-1.5">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors",
                    v.id === activeVersionId ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                  )}
                >
                  <div>
                    <span className="font-medium">{v.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Total: {formatCurrency(v.rows.reduce((s, r) => s + r.forecast_spend, 0))}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadVersion(v.id)}
                      className="h-7 px-2 gap-1"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteVersion(v.id)}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Editable table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold">
            Edit Forecast
            <span className="text-sm font-normal text-muted-foreground ml-2">
              Total: {formatCurrency(grandTotal)}
            </span>
          </CardTitle>
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupKey)}
            className="w-32"
          >
            <option value="channel">By Channel</option>
            <option value="geo">By GEO</option>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Group / Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {groupBy === "channel" ? "GEO" : "Channel"}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Forecast Spend
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from(grouped.entries()).map(([groupKey, groupRows]) => {
                  const isExpanded = expandedGroups.has(groupKey);
                  const total = groupTotal(groupRows);
                  return (
                    <>
                      {/* Group header row */}
                      <tr
                        key={`group-${groupKey}`}
                        className="border-b bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => toggleGroup(groupKey)}
                      >
                        <td className="px-4 py-2.5 font-semibold" colSpan={3}>
                          <span className="mr-2 text-muted-foreground">{isExpanded ? "▾" : "▸"}</span>
                          {groupKey}
                          <span className="text-xs font-normal text-muted-foreground ml-2">
                            ({groupRows.length} rows)
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold">
                          {formatCurrency(total)}
                        </td>
                      </tr>
                      {/* Detail rows */}
                      {isExpanded &&
                        groupRows.map((row) => {
                          const idx = getRowIndex(row);
                          return (
                            <tr
                              key={`${row.date}|${row.channel}|${row.geo}`}
                              className="border-b hover:bg-muted/20 transition-colors"
                            >
                              <td className="px-4 py-2 pl-8 text-muted-foreground text-xs">
                                {groupBy === "channel" ? row.channel : row.geo}
                              </td>
                              <td className="px-4 py-2 text-xs">
                                {groupBy === "channel" ? row.geo : row.channel}
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">
                                {new Date(row.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">$</span>
                                  <input
                                    type="number"
                                    value={row.forecast_spend}
                                    onChange={(e) => {
                                      if (idx >= 0) {
                                        updateForecastCell(idx, Number(e.target.value));
                                      }
                                    }}
                                    className="w-28 h-7 rounded border border-input bg-background px-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                                    min={0}
                                    step={1000}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
