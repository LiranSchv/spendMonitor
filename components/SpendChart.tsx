"use client";

import { SpendRow, Period } from "@/lib/types";
import { buildTimeSeriesData, formatCurrency } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useState } from "react";

type Props = { rows: SpendRow[] };

const COLORS = { actual: "#8b5cf6", planned: "#4c1d95" };
const GRID_COLOR = "hsl(263 30% 15%)";
const AXIS_COLOR = "hsl(240 8% 45%)";

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl p-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function SpendChart({ rows }: Props) {
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [period, setPeriod] = useState<Period>("month");

  const data = buildTimeSeriesData(rows, period);
  const yFmt = (v: number) => formatCurrency(v);

  const commonAxisProps = {
    tick: { fontSize: 11, fill: AXIS_COLOR },
    axisLine: { stroke: GRID_COLOR },
    tickLine: false,
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold text-foreground">Spend Over Time</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-28">
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="year">Yearly</option>
          </Select>
          <Select value={chartType} onChange={(e) => setChartType(e.target.value as "line" | "bar")} className="w-20">
            <option value="line">Line</option>
            <option value="bar">Bar</option>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          {chartType === "line" ? (
            <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="date" {...commonAxisProps} />
              <YAxis tickFormatter={yFmt} width={72} {...commonAxisProps} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
              <Line type="monotone" dataKey="actual" stroke={COLORS.actual} strokeWidth={2} dot={false} name="Actual" />
              <Line type="monotone" dataKey="planned" stroke={COLORS.planned} strokeWidth={2} strokeDasharray="5 5" dot={false} name="Planned" />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="date" {...commonAxisProps} />
              <YAxis tickFormatter={yFmt} width={72} {...commonAxisProps} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: AXIS_COLOR }} />
              <Bar dataKey="actual" fill={COLORS.actual} name="Actual" radius={[3, 3, 0, 0]} maxBarSize={40} />
              <Bar dataKey="planned" fill={COLORS.planned} name="Planned" radius={[3, 3, 0, 0]} maxBarSize={40} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
