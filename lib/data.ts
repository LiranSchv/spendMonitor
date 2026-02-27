import { SpendRow } from "./types";

export async function loadSpendData(): Promise<SpendRow[]> {
  const response = await fetch("/api/spend");
  if (!response.ok) throw new Error("Failed to load spend data");
  const data = await response.json();
  return data as SpendRow[];
}
