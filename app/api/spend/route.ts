import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { SpendRow } from "@/lib/types";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "data", "spend.csv");
    const csv = readFileSync(filePath, "utf-8");

    const lines = csv.trim().split("\n");
    const headers = lines[0].split(",");

    const rows: SpendRow[] = lines.slice(1).map((line) => {
      const values = line.split(",");
      const row: Record<string, string | number> = {};
      headers.forEach((header, i) => {
        const val = values[i]?.trim() ?? "";
        if (header === "actual_spend" || header === "planned_spend") {
          row[header] = parseFloat(val);
        } else {
          row[header] = val;
        }
      });
      return row as unknown as SpendRow;
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error loading spend data:", error);
    return NextResponse.json({ error: "Failed to load spend data" }, { status: 500 });
  }
}
