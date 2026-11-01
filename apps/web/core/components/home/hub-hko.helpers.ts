import type { onlineRows } from "./hub-summary.helpers";
export type CollectorRow = ReturnType<typeof onlineRows>[number];
export type HkoCoverage = {
  station_feeds: {
    key: string;
    label: string;
    station_count: number | null;
    stations: string[] | null;
    observed_at?: string;
  }[];
  product_observations: {
    key: string;
    label: string;
    count: number | null;
    unit: string;
    stations: string[] | null;
    areas: string[] | null;
    observed_at?: string;
    depth_count?: number | null;
  }[];
  products: {
    key: string;
    label: string;
    available: boolean;
    scope: string;
    updated_at?: string;
    days?: number | null;
  }[];
  comparisons: {
    key: string;
    label: string;
    station_count: number | null;
    product_count: number | null;
    overlap: number | null;
    union: number | null;
    station_only: string[] | null;
    product_only: string[] | null;
  }[];
  station_names: string[];
  unique_station_names: number | null;
  coverage_complete: boolean;
  aliases: { alias: string; canonical: string }[];
};
export function splitHkoRows(rows: CollectorRow[]) {
  const missing = (id: string, name: string): CollectorRow => ({
    id,
    name,
    cadence: "每 10 分钟",
    time_label: "最近采集",
    last_collected_at: undefined,
    detail: "等待同步",
    health: { tone: "muted", label: "待核实", detail: "尚无采集回执" },
  });
  return {
    stations:
      rows.find((r) => r.id === "hko-stations" || r.id === "hko") ??
      missing("hko-stations", "站点实测"),
    products: rows.find((r) => r.id === "hko-products") ?? missing("hko-products", "天气预报产品"),
    archive: rows.find((r) => r.id === "hko-website"),
    others: rows.filter((r) => r.id !== "hko" && !r.id.startsWith("hko-")),
  };
}
export function hkoCount(value: number | null | undefined, unit = "站") {
  return value == null ? "待同步" : `${value.toLocaleString()} ${unit}`;
}
