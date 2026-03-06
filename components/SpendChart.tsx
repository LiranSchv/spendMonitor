"use client";

import { SpendRow, Period } from "@/lib/types";
import { buildCombinedTimeSeries, formatCurrency } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useSpendStore } from "@/lib/store";

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
  payload?: { name: string; value: number; color: string; strokeDasharray?: string }[];
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

function CustomLegend({ dimValues, palette, hasForecast }: {
  dimValues: string[]; palette: string[]; hasForecast: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
      {dimValues.map((dv, i) => {
        const color = palette[i % palette.length];
        const label = dv === "total" ? "" : dv;
        return (
          <div key={dv} className="flex items-center gap-1.5">
            {/* Actual: solid line swatch */}
            <svg width="20" height="10">
              <line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth="2" />
            </svg>
            {hasForecast && (
              <>
                <svg width="20" height="10">
                  <line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth="2" strokeDasharray="5 3" />
                </svg>
              </>
            )}
            {label && <span className="text-xs text-muted-foreground">{label}</span>}
          </div>
        );
      })}
      {/* Global legend indicators */}
      <div className="flex items-center gap-3 border-l border-border pl-3 ml-1">
        <div className="flex items-center gap-1">
          <svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#9ca3af" strokeWidth="2" /></svg>
          <span className="text-xs text-muted-foreground">Actual</span>
        </div>
        {hasForecast && (
          <div className="flex items-center gap-1">
            <svg width="20" height="10"><line x1="0" y1="5" x2="20" y2="5" stroke="#9ca3af" strokeWidth="2" strokeDasharray="5 3" /></svg>
            <span className="text-xs text-muted-foreground">Forecast</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SpendChart({ rows }: Props) {
  const [period, setPeriod] = useState<Period>("month");
  const [dimension, setDimension] = useState<DimOption>("all");
  const { currentForecastRows } = useSpendStore();

  const hasForecast = currentForecastRows.length > 0;

  const { data, dimValues, todayLabel } = useMemo(
    () => buildCombinedTimeSeries(rows, hasForecast ? currentForecastRows : [], period, dimension),
    [rows, currentForecastRows, period, dimension, hasForecast]
  );

  const yFmt = (v: number) => formatCurrency(v);
  const commonAxisProps = {
    tick: { fontSize: 11, fill: AXIS_COLOR },
    axisLine: { stroke: GRID_COLOR },
    tickLine: false,
  };

  // For monthly/quarterly/yearly views, reduce X-axis tick density
  const tickCount = period === "week" ? 12 : undefined;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4 flex-wrap gap-2">
        <CardTitle className="text-base font-semibold text-foreground">
          Spend Trend
          {hasForecast && <span className="text-xs font-normal text-muted-foreground ml-2">— solid: actual · dashed: forecast</span>}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={dimension} onChange={(e) => setDimension(e.target.value as DimOption)} className="w-32">
            <option value="all">All</option>
            <option value="channel">By Channel</option>
            <option value="geo">By GEO</option>
            <option value="game">By Game</option>
            <option value="platform">By Platform</option>
          </Select>
          <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-28">
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="date" {...commonAxisProps} interval={tickCount ? "preserveStartEnd" : undefined} />
            <YAxis tickFormatter={yFmt} width={72} {...commonAxisProps} />
            <Tooltip content={<CustomTooltip />} />

            {/* Today reference line */}
            <ReferenceLine
              x={todayLabel}
              stroke="hsl(263 50% 50%)"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{ value: "Today", position: "top", fill: "hsl(263 60% 70%)", fontSize: 10 }}
            />

            {dimValues.map((dv, i) => {
              const color = PALETTE[i % PALETTE.length];
              const label = dv === "total" ? "" : ` ${dv}`;
              return [
                <Line
                  key={`${dv}_actual`}
                  dataKey={`${dv}_actual`}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  name={`Actual${label}`}
                  connectNulls={false}
                  legendType="none"
                />,
                hasForecast && (
                  <Line
                    key={`${dv}_forecast`}
                    dataKey={`${dv}_forecast`}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    name={`Forecast${label}`}
                    connectNulls={false}
                    legendType="none"
                  />
                ),
              ];
            })}
          </LineChart>
        </ResponsiveContainer>

        <CustomLegend dimValues={dimValues} palette={PALETTE} hasForecast={hasForecast} />
      </CardContent>
    </Card>
  );
}
