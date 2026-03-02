"use client";

import { useState, useMemo } from "react";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, createColumnHelper, SortingState,
} from "@tanstack/react-table";
import { SpendRow, AggregatedRow, GroupBy, Period } from "@/lib/types";
import {
  aggregateByChannel, aggregateByGeo, aggregateByGame,
  aggregateByPlatform, aggregateByAll, aggregateByPeriod, formatCurrency,
} from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type Props = { rows: SpendRow[] };

const columnHelper = createColumnHelper<AggregatedRow>();

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc") return <ChevronUp className="h-3 w-3" />;
  if (direction === "desc") return <ChevronDown className="h-3 w-3" />;
  return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
}

const columns = [
  columnHelper.accessor("label", {
    header: "Group",
    cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
  }),
  columnHelper.accessor("actual_spend", {
    header: "Actual",
    cell: (info) => <span className="font-mono text-foreground">{formatCurrency(info.getValue())}</span>,
  }),
  columnHelper.accessor("planned_spend", {
    header: "Planned",
    cell: (info) => <span className="font-mono text-muted-foreground">{formatCurrency(info.getValue())}</span>,
  }),
  columnHelper.accessor("variance", {
    header: "Variance",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className={cn("font-mono font-medium", val > 0 ? "text-red-400" : val < 0 ? "text-green-400" : "text-muted-foreground")}>
          {val > 0 ? "+" : ""}{formatCurrency(val)}
        </span>
      );
    },
  }),
  columnHelper.accessor("variancePct", {
    header: "vs. Plan",
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
          val > 5 ? "bg-red-950/60 text-red-400" : val < -5 ? "bg-green-950/60 text-green-400" : "bg-muted text-muted-foreground"
        )}>
          {val > 0 ? "+" : ""}{val.toFixed(1)}%
        </span>
      );
    },
  }),
];

export default function SpendTable({ rows }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>("channel");
  const [period, setPeriod] = useState<Period>("month");
  const [sorting, setSorting] = useState<SortingState>([]);

  const data = useMemo(() => {
    if (groupBy === "all") return aggregateByAll(rows);
    if (groupBy === "channel") return aggregateByChannel(rows);
    if (groupBy === "geo") return aggregateByGeo(rows);
    if (groupBy === "game") return aggregateByGame(rows);
    if (groupBy === "platform") return aggregateByPlatform(rows);
    return aggregateByPeriod(rows, period);
  }, [rows, groupBy, period]);

  const table = useReactTable({
    data, columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totals = useMemo(() => ({
    actual: data.reduce((s, r) => s + r.actual_spend, 0),
    planned: data.reduce((s, r) => s + r.planned_spend, 0),
    variance: data.reduce((s, r) => s + r.variance, 0),
  }), [data]);

  const totalVsPct = totals.planned > 0 ? ((totals.actual - totals.planned) / totals.planned) * 100 : 0;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold text-foreground">Spend Breakdown</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="w-36">
            <option value="all">All (Total)</option>
            <option value="channel">By Channel</option>
            <option value="geo">By GEO</option>
            <option value="game">By Game</option>
            <option value="platform">By Platform</option>
            <option value="period">By Period</option>
          </Select>
          {groupBy === "period" && (
            <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="w-28">
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-border bg-muted/30">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
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
                <tr key={row.id} className={cn("border-b border-border/50 transition-colors hover:bg-muted/20", i % 2 === 1 && "bg-muted/5")}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/20">
                <td className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-muted-foreground">Total</td>
                <td className="px-4 py-3 font-mono font-bold text-foreground">{formatCurrency(totals.actual)}</td>
                <td className="px-4 py-3 font-mono text-muted-foreground font-bold">{formatCurrency(totals.planned)}</td>
                <td className="px-4 py-3 font-mono font-bold">
                  <span className={cn(totals.variance > 0 ? "text-red-400" : "text-green-400")}>
                    {totals.variance > 0 ? "+" : ""}{formatCurrency(totals.variance)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                    totalVsPct > 5 ? "bg-red-950/60 text-red-400" : totalVsPct < -5 ? "bg-green-950/60 text-green-400" : "bg-muted text-muted-foreground"
                  )}>
                    {totalVsPct > 0 ? "+" : ""}{totalVsPct.toFixed(1)}%
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
