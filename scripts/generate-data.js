// scripts/generate-data.js
// Generates data/spend.csv with weekly marketing spend data from 2024-01-01 to 2026-02-23
const fs = require("fs");
const path = require("path");

// ── Dimensions ────────────────────────────────────────────────────────────────
const CHANNELS = ["Facebook", "Google", "TikTok", "Snapchat", "Twitter", "YouTube", "Pinterest", "AppleSearch"];
const GEOS = ["US", "UK", "DE", "AU"];
const GAMES = ["solitaire", "21cash", "bubble", "bingo"];
const PLATFORMS = ["ios", "android"];

// ── Base spend multipliers ────────────────────────────────────────────────────
const CHANNEL_BASE = {
  Facebook: 12000, Google: 10000, TikTok: 7000, YouTube: 6500,
  Snapchat: 4500, Twitter: 3200, Pinterest: 2800, AppleSearch: 5500,
};
const GEO_MULT = { US: 1.0, UK: 0.38, DE: 0.25, AU: 0.17 };
const GAME_MULT = { solitaire: 1.0, "21cash": 0.75, bubble: 0.60, bingo: 0.45 };
const PLATFORM_MULT = { ios: 1.0, android: 0.85 };

// ── Growth & seasonality ──────────────────────────────────────────────────────
const WEEKLY_GROWTH = 0.00077; // ~2% per quarter (~0.077% per week)

function seasonalFactor(dateStr) {
  const month = new Date(dateStr + "T12:00:00").getMonth(); // local noon avoids UTC shift
  if (month === 10 || month === 11) return 1.20; // Nov, Dec
  if (month === 0  || month === 1)  return 0.90; // Jan, Feb
  if (month === 5  || month === 6)  return 0.95; // Jun, Jul
  return 1.0;
}

function noise() {
  return 0.92 + Math.random() * 0.16; // ±8%
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMondaysInRange(startStr, endStr) {
  const start = new Date(startStr + "T12:00:00");
  const end   = new Date(endStr   + "T12:00:00");
  const weeks = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    weeks.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

// ── Main generation ───────────────────────────────────────────────────────────
const START = "2024-01-01"; // Monday
const END   = "2026-02-23"; // Monday

const weeks = getMondaysInRange(START, END);
console.log(`Generating ${weeks.length} weeks × ${CHANNELS.length * GEOS.length * GAMES.length * PLATFORMS.length} combos...`);

const outputPath = path.join(__dirname, "..", "data", "spend.csv");
const stream = fs.createWriteStream(outputPath);

stream.write("date,channel,geo,game,platform,actual_spend,planned_spend\n");

let rowCount = 0;
for (let wi = 0; wi < weeks.length; wi++) {
  const week = weeks[wi];
  const growth = Math.pow(1 + WEEKLY_GROWTH, wi);
  const seasonal = seasonalFactor(week);

  for (const channel of CHANNELS) {
    for (const geo of GEOS) {
      for (const game of GAMES) {
        for (const platform of PLATFORMS) {
          const base = CHANNEL_BASE[channel] * GEO_MULT[geo] * GAME_MULT[game] * PLATFORM_MULT[platform];
          const planned = Math.round(base * growth * seasonal);
          const actual  = Math.round(base * growth * seasonal * noise());

          stream.write(`${week},${channel},${geo},${game},${platform},${actual},${planned}\n`);
          rowCount++;
        }
      }
    }
  }
}

stream.end(() => {
  console.log(`Done! Wrote ${rowCount.toLocaleString()} rows to data/spend.csv`);
});
