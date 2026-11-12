import { describe, expect, it } from "vitest";
import { marketTime, marketTimeByQuarter, SALES_PROCESS, type MarketDeal } from "./market-time";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const deals: MarketDeal[] = [
  { operation: "venta", stage: "cerrada", listedAt: d("2026-01-01"), reservedAt: d("2026-03-02"), closedAt: d("2026-04-01") },
  { operation: "venta", stage: "promesa", listedAt: d("2026-05-01"), reservedAt: d("2026-06-10"), closedAt: null },
  { operation: "venta", stage: "caida", listedAt: d("2026-01-01"), reservedAt: d("2026-09-01"), closedAt: null },
  { operation: "venta", stage: "reserva", listedAt: null, reservedAt: d("2026-09-01"), closedAt: null },
  { operation: "arriendo", stage: "cerrada", listedAt: d("2026-02-01"), reservedAt: d("2026-02-15"), closedAt: d("2026-02-25") },
];

describe("marketTime", () => {
  it("promedia días al mercado sin caídas ni fechas faltantes", () => {
    expect(marketTime(deals, "venta")).toEqual({ count: 2, avgDays: 50, medianDays: 50, avgCloseDays: 30 });
    expect(marketTime(deals, "arriendo")).toEqual({ count: 1, avgDays: 14, medianDays: 14, avgCloseDays: 10 });
  });
  it("sin datos devuelve nulos", () => {
    expect(marketTime([], "venta")).toEqual({ count: 0, avgDays: null, medianDays: null, avgCloseDays: null });
  });
  it("agrupa por trimestre en orden", () => {
    expect(marketTimeByQuarter(deals, "venta").map((q) => q.label)).toEqual(["T1 2026", "T2 2026"]);
  });
  it("el proceso no promete plazos ni cifras", () => {
    const text = JSON.stringify(SALES_PROCESS);
    expect(text).not.toMatch(/\d|UF|\$/);
  });
});
