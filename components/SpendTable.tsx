"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { SpendRow, AggregatedRow } from "@/lib/types";
import {
  aggregateByChannel,
  aggregateByGeo,
  aggregateByPeriod,
  formatCurrency,
} from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type Props = {
  rows: SpendRow[];
};

const columnHelper = createColumnHelper<AggregatedRow>();

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc") return <ChevronUp className="h-3.5 w-3.5" />;
  if (direction === "desc") return <ChevronDown className="h-3.5 w-3.5" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
}

const columns = [
  columnHelper.accessor("label", {
    header: "Group",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("actual_spend", {
    header: "Actual Spend",
    cell: (info) => <span className="font-mono">{formatCurrency(info.getValue())}</span>,
  }),
  columnHelper.accessor("planned_spend", {
    header: "Planned Spend",
    cell: (info) => <span className="font-mono text-muted-foreground">{formatCurrency(info.getValue())}</span>,
  }),
  columnHelper.accessor("variance", {
    header: "Variance ($)",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className={cn("font-mono font-medium", val > 0 ? "text-red-600" : val < 0 ? "text-green-600" : "")}>
          {val > 0 ? "+" : ""}{formatCurrency(val)}
        </span>
      );
    },
  }),
  columnHelper.accessor("variancePct", {
    header: "vs. Plan %",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
            val > 5
              ? "bg-red-100 text-red-700"
              : val < -5
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          )}
        >
          {val > 0 ? "+" : ""}{val.toFixed(1)}%
        </span>
      );
    },
  }),
];

export default function SpendTable({ rows }: Props) {
  const [groupBy, setGroupBy] = useState<"channel" | "geo" | "period">("channel");
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  const [sorting, setSorting] = useState<SortingState>([]);

  const data = useMemo(() => {
    if (groupBy === "channel") return aggregateByChannel(rows);
    if (groupBy === "geo") return aggregateByGeo(rows);
    return aggregateByPeriod(rows, period);
  }, [rows, groupBy, period]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Totals
  const totals = useMemo(() => ({
    actual: data.reduce((s, r) => s + r.actual_spend, 0),
    planned: data.reduce((s, r) => s + r.planned_spend, 0),
    variance: data.reduce((s, r) => s + r.variance, 0),
  }), [data]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">Spend Breakdown</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as typeof groupBy)} className="w-32">
            <option value="channel">By Channel</option>
            <option value="geo">By GEO</option>
            <option value="period">By Period</option>
          </Select>
          {groupBy === "period" && (
            <Select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="w-28">
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b bg-muted/50">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon direction={header.column.getIsSorted()} />
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn("border-b transition-colors hover:bg-muted/30", i % 2 === 0 ? "" : "bg-muted/10")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/30">
                <td className="px-4 py-3 font-bold text-xs uppercase tracking-wider">Total</td>
                <td className="px-4 py-3 font-mono font-bold">{formatCurrency(totals.actual)}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground font-bold">{formatCurrency(totals.planned)}</td>
                <td className="px-4 py-3 font-mono font-bold">
                  <span className={cn(totals.variance > 0 ? "text-red-600" : "text-green-600")}>
                    {totals.variance > 0 ? "+" : ""}{formatCurrency(totals.variance)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                    totals.planned > 0 && ((totals.actual - totals.planned) / totals.planned * 100) > 5
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  )}>
                    {totals.planned > 0
                      ? `${((totals.actual - totals.planned) / totals.planned * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
