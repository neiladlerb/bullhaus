import { describe, expect, it } from "vitest";
import { adjustedValue, adjustmentPercent, comparableProblem, parseAdjustments, quantile, roundValue, suggestComparables, valuationResult, type ComparableInput, type ValuationSubject } from "./valuation";

const casa: ValuationSubject = { operation: "venta", type: "casa", comuna: "Las Condes", sector: "Los Dominicos", currency: "UF", m2Useful: 200, m2Land: 700, bedrooms: 4, bathrooms: 3 };
const comp = (over: Partial<ComparableInput>): ComparableInput => ({
  source: "cartera",
  operation: "venta",
  type: "casa",
  comuna: "Las Condes",
  sector: "Los Dominicos",
  currency: "UF",
  price: 20000,
  m2Useful: 200,
  m2Land: 700,
  bedrooms: 4,
  bathrooms: 3,
  ...over,
});

describe("tasación: qué sirve como comparable", () => {
  it("descarta otra operación, tipo, moneda, comuna o superficie muy distinta, con el motivo", () => {
    expect(comparableProblem(casa, comp({}))).toBeNull();
    expect(comparableProblem(casa, comp({ operation: "arriendo" }))).toBe("Otra operación");
    expect(comparableProblem(casa, comp({ type: "departamento" }))).toBe("Otro tipo de propiedad");
    expect(comparableProblem(casa, comp({ currency: "CLP" }))).toContain("no se convierte");
    expect(comparableProblem(casa, comp({ comuna: "Vitacura" }))).toBe("Otra comuna");
    expect(comparableProblem(casa, comp({ m2Useful: 400 }))).toBe("Superficie muy distinta");
    expect(comparableProblem(casa, comp({ m2Useful: null }))).toBe("Sin superficie");
  });

  it("la comuna se compara sin tildes ni mayúsculas", () => {
    expect(comparableProblem({ ...casa, comuna: "Ñuñoa" }, comp({ comuna: "ñunoa" }))).toBeNull();
  });

  it("terrenos y parcelas se comparan por m² de terreno", () => {
    const terreno: ValuationSubject = { ...casa, type: "terreno", m2Useful: null, m2Land: 1000 };
    expect(comparableProblem(terreno, comp({ type: "terreno", m2Useful: null, m2Land: 1100 }))).toBeNull();
    expect(valuationResult(terreno, [comp({ type: "terreno", m2Useful: null, m2Land: 1000, price: 30000 })]).value?.point).toBe(30000);
  });

  it("ordena por parecido: mismo sector, superficie y dormitorios primero", () => {
    const lejos = comp({ sector: "El Golf", m2Useful: 280, bedrooms: 5, price: 1 });
    const cerca = comp({ m2Useful: 205, price: 2 });
    const cierre = comp({ source: "cierre", m2Useful: 205, price: 3 });
    expect(suggestComparables(casa, [lejos, cerca, cierre]).map((c) => c.price)).toEqual([3, 2, 1]);
  });
});

describe("tasación: resultado", () => {
  it("mediana del valor por m² por la superficie, con rango entre percentiles 25 y 75", () => {
    const comps = [100, 110, 120, 130, 140, 150].map((m2Price) => comp({ price: m2Price * 200 }));
    const r = valuationResult(casa, comps);
    expect(r.count).toBe(6);
    expect(r.confidence).toBe("alta");
    expect(r.perM2?.median).toBe(125);
    expect(r.value).toEqual({ low: 22500, point: 25000, high: 27500 });
  });

  it("marca atípicos y cuenta los cierres", () => {
    const r = valuationResult(casa, [comp({ price: 20000 }), comp({ price: 21000, source: "cierre" }), comp({ price: 40000 })]);
    expect(r.outliers).toEqual([2]);
    expect(r.closings).toBe(1);
    expect(r.confidence).toBe("media");
  });

  it("sin comparables o sin superficie no inventa un valor", () => {
    expect(valuationResult(casa, []).value).toBeNull();
    expect(valuationResult({ ...casa, m2Useful: null }, [comp({})]).value).toBeNull();
    expect(valuationResult(casa, [comp({ comuna: "Vitacura" })]).count).toBe(0);
  });

  it("redondea UF a la decena y pesos a la decena de mil", () => {
    expect(roundValue(18456, "UF")).toBe(18460);
    expect(roundValue(1_456_789, "CLP")).toBe(1_460_000);
    expect(quantile([1], 0.25)).toBe(1);
  });
});

describe("tasación: ajustes del corredor", () => {
  const r = valuationResult(casa, [100, 110, 120, 130, 140, 150].map((m2Price) => comp({ price: m2Price * 200 })));

  it("mueven el valor y el rango con la suma de porcentajes", () => {
    const v = adjustedValue(r, [{ label: "Estado de conservación", percent: -10, note: "Requiere pintura y baños" }, { label: "Vista u orientación", percent: 4, note: "" }], "UF");
    expect(v).toEqual({ low: 21150, point: 23500, high: 25850, percent: -6 });
  });

  it("acota cada ajuste a 20 % y el total a 30 %", () => {
    expect(adjustmentPercent([{ label: "Otro", percent: 50, note: "" }])).toBe(20);
    expect(adjustmentPercent([{ label: "A", percent: 20, note: "" }, { label: "B", percent: 20, note: "" }])).toBe(30);
  });

  it("sin valor de comparables no hay valor ajustado, y descarta ajustes mal formados", () => {
    expect(adjustedValue(valuationResult(casa, []), [{ label: "Otro", percent: 5, note: "" }], "UF")).toBeNull();
    expect(parseAdjustments([{ label: "Ok", percent: 3 }, { label: 1 }, null, "x"])).toEqual([{ label: "Ok", percent: 3, note: "" }]);
  });
});
