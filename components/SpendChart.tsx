"use client";

import { SpendRow, ForecastRow, Period } from "@/lib/types";
import {
  buildCombinedTimeSeries,
  filterForecastRows,
  formatCurrency,
} from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSpendStore } from "@/lib/store";

// Colors used when comparing two versions (fixed, not per-dimension)
const CMP_ACTUAL    = "#64748b";
const CMP_VERSION_A = "#8b5cf6";
const CMP_VERSION_B = "#06b6d4";

const BASELINE = "baseline"; // sentinel for "no forecast selected"

type Props = { rows: SpendRow[] };
type DimOption = "all" | "channel" | "geo" | "game" | "platform";

const PALETTE = [
  "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#84cc16", "#f97316",
  "#60a5fa", "#a78bfa", "#34d399", "#fbbf24",
];

const GRID_COLOR = "hsl(263 30% 13%)";
const AXIS_COLOR = "hsl(240 8% 45%)";

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const filled = payload.filter((p) => p.value != null);
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {filled.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="text-xs truncate max-w-[120px]">{p.name}</span>
          <span className="font-mono text-xs text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Swatch({ color, dash }: { color: string; dash?: string }) {
  return (
    <svg width="20" height="10">
      <line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth="2" strokeDasharray={dash} />
    </svg>
  );
}

