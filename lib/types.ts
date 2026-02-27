export type SpendRow = {
  date: string;       // YYYY-MM-DD
  channel: string;
  geo: string;
  actual_spend: number;
  planned_spend: number;
};

export type ForecastRow = {
  date: string;
  channel: string;
  geo: string;
  forecast_spend: number;
};

export type ForecastVersion = {
  id: string;
  name: string;
  createdAt: string;
  rows: ForecastRow[];
};

export type GroupBy = "channel" | "geo" | "period";
export type Period = "week" | "month" | "quarter";

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
