import { describe, expect, it } from "vitest";
import { median, reviewPrices, type PriceInput } from "./price-review";
import { clpToUf, parseUfResponse, ufToClp } from "./uf";

const base = { operation: "venta" as const, type: "departamento" as const, comuna: "Las Condes", currency: "UF" as const };
const dept = (id: string, price: number, m2: number | null, extra: Partial<PriceInput> = {}): PriceInput => ({ id, code: id, price, m2Useful: m2, ...base, ...extra });

describe("reviewPrices", () => {
  const items = [dept("a", 9000, 100), dept("b", 9500, 100), dept("c", 10000, 100), dept("d", 16000, 100), dept("e", 5000, 100)];

  it("marca lo que se aleja más de 35 % de la mediana de la comuna", () => {
    const r = Object.fromEntries(reviewPrices(items).map((x) => [x.id, x]));
    expect(r.c!.median).toBe(95);
    expect(r.d!.flags).toContain("sobre");
    expect(r.e!.flags).toContain("bajo");
    expect(r.a!.flags).toEqual([]);
    expect(r.a!.basis).toBe("Las Condes");
  });

  it("compara con toda la cartera si en la comuna hay pocas", () => {
    const r = reviewPrices([...items, dept("f", 9000, 100, { comuna: "Ñuñoa" })]).find((x) => x.id === "f")!;
    expect(r.basis).toBe("toda la cartera");
    expect(r.sample).toBe(6);
  });

  it("detecta packs de varias unidades y no los usa para la mediana", () => {
    const pack = dept("p", 4150, 28, { headline: "Pack 2 Deptos I 1D 1B I Arrendados" });
    const r = reviewPrices([...items, pack]);
    expect(r.find((x) => x.id === "p")!.flags).toEqual(["pack"]);
    expect(r.find((x) => x.id === "a")!.median).toBe(95);
  });

  it("no compara pesos con UF ni propiedades sin superficie", () => {
    const clp = dept("x", 1_450_000, 58, { operation: "arriendo", currency: "CLP" });
    const r = reviewPrices([...items, clp, dept("y", 100, null)]);
    expect(r.find((x) => x.id === "x")!.median).toBeNull();
    expect(r.find((x) => x.id === "y")!.flags).toEqual(["sin_m2"]);
  });

  it("calcula la mediana", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("UF", () => {
  it("toma el valor más reciente con su fecha en Chile", () => {
    const uf = parseUfResponse({ serie: [{ fecha: "2026-11-11T03:00:00.000Z", valor: 41309.19 }, { fecha: "2026-11-12T03:00:00.000Z", valor: 41316.06 }] });
    expect(uf).toEqual({ value: 41316.06, date: "2026-11-12" });
  });
  it("rechaza respuestas inválidas", () => {
    expect(parseUfResponse({ serie: [] })).toBeNull();
    expect(parseUfResponse("error")).toBeNull();
  });
  it("convierte en ambos sentidos", () => {
    expect(ufToClp(5490, 41316.06)).toBe(226_825_169);
    expect(clpToUf(1_450_000, 41316.06)).toBe(35.1);
  });
});

describe("detección de packs", () => {
  it("no confunde 'departamentos por piso' con un pack", () => {
    const d = dept("q", 16800, 280, { description: "3 Estacionamientos. 2 departamentos por piso, conserjería 24/7." });
    expect(reviewPrices([d]).find((x) => x.id === "q")!.flags).not.toContain("pack");
  });
});
