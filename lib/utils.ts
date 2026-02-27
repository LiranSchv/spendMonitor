import { SpendRow, ForecastRow, AggregatedRow, CompareRow, ForecastVersion } from "./types";
import { format, startOfWeek, startOfMonth, getQuarter, getYear } from "date-fns";

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

export function getPeriodKey(dateStr: string, period: "week" | "month" | "quarter"): string {
  const date = new Date(dateStr);
  if (period === "week") {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return format(weekStart, "yyyy-MM-dd");
  }
  if (period === "month") {
    return format(date, "yyyy-MM");
  }
  // quarter
  return `${getYear(date)}-Q${getQuarter(date)}`;
}

export function getPeriodLabel(key: string, period: "week" | "month" | "quarter"): string {
  if (period === "week") return `Week of ${key}`;
  if (period === "month") {
    const [year, month] = key.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return format(date, "MMM yyyy");
  }
  return key; // e.g. "2024-Q1"
}

export function aggregateByChannel(rows: SpendRow[]): AggregatedRow[] {
  const map = new Map<string, { actual: number; planned: number }>();
  for (const row of rows) {
    const existing = map.get(row.channel) ?? { actual: 0, planned: 0 };
    existing.actual += row.actual_spend;
    existing.planned += row.planned_spend;
    map.set(row.channel, existing);
  }
  return Array.from(map.entries())
    .map(([channel, vals]) => ({
      key: channel,
      label: channel,
      actual_spend: vals.actual,
      planned_spend: vals.planned,
      variance: vals.actual - vals.planned,
      variancePct: vals.planned > 0 ? ((vals.actual - vals.planned) / vals.planned) * 100 : 0,
    }))
    .sort((a, b) => b.actual_spend - a.actual_spend);
}

export function aggregateByGeo(rows: SpendRow[]): AggregatedRow[] {
  const map = new Map<string, { actual: number; planned: number }>();
  for (const row of rows) {
    const existing = map.get(row.geo) ?? { actual: 0, planned: 0 };
    existing.actual += row.actual_spend;
    existing.planned += row.planned_spend;
    map.set(row.geo, existing);
  }
  return Array.from(map.entries())
    .map(([geo, vals]) => ({
      key: geo,
      label: geo,
      actual_spend: vals.actual,
      planned_spend: vals.planned,
      variance: vals.actual - vals.planned,
      variancePct: vals.planned > 0 ? ((vals.actual - vals.planned) / vals.planned) * 100 : 0,
    }))
    .sort((a, b) => b.actual_spend - a.actual_spend);
}

export function aggregateByPeriod(
  rows: SpendRow[],
  period: "week" | "month" | "quarter"
): AggregatedRow[] {
  const map = new Map<string, { actual: number; planned: number }>();
  for (const row of rows) {
    const key = getPeriodKey(row.date, period);
    const existing = map.get(key) ?? { actual: 0, planned: 0 };
    existing.actual += row.actual_spend;
    existing.planned += row.planned_spend;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => ({
      key,
      label: getPeriodLabel(key, period),
      actual_spend: vals.actual,
      planned_spend: vals.planned,
      variance: vals.actual - vals.planned,
      variancePct: vals.planned > 0 ? ((vals.actual - vals.planned) / vals.planned) * 100 : 0,
    }));
}

export function getUniqueChannels(rows: SpendRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.channel))).sort();
}

export function getUniqueGeos(rows: SpendRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.geo))).sort();
}

export function filterRows(
  rows: SpendRow[],
  filters: {
    channels: string[];
    geos: string[];
    startDate?: string;
    endDate?: string;
  }
): SpendRow[] {
  return rows.filter((row) => {
    if (filters.channels.length > 0 && !filters.channels.includes(row.channel)) return false;
    if (filters.geos.length > 0 && !filters.geos.includes(row.geo)) return false;
    if (filters.startDate && row.date < filters.startDate) return false;
    if (filters.endDate && row.date > filters.endDate) return false;
    return true;
  });
}

export function buildTimeSeriesData(rows: SpendRow[], period: "week" | "month" | "quarter") {
  const map = new Map<string, { actual: number; planned: number }>();
  for (const row of rows) {
    const key = getPeriodKey(row.date, period);
    const existing = map.get(key) ?? { actual: 0, planned: 0 };
    existing.actual += row.actual_spend;
    existing.planned += row.planned_spend;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => ({
      date: getPeriodLabel(key, period),
      actual: vals.actual,
      planned: vals.planned,
    }));
}

// Build forecast rows from actual rows (as starting point)
export function buildInitialForecast(rows: SpendRow[]): ForecastRow[] {
  return rows.map((row) => ({
    date: row.date,
    channel: row.channel,
    geo: row.geo,
    forecast_spend: row.actual_spend,
  }));
}

// Compare two value sets by channel/geo/period
export function buildCompareRows(
  rowsA: { key: string; label: string; value: number }[],
  rowsB: { key: string; label: string; value: number }[]
): CompareRow[] {
  const mapA = new Map(rowsA.map((r) => [r.key, r]));
  const mapB = new Map(rowsB.map((r) => [r.key, r]));
  const keys = new Set([...mapA.keys(), ...mapB.keys()]);

  return Array.from(keys).map((key) => {
    const a = mapA.get(key);
    const b = mapB.get(key);
    const valA = a?.value ?? 0;
    const valB = b?.value ?? 0;
    const delta = valB - valA;
    const deltaPct = valA !== 0 ? (delta / valA) * 100 : 0;
    return {
      key,
      label: a?.label ?? b?.label ?? key,
      valueA: valA,
      valueB: valB,
      delta,
      deltaPct,
    };
  });
}

// Get aggregated values from forecast version for comparison
export function aggregateForecastByChannel(version: ForecastVersion): AggregatedRow[] {
  const map = new Map<string, number>();
  for (const row of version.rows) {
    map.set(row.channel, (map.get(row.channel) ?? 0) + row.forecast_spend);
  }
  return Array.from(map.entries())
    .map(([channel, val]) => ({
      key: channel,
      label: channel,
      actual_spend: val,
      planned_spend: 0,
      variance: 0,
      variancePct: 0,
    }))
    .sort((a, b) => b.actual_spend - a.actual_spend);
}

export function aggregateForecastByGeo(version: ForecastVersion): AggregatedRow[] {
  const map = new Map<string, number>();
  for (const row of version.rows) {
    map.set(row.geo, (map.get(row.geo) ?? 0) + row.forecast_spend);
  }
  return Array.from(map.entries())
    .map(([geo, val]) => ({
      key: geo,
      label: geo,
      actual_spend: val,
      planned_spend: 0,
      variance: 0,
      variancePct: 0,
    }))
    .sort((a, b) => b.actual_spend - a.actual_spend);
}
