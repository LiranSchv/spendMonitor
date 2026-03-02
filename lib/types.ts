export type Game = "solitaire" | "21cash" | "bubble" | "bingo";
export type Platform = "ios" | "android";

export type SpendRow = {
  date: string;           // YYYY-MM-DD (always a Monday)
  channel: string;
  geo: string;
  game: Game;
  platform: Platform;
  actual_spend: number;
  planned_spend: number;
};

export type ForecastRow = {
  date: string;           // YYYY-MM-DD (Monday)
  channel: string;
  geo: string;
  game: Game;
  platform: Platform;
  forecast_spend: number;
};

export type ForecastVersion = {
  id: string;
  name: string;
  createdAt: string;
  rows: ForecastRow[];
};

export type GroupBy = "all" | "channel" | "geo" | "game" | "platform" | "period";
export type Period = "week" | "month" | "quarter" | "year";

export type AggregatedRow = {
  key: string;
  label: string;
  actual_spend: number;
  planned_spend: number;
  variance: number;
  variancePct: number;
};

export type CompareRow = {
  key: string;
  label: string;
  valueA: number;
  valueB: number;
  delta: number;
  deltaPct: number;
};

export type ForecastOperation = {
  action: "set" | "add_pct" | "add_flat";
  value: number;
  channels: string[];   // empty = all
  geos: string[];       // empty = all
  games: string[];      // empty = all
  platforms: string[];  // empty = all
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  summary: string;
};
