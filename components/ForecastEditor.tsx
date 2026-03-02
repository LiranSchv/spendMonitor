"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import { ForecastRow, ForecastOperation, Game, Platform } from "@/lib/types";
import { useSpendStore } from "@/lib/store";
import { formatCurrency, getUniqueChannels, getUniqueGeos, getUniqueGames, getUniquePlatforms, addWeeksToDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Save, FolderOpen, Trash2, Sparkles, Loader2, ChevronDown, ChevronRight, Wand2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  rows: ForecastRow[];
  forecastStart: string;
  forecastEnd: string;
  onEndDateChange: (d: string) => void;
};

// ── Dimension Pill Selector ───────────────────────────────────────────────────
function DimSelector({
  label, options, selected, onChange,
}: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const allSelected = selected.length === 0;
  const toggle = (v: string) =>
    selected.includes(v) ? onChange(selected.filter((s) => s !== v)) : onChange([...selected, v]);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => onChange([])} className={cn("pill", allSelected ? "pill-active" : "pill-inactive")}>All</button>
        {options.map((o) => (
          <button key={o} onClick={() => toggle(o)} className={cn("pill", selected.includes(o) ? "pill-active" : "pill-inactive")}>{o}</button>
        ))}
      </div>
    </div>
  );
}

// ── Version Panel ─────────────────────────────────────────────────────────────
function VersionPanel({ rows }: { rows: ForecastRow[] }) {
  const { versions, activeVersionId, saveVersion, loadVersion, deleteVersion } = useSpendStore();
  const [saveName, setSaveName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleSave = () => {
    if (!saveName.trim()) return;
    saveVersion(saveName.trim(), rows);
    setSaveName("");
    setShowForm(false);
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 text-sm">
            <span className="text-muted-foreground">Active: </span>
            <span className="font-semibold text-foreground">
              {activeVersionId ? versions.find((v) => v.id === activeVersionId)?.name ?? "Unknown" : "Unsaved draft"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {versions.length > 0 && (
              <Select value={activeVersionId ?? ""} onChange={(e) => { if (e.target.value) loadVersion(e.target.value); }} className="w-44">
                <option value="">Load version…</option>
                {versions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm((p) => !p)}>
              <Save className="h-3.5 w-3.5" />Save version
            </Button>
          </div>
        </div>

        {showForm && (
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <input
              type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Q2 Aggressive"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button size="sm" onClick={handleSave} disabled={!saveName.trim()}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        )}

        {versions.length > 0 && (
          <div className="space-y-1 border-t border-border pt-3">
            {versions.map((v) => (
              <div key={v.id} className={cn(
                "flex items-center justify-between px-3 py-2 rounded-md border text-sm",
                v.id === activeVersionId ? "bg-primary/10 border-primary/30" : "border-border hover:bg-muted/30"
              )}>
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{v.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{new Date(v.createdAt).toLocaleDateString()}</span>
                  <span className="text-xs text-muted-foreground ml-2">{formatCurrency(v.rows.reduce((s, r) => s + r.forecast_spend, 0))}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={() => loadVersion(v.id)}>
                    <FolderOpen className="h-3.5 w-3.5" />Load
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => deleteVersion(v.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Bulk Edit Panel ───────────────────────────────────────────────────────────
function BulkEditPanel({ rows, forecastStart, forecastEnd }: {
  rows: ForecastRow[]; forecastStart: string; forecastEnd: string;
}) {
  const { applyBulkOperation } = useSpendStore();
  const channels = useMemo(() => getUniqueChannels(rows), [rows]);
  const geos = useMemo(() => getUniqueGeos(rows), [rows]);
  const games = useMemo(() => getUniqueGames(rows), [rows]);
  const platforms = useMemo(() => getUniquePlatforms(rows), [rows]);

  const [selChannels, setSelChannels] = useState<string[]>([]);
  const [selGeos, setSelGeos] = useState<string[]>([]);
  const [selGames, setSelGames] = useState<string[]>([]);
  const [selPlatforms, setSelPlatforms] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(forecastStart);
  const [endDate, setEndDate] = useState(forecastEnd);
  const [action, setAction] = useState<"set" | "add_pct" | "add_flat">("add_pct");
  const [value, setValue] = useState<string>("10");
  const [applied, setApplied] = useState(false);

  const affected = useMemo(() => rows.filter((row) => {
    if (selChannels.length > 0 && !selChannels.includes(row.channel)) return false;
    if (selGeos.length > 0 && !selGeos.includes(row.geo)) return false;
    if (selGames.length > 0 && !selGames.includes(row.game)) return false;
    if (selPlatforms.length > 0 && !selPlatforms.includes(row.platform)) return false;
    if (row.date < startDate || row.date > endDate) return false;
    return true;
  }).length, [rows, selChannels, selGeos, selGames, selPlatforms, startDate, endDate]);

  const handleApply = () => {
    const op: ForecastOperation = {
      action, value: Number(value),
      channels: selChannels, geos: selGeos, games: selGames, platforms: selPlatforms,
      startDate, endDate,
      summary: `${action} ${value} to matching rows`,
    };
    applyBulkOperation(op);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />Bulk Edit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DimSelector label="Channels" options={channels} selected={selChannels} onChange={setSelChannels} />
          <DimSelector label="GEOs" options={geos} selected={selGeos} onChange={setSelGeos} />
          <DimSelector label="Games" options={games} selected={selGames} onChange={setSelGames} />
          <DimSelector label="Platforms" options={platforms} selected={selPlatforms} onChange={setSelPlatforms} />
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</label>
            <input type="date" value={startDate} min={forecastStart} max={forecastEnd}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</label>
            <input type="date" value={endDate} min={forecastStart} max={forecastEnd}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</label>
            <Select value={action} onChange={(e) => setAction(e.target.value as typeof action)} className="w-32">
              <option value="add_pct">Add %</option>
              <option value="add_flat">Add $</option>
              <option value="set">Set to $</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {action === "add_pct" ? "Percent" : "Amount"}
            </label>
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} step={action === "add_pct" ? 1 : 1000}
              className="w-24 h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider opacity-0">Go</label>
            <Button onClick={handleApply} disabled={affected === 0} className={cn("gap-1.5", applied && "bg-green-600 hover:bg-green-600")}>
              {applied ? "Applied!" : `Apply to ${affected.toLocaleString()} rows`}
            </Button>
          </div>
        </div>

        {affected > 0 && !applied && (
          <p className="text-xs text-muted-foreground">
            Will affect <strong className="text-foreground">{affected.toLocaleString()}</strong> rows
            {selChannels.length > 0 && ` · ${selChannels.length} channel(s)`}
            {selGeos.length > 0 && ` · ${selGeos.length} geo(s)`}
            {selGames.length > 0 && ` · ${selGames.length} game(s)`}
            {selPlatforms.length > 0 && ` · ${selPlatforms.length} platform(s)`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── NLP Panel ─────────────────────────────────────────────────────────────────
function NLPPanel({ rows, forecastStart, forecastEnd }: {
  rows: ForecastRow[]; forecastStart: string; forecastEnd: string;
}) {
  const { applyBulkOperation } = useSpendStore();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedOp, setParsedOp] = useState<ForecastOperation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const channels = useMemo(() => getUniqueChannels(rows), [rows]);
  const geos = useMemo(() => getUniqueGeos(rows), [rows]);
  const games = useMemo(() => getUniqueGames(rows), [rows]);
  const platforms = useMemo(() => getUniquePlatforms(rows), [rows]);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setParsedOp(null);

    try {
      const res = await fetch("/api/forecast/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          currentDate: "2026-03-02",
          availableDimensions: { channels, geos, games, platforms, forecastStartDate: forecastStart, forecastEndDate: forecastEnd },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Parse failed");
        return;
      }
      const op: ForecastOperation = await res.json();
      setParsedOp(op);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!parsedOp) return;
    applyBulkOperation(parsedOp);
    setApplied(true);
    setParsedOp(null);
    setText("");
    setTimeout(() => setApplied(false), 2000);
  };

  const affectedCount = useMemo(() => {
    if (!parsedOp) return 0;
    return rows.filter((row) => {
      if (parsedOp.channels.length > 0 && !parsedOp.channels.includes(row.channel)) return false;
      if (parsedOp.geos.length > 0 && !parsedOp.geos.includes(row.geo)) return false;
      if (parsedOp.games.length > 0 && !parsedOp.games.includes(row.game)) return false;
      if (parsedOp.platforms.length > 0 && !parsedOp.platforms.includes(row.platform)) return false;
      if (row.date < parsedOp.startDate || row.date > parsedOp.endDate) return false;
      return true;
    }).length;
  }, [parsedOp, rows]);

  return (
    <Card className="border-border bg-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />AI Forecast Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.metaKey && handleParse()}
          placeholder={`Try: "Increase Facebook by 15% in US for solitaire next 3 months"\nor: "Set all iOS channels to $5000 per week from April to June"`}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />

        <div className="flex items-center gap-2">
          <Button onClick={handleParse} disabled={!text.trim() || loading} className="gap-1.5" size="sm">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            {loading ? "Parsing…" : "Parse"}
          </Button>
          <span className="text-xs text-muted-foreground">⌘ + Enter</span>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {applied && (
          <div className="rounded-md bg-green-950/40 border border-green-800/40 px-3 py-2 text-sm text-green-400">
            Applied successfully!
          </div>
        )}

        {parsedOp && (
          <div className="rounded-md bg-primary/5 border border-primary/20 p-3 space-y-2">
            <p className="text-sm font-medium text-foreground">{parsedOp.summary}</p>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p><span className="text-foreground">Action:</span> {parsedOp.action} {parsedOp.value}{parsedOp.action === "add_pct" ? "%" : "$"}</p>
              <p><span className="text-foreground">Channels:</span> {parsedOp.channels.length === 0 ? "All" : parsedOp.channels.join(", ")}</p>
              <p><span className="text-foreground">Geos:</span> {parsedOp.geos.length === 0 ? "All" : parsedOp.geos.join(", ")}</p>
              <p><span className="text-foreground">Games:</span> {parsedOp.games.length === 0 ? "All" : parsedOp.games.join(", ")}</p>
              <p><span className="text-foreground">Platforms:</span> {parsedOp.platforms.length === 0 ? "All" : parsedOp.platforms.join(", ")}</p>
              <p><span className="text-foreground">Date range:</span> {parsedOp.startDate} → {parsedOp.endDate}</p>
              <p><span className="text-foreground">Rows affected:</span> {affectedCount.toLocaleString()}</p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleApply} className="gap-1.5">
                Apply {affectedCount.toLocaleString()} rows
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setParsedOp(null)}>Discard</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Forecast Table ─────────────────────────────────────────────────────────────
function ForecastTable({ rows }: { rows: ForecastRow[] }) {
  const { updateForecastCell } = useSpendStore();
  const [groupBy, setGroupBy] = useState<"channel" | "geo" | "game" | "platform">("channel");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, ForecastRow[]>();
    for (const row of rows) {
      const key = row[groupBy];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return map;
  }, [rows, groupBy]);

  const toggle = (k: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const grandTotal = rows.reduce((s, r) => s + r.forecast_spend, 0);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold text-foreground">
          Edit Forecast
          <span className="text-sm font-normal text-muted-foreground ml-2">Total: {formatCurrency(grandTotal)}</span>
        </CardTitle>
        <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)} className="w-32">
          <option value="channel">By Channel</option>
          <option value="geo">By GEO</option>
          <option value="game">By Game</option>
          <option value="platform">By Platform</option>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{groupBy}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channel / GEO / Game / Platform / Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Forecast Spend / wk</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(grouped.entries()).map(([groupKey, groupRows]) => {
                const isExpanded = expanded.has(groupKey);
                const total = groupRows.reduce((s, r) => s + r.forecast_spend, 0);
                return (
                  <Fragment key={groupKey}>
                    <tr className="border-b border-border bg-muted/10 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggle(groupKey)}>
                      <td className="px-4 py-2.5 font-semibold text-foreground" colSpan={2}>
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          {groupKey}
                          <span className="text-xs font-normal text-muted-foreground">({groupRows.length} rows)</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-foreground">{formatCurrency(total)}</td>
                    </tr>
                    {isExpanded && groupRows.map((row) => {
                      const key = `${row.date}|${row.channel}|${row.geo}|${row.game}|${row.platform}`;
                      return (
                        <tr key={key} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-2 pl-10 text-xs text-muted-foreground">{row[groupBy]}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {[row.channel, row.geo, row.game, row.platform, row.date].join(" · ")}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">$</span>
                              <input
                                type="number"
                                value={row.forecast_spend}
                                onChange={(e) => updateForecastCell(key, Number(e.target.value))}
                                min={0} step={100}
                                className="w-28 h-7 rounded border border-input bg-background px-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main ForecastEditor ───────────────────────────────────────────────────────
export default function ForecastEditor({ rows, forecastStart, forecastEnd, onEndDateChange }: Props) {
  const quickRanges = [
    { label: "3 months", weeks: 13 },
    { label: "6 months", weeks: 26 },
    { label: "1 year", weeks: 52 },
  ];

  return (
    <div className="space-y-4">
      {/* Horizon picker */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Forecast period:</label>
              <span className="text-sm font-semibold text-foreground">{forecastStart}</span>
              <span className="text-muted-foreground">→</span>
              <input
                type="date"
                value={forecastEnd}
                min={forecastStart}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {quickRanges.map((r) => (
                <Button key={r.label} variant="outline" size="sm" className="text-xs"
                  onClick={() => onEndDateChange(addWeeksToDate(forecastStart, r.weeks))}>
                  {r.label}
                </Button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              {rows.length.toLocaleString()} forecast rows · {formatCurrency(rows.reduce((s, r) => s + r.forecast_spend, 0))} total
            </span>
          </div>
        </CardContent>
      </Card>

      <VersionPanel rows={rows} />
      <NLPPanel rows={rows} forecastStart={forecastStart} forecastEnd={forecastEnd} />
      <BulkEditPanel rows={rows} forecastStart={forecastStart} forecastEnd={forecastEnd} />
      <ForecastTable rows={rows} />
    </div>
  );
}
