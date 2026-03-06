"use client";

import { SpendRow } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, BarChart3, Globe, Gamepad2 } from "lucide-react";

type Props = {
  rows: SpendRow[];
};

export default function KPICards({ rows }: Props) {
  const totalActual = rows.reduce((sum, r) => sum + r.actual_spend, 0);
  const totalPlanned = rows.reduce((sum, r) => sum + r.planned_spend, 0);

  const channelMap = new Map<string, number>();
  for (const row of rows) {
    channelMap.set(row.channel, (channelMap.get(row.channel) ?? 0) + row.actual_spend);
  }
  const topChannel = Array.from(channelMap.entries()).sort((a, b) => b[1] - a[1])[0];

  const geoMap = new Map<string, number>();
  for (const row of rows) {
    geoMap.set(row.geo, (geoMap.get(row.geo) ?? 0) + row.actual_spend);
  }
  const topGeo = Array.from(geoMap.entries()).sort((a, b) => b[1] - a[1])[0];

  const gameMap = new Map<string, number>();
  for (const row of rows) {
    gameMap.set(row.game, (gameMap.get(row.game) ?? 0) + row.actual_spend);
  }
  const topGame = Array.from(gameMap.entries()).sort((a, b) => b[1] - a[1])[0];

  const kpis = [
    {
      title: "Total Actual Spend",
      value: formatCurrency(totalActual),
      sub: `Plan: ${formatCurrency(totalPlanned)}`,
      icon: DollarSign,
    },
    {
      title: "Top Channel",
      value: topChannel?.[0] ?? "—",
      sub: topChannel ? formatCurrency(topChannel[1]) : "",
      icon: BarChart3,
    },
    {
      title: "Top GEO",
      value: topGeo?.[0] ?? "—",
      sub: topGeo ? formatCurrency(topGeo[1]) : "",
      icon: Globe,
    },
    {
      title: "Top Game",
      value: topGame?.[0] ?? "—",
      sub: topGame ? formatCurrency(topGame[1]) : "",
      icon: Gamepad2,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.title} className="border-border bg-card overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">{kpi.title}</p>
                  <p className="text-xl font-bold mt-1 truncate text-primary">
                    {kpi.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{kpi.sub}</p>
                </div>
                <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
