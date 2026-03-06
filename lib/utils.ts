import { SpendRow, ForecastRow, AggregatedRow, CompareRow, ForecastVersion, Period, Game, Platform } from "./types";
import { parseISO, format, startOfWeek, getQuarter, getYear, addWeeks, isAfter, isBefore, isEqual } from "date-fns";

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

export function getPeriodKey(dateStr: string, period: Period): string {
  const date = parseISO(dateStr);
  if (period === "week") {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return format(weekStart, "yyyy-MM-dd");
  }
  if (period === "month") return format(date, "yyyy-MM");
  if (period === "quarter") return `${getYear(date)}-Q${getQuarter(date)}`;
  return String(getYear(date)); // year
}

export function getPeriodLabel(key: string, period: Period): string {
  if (period === "week") return `Wk ${key.slice(5)}`;
  if (period === "month") {
    const [year, month] = key.split("-");
    const date = parseISO(`${year}-${month}-01`);
    return format(date, "MMM yyyy");
  }
  if (period === "quarter") return key;
  return key; // year: "2024"
}

// ── Aggregation ──────────────────────────────────────────────────────────────

function toAggRow(key: string, label: string, actual: number, planned: number): AggregatedRow {
  const variance = actual - planned;
  const variancePct = planned > 0 ? (variance / planned) * 100 : 0;
  return { key, label, actual_spend: actual, planned_spend: planned, variance, variancePct };
}

function aggregateByDimension(rows: SpendRow[], getDim: (r: SpendRow) => string): AggregatedRow[] {
  const map = new Map<string, { actual: number; planned: number }>();
  for (const row of rows) {
    const key = getDim(row);
    const existing = map.get(key) ?? { actual: 0, planned: 0 };
    existing.actual += row.actual_spend;
    existing.planned += row.planned_spend;
    map.set(key, existing);
  }
  return Array.from(map.entries())
    .map(([k, v]) => toAggRow(k, k, v.actual, v.planned))
    .sort((a, b) => b.actual_spend - a.actual_spend);
}

export function aggregateByChannel(rows: SpendRow[]): AggregatedRow[] {
  return aggregateByDimension(rows, (r) => r.channel);
}

export function aggregateByGeo(rows: SpendRow[]): AggregatedRow[] {
  return aggregateByDimension(rows, (r) => r.geo);
}

export function aggregateByGame(rows: SpendRow[]): AggregatedRow[] {
  return aggregateByDimension(rows, (r) => r.game);
}

export function aggregateByPlatform(rows: SpendRow[]): AggregatedRow[] {
  return aggregateByDimension(rows, (r) => r.platform);
}

export function aggregateByAll(rows: SpendRow[]): AggregatedRow[] {
  const actual = rows.reduce((s, r) => s + r.actual_spend, 0);
  const planned = rows.reduce((s, r) => s + r.planned_spend, 0);
  return [toAggRow("all", "All", actual, planned)];
}

export function aggregateByPeriod(rows: SpendRow[], period: Period): AggregatedRow[] {
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
    .map(([key, vals]) => toAggRow(key, getPeriodLabel(key, period), vals.actual, vals.planned));
}

// ── Filtering ─────────────────────────────────────────────────────────────────

type DimFilters = {
  channels: string[];
  geos: string[];
  games: string[];
  platforms: string[];
  startDate?: string;
  endDate?: string;
};

export function filterRows(rows: SpendRow[], filters: DimFilters): SpendRow[] {
  return rows.filter((row) => {
    if (filters.channels.length > 0 && !filters.channels.includes(row.channel)) return false;
    if (filters.geos.length > 0 && !filters.geos.includes(row.geo)) return false;
    if (filters.games.length > 0 && !filters.games.includes(row.game)) return false;
    if (filters.platforms.length > 0 && !filters.platforms.includes(row.platform)) return false;
    if (filters.startDate && row.date < filters.startDate) return false;
    if (filters.endDate && row.date > filters.endDate) return false;
    return true;
  });
}

