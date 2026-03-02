import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ForecastOperation } from "@/lib/types";

type ParseRequest = {
  text: string;
  currentDate: string;
  availableDimensions: {
    channels: string[];
    geos: string[];
    games: string[];
    platforms: string[];
    forecastStartDate: string;
    forecastEndDate: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body: ParseRequest = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured. Add it to .env.local." },
        { status: 503 }
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You are a structured data extractor for a marketing spend forecasting tool.

Today's date is ${body.currentDate}.
The forecast covers ${body.availableDimensions.forecastStartDate} to ${body.availableDimensions.forecastEndDate}.

Available dimensions:
- channels: ${body.availableDimensions.channels.join(", ")}
- geos: ${body.availableDimensions.geos.join(", ")}
- games: ${body.availableDimensions.games.join(", ")}
- platforms: ${body.availableDimensions.platforms.join(", ")}

Parse the user's instruction into a structured spend adjustment operation.

Rules:
- "increase/add/boost by X%" → action: "add_pct", value: X (positive)
- "decrease/reduce/cut by X%" → action: "add_pct", value: -X (negative)
- "set to $X" or "set to X" → action: "set", value: X
- "add $X flat" or "increase by $X" → action: "add_flat", value: X
- "next 3 months" → startDate: next Monday, endDate: 13 weeks later
- "next 6 months" → 26 weeks later
- "next 2 months" → 9 weeks later
- "next month" → 4 weeks later
- "next N weeks" → N weeks later
- "Q1 2026" → 2026-01-05 to 2026-03-30
- "Q2 2026" → 2026-04-06 to 2026-06-29
- "this week" → just startDate to same endDate
- If no date range mentioned, use the full forecast range
- If no channel mentioned, use [] (means all)
- If no geo mentioned, use []
- If no game mentioned, use []
- If no platform mentioned, use []
- Match dimension names case-insensitively; "android" or "Google Play" or "google" maps to "android" platform
- "ios" or "apple" maps to "ios" platform
- Multiple items mentioned → include all in array

Respond ONLY with valid JSON, no markdown fences, no explanation:
{
  "action": "set" or "add_pct" or "add_flat",
  "value": number,
  "channels": [],
  "geos": [],
  "games": [],
  "platforms": [],
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "summary": "plain English summary of what will happen"
}

User instruction: "${body.text}"`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Strip any markdown code fences if model adds them
    const jsonText = rawText.replace(/^```json?\s*/i, "").replace(/\s*```$/, "").trim();

    let operation: ForecastOperation;
    try {
      operation = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse model response", raw: rawText },
        { status: 422 }
      );
    }

    // Validate required fields
    if (!["set", "add_pct", "add_flat"].includes(operation.action)) {
      return NextResponse.json({ error: "Invalid action in response" }, { status: 422 });
    }

    return NextResponse.json(operation);
  } catch (error) {
    console.error("Forecast parse error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
