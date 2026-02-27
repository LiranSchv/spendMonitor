"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ForecastVersion, ForecastRow, SpendRow } from "./types";
import { buildInitialForecast } from "./utils";
// Simple uuid without external dependency
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

type Filters = {
  channels: string[];
  geos: string[];
  startDate: string;
  endDate: string;
};

type SpendStore = {
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
  updateForecastCell: (rowIndex: number, value: number) => void;
  initForecastFromActual: (rows: SpendRow[]) => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
};

const defaultFilters: Filters = {
  channels: [],
  geos: [],
  startDate: "",
  endDate: "",
};

export const useSpendStore = create<SpendStore>()(
  persist(
    (set, get) => ({
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
          set({
            activeVersionId: id,
            currentForecastRows: version.rows,
          });
        }
      },

      deleteVersion: (id) => {
        set((state) => ({
          versions: state.versions.filter((v) => v.id !== id),
          activeVersionId: state.activeVersionId === id ? null : state.activeVersionId,
        }));
      },

      setCurrentForecastRows: (rows) => set({ currentForecastRows: rows }),

      updateForecastCell: (rowIndex, value) => {
        set((state) => {
          const rows = [...state.currentForecastRows];
          rows[rowIndex] = { ...rows[rowIndex], forecast_spend: value };
          return { currentForecastRows: rows };
        });
      },

      initForecastFromActual: (rows) => {
        const forecastRows = buildInitialForecast(rows);
        set({ currentForecastRows: forecastRows, activeVersionId: null });
      },

      setFilters: (partial) => {
        set((state) => ({
          filters: { ...state.filters, ...partial },
        }));
      },

      resetFilters: () => set({ filters: defaultFilters }),
    }),
    {
      name: "spend-monitor-store",
      partialize: (state) => ({
        versions: state.versions,
        activeVersionId: state.activeVersionId,
      }),
    }
  )
);
