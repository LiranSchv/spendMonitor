"use client";

import { SpendRow } from "@/lib/types";
import { buildTimeSeriesData, formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useState } from "react";

type Props = {
  rows: SpendRow[];
};

const COLORS = {
  actual: "#3b82f6",
  planned: "#94a3b8",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function SpendChart({ rows }: Props) {
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  const data = buildTimeSeriesData(rows, "month");

  const yTickFormatter = (v: number) => formatCurrency(v);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">Spend Over Time</CardTitle>
        <Select
          value={chartType}
          onChange={(e) => setChartType(e.target.value as "line" | "bar")}
          className="w-28"
        >
          <option value="line">Line</option>
          <option value="bar">Bar</option>
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          {chartType === "line" ? (
            <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={yTickFormatter} tick={{ fontSize: 12 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke={COLORS.actual}
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="planned"
                stroke={COLORS.planned}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
                name="Planned"
              />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={yTickFormatter} tick={{ fontSize: 12 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="actual" fill={COLORS.actual} name="Actual" radius={[3, 3, 0, 0]} />
              <Bar dataKey="planned" fill={COLORS.planned} name="Planned" radius={[3, 3, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
