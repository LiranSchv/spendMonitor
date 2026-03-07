"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ForecastVersion, ForecastRow, SpendRow, ForecastOperation } from "./types";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

type Filters = {
  channels: string[];
  geos: string[];
  games: string[];
  platforms: string[];
  startDate: string;
  endDate: string;
};

const defaultFilters: Filters = {
  channels: [],
  geos: [],
  games: [],
  platforms: [],
  startDate: "",
  endDate: "",
};

type SpendStore = {
  // Spend data (not persisted — fetched on demand)
  spendRows: SpendRow[];
  isLoaded: boolean;
  loadSpendRows: () => Promise<void>;

  // Forecast versions
  versions: ForecastVersion[];
  activeVersionId: string | null;
  currentForecastRows: ForecastRow[];

  // Filters (shared across pages)
  filters: Filters;

  // Actions
  saveVersion: (name: string, rows: ForecastRow[]) => void;
  loadVersion: (id: string) => void;
  deleteVersion: (id: string) => void;
  setCurrentForecastRows: (rows: ForecastRow[]) => void;
  updateForecastCell: (rowKey: string, value: number) => void;
  applyBulkOperation: (op: ForecastOperation) => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
};

export const useSpendStore = create<SpendStore>()(
  persist(
    (set, get) => ({
      spendRows: [],
      isLoaded: false,

      loadSpendRows: async () => {
        if (get().isLoaded && get().spendRows.length > 0) return;
        const response = await fetch("/api/spend");
        if (!response.ok) throw new Error("Failed to load spend data");
        const rows = await response.json();
        set({ spendRows: rows, isLoaded: true });
      },

      versions: [],
      activeVersionId: null,
      currentForecastRows: [],
      filters: defaultFilters,

      saveVersion: (name, rows) => {
        const newVersion: ForecastVersion = {
          id: generateId(),
          name,
          createdAt: new Date().toISOString(),
          rows,
        };
        set((state) => ({
          versions: [...state.versions, newVersion],
          activeVersionId: newVersion.id,
        }));
      },

      loadVersion: (id) => {
        const version = get().versions.find((v) => v.id === id);
        if (version) {
          set({ activeVersionId: id, currentForecastRows: version.rows });
        }
      },

      deleteVersion: (id) => {
        set((state) => ({
          versions: state.versions.filter((v) => v.id !== id),
          activeVersionId: state.activeVersionId === id ? null : state.activeVersionId,
        }));
      },

      setCurrentForecastRows: (rows) => set({ currentForecastRows: rows }),

      updateForecastCell: (rowKey, value) => {
        set((state) => {
          const rows = state.currentForecastRows.map((row) => {
            const key = `${row.date}|${row.channel}|${row.geo}|${row.game}|${row.platform}`;
            return key === rowKey ? { ...row, forecast_spend: value } : row;
          });
          return { currentForecastRows: rows };
        });
      },

      applyBulkOperation: (op) => {
        set((state) => {
          const rows = state.currentForecastRows.map((row) => {
            // Check dimension filters (empty = all)
            const matchChannel = op.channels.length === 0 || op.channels.includes(row.channel);
            const matchGeo = op.geos.length === 0 || op.geos.includes(row.geo);
            const matchGame = op.games.length === 0 || op.games.includes(row.game);
            const matchPlatform = op.platforms.length === 0 || op.platforms.includes(row.platform);
            const matchDate = row.date >= op.startDate && row.date <= op.endDate;

            if (!matchChannel || !matchGeo || !matchGame || !matchPlatform || !matchDate) {
              return row;
            }

            let newValue = row.forecast_spend;
            if (op.action === "set") {
              newValue = op.value;
            } else if (op.action === "add_pct") {
              newValue = Math.round(row.forecast_spend * (1 + op.value / 100));
            } else if (op.action === "add_flat") {
              newValue = Math.max(0, row.forecast_spend + op.value);
            }

            return { ...row, forecast_spend: Math.max(0, Math.round(newValue)) };
          });
          return { currentForecastRows: rows };
        });
      },

      setFilters: (partial) => {
        set((state) => ({ filters: { ...state.filters, ...partial } }));
      },

      resetFilters: () => set({ filters: defaultFilters }),
    }),
    {
      name: "spend-monitor-store-v2",
      partialize: (state) => ({
        versions: state.versions,
        activeVersionId: state.activeVersionId,
        // DO NOT persist spendRows (too large) or currentForecastRows
      }),
    }
  )
);