export function filterForecastRows(rows: ForecastRow[], filters: DimFilters): ForecastRow[] {
  return rows.filter((row) => {
    if (filters.channels.length > 0 && !filters.channels.includes(row.channel)) return false;
    if (filters.geos.length > 0 && !filters.geos.includes(row.geo)) return false;
    if (filters.games.length > 0 && !filters.games.includes(row.game)) return false;
    if (filters.platforms.length > 0 && !filters.platforms.includes(row.platform)) return false;
    if (filters.startDate && row.date < filters.startDate) return false;
    if (filters.endDate && row.date > filters.endDate) return false;
    return true;
  });
}

// ── Unique value helpers ───────────────────────────────────────────────────────

export function getUniqueChannels(rows: (SpendRow | ForecastRow)[]): string[] {
  return Array.from(new Set(rows.map((r) => r.channel))).sort();
}

export function getUniqueGeos(rows: (SpendRow | ForecastRow)[]): string[] {
  return Array.from(new Set(rows.map((r) => r.geo))).sort();
}

export function getUniqueGames(rows: SpendRow[] | ForecastRow[]): Game[] {
  return Array.from(new Set(rows.map((r) => r.game))).sort() as Game[];
}

export function getUniquePlatforms(rows: SpendRow[] | ForecastRow[]): Platform[] {
  return Array.from(new Set(rows.map((r) => r.platform))).sort() as Platform[];
}

// ── Combined actual + forecast time series ────────────────────────────────────

const TODAY = "2026-03-06";

export function buildCombinedTimeSeries(
  actualRows: SpendRow[],
  forecastRows: ForecastRow[],
  period: Period,
  dimension: "all" | "channel" | "geo" | "game" | "platform"
): { data: Record<string, number | string | null>[]; dimValues: string[]; todayLabel: string } {
  const getDimVal = (r: SpendRow | ForecastRow) =>
    dimension === "all" ? "total" : (r as unknown as Record<string, string>)[dimension];

  const dimValues =
    dimension === "all"
      ? ["total"]
      : Array.from(
          new Set([
            ...actualRows.map((r) => r[dimension as keyof SpendRow] as string),
            ...forecastRows.map((r) => r[dimension as keyof ForecastRow] as string),
          ])
        ).sort();

  // Aggregate actual by (periodKey, dimVal)
  const actualMap = new Map<string, Map<string, number>>();
  for (const row of actualRows) {
    const pk = getPeriodKey(row.date, period);
    const dv = getDimVal(row);
    if (!actualMap.has(pk)) actualMap.set(pk, new Map());
    actualMap.get(pk)!.set(dv, (actualMap.get(pk)!.get(dv) ?? 0) + row.actual_spend);
  }

  // Aggregate forecast by (periodKey, dimVal)
  const forecastMap = new Map<string, Map<string, number>>();
  for (const row of forecastRows) {
    const pk = getPeriodKey(row.date, period);
    const dv = getDimVal(row);
    if (!forecastMap.has(pk)) forecastMap.set(pk, new Map());
    forecastMap.get(pk)!.set(dv, (forecastMap.get(pk)!.get(dv) ?? 0) + row.forecast_spend);
  }

  // Bridge: duplicate the last actual period into the forecast map so the
  // dashed forecast line visually connects to the end of the solid actual line.
  const sortedActualKeys = Array.from(actualMap.keys()).sort();
  const lastActualKey = sortedActualKeys[sortedActualKeys.length - 1];
  if (lastActualKey && forecastMap.size > 0 && !forecastMap.has(lastActualKey)) {
    forecastMap.set(lastActualKey, new Map(actualMap.get(lastActualKey)!));
  }

  const allKeys = Array.from(
    new Set([...Array.from(actualMap.keys()), ...Array.from(forecastMap.keys())])
  ).sort();

  const data = allKeys.map((pk) => {
    const point: Record<string, number | string | null> = { date: getPeriodLabel(pk, period) };
    for (const dv of dimValues) {
      point[`${dv}_actual`] = actualMap.get(pk)?.get(dv) ?? null;
      point[`${dv}_forecast`] = forecastMap.get(pk)?.get(dv) ?? null;
    }
    return point;
  });

  const todayLabel = getPeriodLabel(getPeriodKey(TODAY, period), period);
  return { data, dimValues, todayLabel };
}

// ── Time series for chart ─────────────────────────────────────────────────────