function CustomLegend({
  dimValues, palette, labelA, labelB, isComparing,
}: {
  dimValues: string[];
  palette: string[];
  labelA: string | null;
  labelB: string | null;
  isComparing: boolean;
}) {
  if (isComparing) {
    return (
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 justify-center mt-2">
        <div className="flex items-center gap-1">
          <Swatch color={CMP_ACTUAL} />
          <span className="text-xs text-muted-foreground">Actual</span>
        </div>
        {labelA && (
          <div className="flex items-center gap-1">
            <Swatch color={CMP_VERSION_A} dash="6 3" />
            <span className="text-xs text-muted-foreground">{labelA}</span>
          </div>
        )}
        {labelB && (
          <div className="flex items-center gap-1">
            <Swatch color={CMP_VERSION_B} dash="2 3" />
            <span className="text-xs text-muted-foreground">{labelB}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
      {dimValues.map((dv, i) => {
        const color = palette[i % palette.length];
        const label = dv === "total" ? "" : dv;
        return (
          <div key={dv} className="flex items-center gap-1.5">
            <Swatch color={color} />
            {labelA && <Swatch color={color} dash="6 3" />}
            {labelB && <Swatch color={color} dash="2 3" />}
            {label && <span className="text-xs text-muted-foreground">{label}</span>}
          </div>
        );
      })}
      <div className="flex items-center gap-3 border-l border-border pl-3 ml-1">
        <div className="flex items-center gap-1">
          <Swatch color="#9ca3af" />
          <span className="text-xs text-muted-foreground">Actual</span>
        </div>
        {labelA && (
          <div className="flex items-center gap-1">
            <Swatch color="#9ca3af" dash="6 3" />
            <span className="text-xs text-muted-foreground">{labelA}</span>
          </div>
        )}
        {labelB && (
          <div className="flex items-center gap-1">
            <Swatch color="#9ca3af" dash="2 3" />
            <span className="text-xs text-muted-foreground">{labelB}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SpendChart({ rows }: Props) {
  const [period, setPeriod] = useState<Period>("month");
  const [dimension, setDimension] = useState<DimOption>("all");
  const [versionAId, setVersionAId] = useState<string>(BASELINE);
  const [versionBId, setVersionBId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);

  const { versions, filters } = useSpendStore();

  // Default versionA to latest saved version once versions are available
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && versions.length > 0) {
      didInit.current = true;
      setVersionAId(versions[versions.length - 1].id);
    }
  }, [versions]);

  // Comparing = both slots have a real (non-baseline, non-none) version
  const isComparing = versionAId !== BASELINE && versionBId !== BASELINE && versionBId !== "none";
  // Breakdown only when A has a real version and B is explicitly None
  const showBreakdown = versionAId !== BASELINE && versionBId === "none";
  const effectiveDimension = showBreakdown ? dimension : "all";

  const getForecastRows = useCallback((vId: string): ForecastRow[] => {
    if (vId === BASELINE || vId === "none") return [];
    return versions.find((v) => v.id === vId)?.rows ?? [];
  }, [versions]);

  const forecastRowsA = useMemo(
    () => filterForecastRows(getForecastRows(versionAId), filters),
    [versionAId, getForecastRows, filters]
  );
  const forecastRowsB = useMemo(
    () => filterForecastRows(getForecastRows(versionBId), filters),
    [versionBId, getForecastRows, filters]
  );

  const { data, dimValues, todayLabel } = useMemo(
    () => buildCombinedTimeSeries(rows, forecastRowsA, forecastRowsB, period, effectiveDimension),
    [rows, forecastRowsA, forecastRowsB, period, effectiveDimension]
  );

  const versionOptions = versions.map((v) => ({ value: v.id, label: v.name }));

  const getLabel = (vId: string) => {
    if (vId === BASELINE) return null;
    return versionOptions.find((o) => o.value === vId)?.label ?? null;
  };

  const handleVersionAChange = (val: string) => {
    if (val === versionBId && val !== "none") {
      setError("You can only compare 2 different versions");
      return;
    }
    setError(null);
    setVersionAId(val);
  };

  const handleVersionBChange = (val: string) => {
    if (val !== "none" && val === versionAId) {
      setError("You can only compare 2 different versions");
      return;
    }
    setError(null);
    setVersionBId(val);
  };

  const commonAxisProps = {
    tick: { fontSize: 11, fill: AXIS_COLOR },
    axisLine: { stroke: GRID_COLOR },
    tickLine: false,
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold text-foreground">
            Spend Trend
            <span className="text-xs font-normal text-muted-foreground ml-2">— solid: actual · dashed: forecast</span>
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Version A:</span>
              <Select value={versionAId} onChange={(e) => handleVersionAChange(e.target.value)} className="w-32">
                <option value={BASELINE}>Baseline</option>
                {versionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Version B:</span>
              <Select value={versionBId} onChange={(e) => handleVersionBChange(e.target.value)} className="w-32">
                <option value="none">None</option>
                <option value={BASELINE}>Baseline</option>
                {versionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            {showBreakdown && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Breakdown by:</span>
                <Select value={dimension} onChange={(e) => setDimension(e.target.value as DimOption)} className="w-32">
                  <option value="all">All</option>
                  <option value="channel">Channel</option>
                  <option value="geo">GEO</option>
                  <option value="game">Game</option>
                  <option value="platform">Platform</option>
                </Select>
              </div>
            )}
            <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-28">
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </Select>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-400 mt-1.5 text-right">{error}</p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="date" {...commonAxisProps} interval={period === "week" ? "preserveStartEnd" : undefined} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} width={72} {...commonAxisProps} />
            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              x={todayLabel}
              stroke="hsl(263 50% 50%)"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{ value: "Today", position: "top", fill: "hsl(263 60% 70%)", fontSize: 10 }}
            />

            {dimValues.map((dv, i) => {
              const dimColor       = PALETTE[i % PALETTE.length];
              const colorActual    = isComparing ? CMP_ACTUAL    : dimColor;
              const colorForecastA = isComparing ? CMP_VERSION_A : dimColor;
              const colorForecastB = isComparing ? CMP_VERSION_B : dimColor;
              const label = dv === "total" ? "" : ` ${dv}`;
              return [
                <Line key={`${dv}_actual`}    dataKey={`${dv}_actual`}    stroke={colorActual}    strokeWidth={2} dot={false} name={`Actual${label}`}                         connectNulls={false} legendType="none" />,
                <Line key={`${dv}_forecastA`} dataKey={`${dv}_forecastA`} stroke={colorForecastA} strokeWidth={2} dot={false} name={`${getLabel(versionAId) ?? "A"}${label}`} strokeDasharray="6 3" connectNulls={false} legendType="none" />,
                <Line key={`${dv}_forecastB`} dataKey={`${dv}_forecastB`} stroke={colorForecastB} strokeWidth={2} dot={false} name={`${getLabel(versionBId) ?? "B"}${label}`} strokeDasharray="2 3" connectNulls={false} legendType="none" />,
              ];
            })}
          </LineChart>
        </ResponsiveContainer>

        <CustomLegend
          dimValues={dimValues}
          palette={PALETTE}
          labelA={getLabel(versionAId)}
          labelB={getLabel(versionBId)}
          isComparing={isComparing}
        />
      </CardContent>
    </Card>
  );
}
