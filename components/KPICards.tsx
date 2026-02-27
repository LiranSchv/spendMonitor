"use client";

import { SpendRow } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Globe, Target } from "lucide-react";

type Props = {
  rows: SpendRow[];
};

export default function KPICards({ rows }: Props) {
  const totalActual = rows.reduce((sum, r) => sum + r.actual_spend, 0);
  const totalPlanned = rows.reduce((sum, r) => sum + r.planned_spend, 0);
  const vsPlanPct = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned) * 100 : 0;

  // Top channel by actual spend
  const channelMap = new Map<string, number>();
  for (const row of rows) {
    channelMap.set(row.channel, (channelMap.get(row.channel) ?? 0) + row.actual_spend);
  }
  const topChannel = Array.from(channelMap.entries()).sort((a, b) => b[1] - a[1])[0];

  // Top geo by actual spend
  const geoMap = new Map<string, number>();
  for (const row of rows) {
    geoMap.set(row.geo, (geoMap.get(row.geo) ?? 0) + row.actual_spend);
  }
  const topGeo = Array.from(geoMap.entries()).sort((a, b) => b[1] - a[1])[0];

  const isOverPlan = vsPlanPct > 0;

  const kpis = [
    {
      title: "Total Actual Spend",
      value: formatCurrency(totalActual),
      sub: `Plan: ${formatCurrency(totalPlanned)}`,
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "vs. Plan",
      value: `${isOverPlan ? "+" : ""}${vsPlanPct.toFixed(1)}%`,
      sub: isOverPlan ? "Over budget" : "Under budget",
      icon: isOverPlan ? TrendingUp : TrendingDown,
      color: isOverPlan ? "text-red-600" : "text-green-600",
      bg: isOverPlan ? "bg-red-50" : "bg-green-50",
      badgeVariant: (isOverPlan ? "destructive" : "success") as "destructive" | "success",
    },
    {
      title: "Top Channel",
      value: topChannel?.[0] ?? "—",
      sub: topChannel ? formatCurrency(topChannel[1]) : "",
      icon: BarChart3,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Top GEO",
      value: topGeo?.[0] ?? "—",
      sub: topGeo ? formatCurrency(topGeo[1]) : "",
      icon: Globe,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.title} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </div>
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