export function buildTimeSeriesData(rows: SpendRow[], period: Period) {
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

// ── Forecast helpers ──────────────────────────────────────────────────────────

export function buildFutureForecastSkeleton(
  actualRows: SpendRow[],
  fromDate: string,  // YYYY-MM-DD (Monday)
  toDate: string     // YYYY-MM-DD (Monday, inclusive)
): ForecastRow[] {
  // Get all unique combos
  const channels = getUniqueChannels(actualRows);
  const geos = getUniqueGeos(actualRows);
  const games = getUniqueGames(actualRows);
  const platforms = getUniquePlatforms(actualRows);

  // Build last-4-weeks average per combo key
  const sortedDates = Array.from(new Set(actualRows.map((r) => r.date))).sort();
  const last4Dates = sortedDates.slice(-4);

  const avgMap = new Map<string, number>();
  for (const row of actualRows) {
    if (!last4Dates.includes(row.date)) continue;
    const key = `${row.channel}|${row.geo}|${row.game}|${row.platform}`;
    avgMap.set(key, (avgMap.get(key) ?? 0) + row.actual_spend);
  }
  // Divide by count of matching dates per combo
  for (const [key, total] of avgMap.entries()) {
    avgMap.set(key, Math.round(total / last4Dates.length));
  }

  // Generate weeks in range
  const weeks: string[] = [];
  let cursor = parseISO(fromDate);
  const end = parseISO(toDate);
  while (isBefore(cursor, end) || isEqual(cursor, end)) {
    weeks.push(format(cursor, "yyyy-MM-dd"));
    cursor = addWeeks(cursor, 1);
  }

  // Build rows
  const result: ForecastRow[] = [];
  for (const week of weeks) {
    for (const channel of channels) {
      for (const geo of geos) {
        for (const game of games) {
          for (const platform of platforms) {
            const key = `${channel}|${geo}|${game}|${platform}`;
            result.push({
              date: week,
              channel,
              geo,
              game: game as Game,
              platform: platform as Platform,
              forecast_spend: avgMap.get(key) ?? 0,
            });
          }
        }
      }
    }
  }

  return result;
}

// ── Compare helpers ────────────────────────────────────────────────────────────

export function buildCompareRows(
  rowsA: { key: string; label: string; value: number }[],
  rowsB: { key: string; label: string; value: number }[]
): CompareRow[] {
  const mapA = new Map(rowsA.map((r) => [r.key, r]));
  const mapB = new Map(rowsB.map((r) => [r.key, r]));
  const keys = Array.from(new Set([...Array.from(mapA.keys()), ...Array.from(mapB.keys())]));

  return keys.map((key) => {
    const a = mapA.get(key);
    const b = mapB.get(key);
    const valA = a?.value ?? 0;
    const valB = b?.value ?? 0;
    const delta = valB - valA;
    const deltaPct = valA !== 0 ? (delta / valA) * 100 : 0;
    return { key, label: a?.label ?? b?.label ?? key, valueA: valA, valueB: valB, delta, deltaPct };
  });
}

export function aggregateForecastByDimension(
  version: ForecastVersion,
  getDim: (r: ForecastRow) => string
): { key: string; label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const row of version.rows) {
    const key = getDim(row);
    map.set(key, (map.get(key) ?? 0) + row.forecast_spend);
  }
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, label: key, value }))
    .sort((a, b) => b.value - a.value);
}

export function aggregateForecastByChannel(version: ForecastVersion) {
  return aggregateForecastByDimension(version, (r) => r.channel);
}

export function aggregateForecastByGeo(version: ForecastVersion) {
  return aggregateForecastByDimension(version, (r) => r.geo);
}

export function aggregateForecastByGame(version: ForecastVersion) {
  return aggregateForecastByDimension(version, (r) => r.game);
}

export function aggregateForecastByPlatform(version: ForecastVersion) {
  return aggregateForecastByDimension(version, (r) => r.platform);
}

// ── Next Monday helper ─────────────────────────────────────────────────────────

export function getNextMonday(fromDateStr: string): string {
  const date = parseISO(fromDateStr);
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMonday = day === 0 ? 1 : (8 - day) % 7 || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() + (day === 1 ? 0 : daysUntilMonday));
  return format(monday, "yyyy-MM-dd");
}

export function addWeeksToDate(dateStr: string, weeks: number): string {
  return format(addWeeks(parseISO(dateStr), weeks), "yyyy-MM-dd");
}
