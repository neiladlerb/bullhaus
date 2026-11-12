import { describe, expect, it } from "vitest";
import { renderTemplate } from "./contract-template";
import { CONTRACT_TEMPLATE_SOURCES } from "./contract-templates.generated";
import { INTEGRATIONS, integrationMode, isStopWord } from "./integrations";
import { LINKEDIN_TIPS, linkedinPostText } from "./linkedin-tips";
import { commissionAmount, dealBlocker, invoiceAmounts, kycRisk, nextDealStage } from "./operations";

describe("plantillas", () => {
  it("reemplaza campos, condiciones y listas", () => {
    const r = renderTemplate("{{#if a}}Sí {{x.y}}{{else}}No{{/if}} {{#each l}}{{n}}{{#unless @last}}, {{/unless}}{{/each}}", { a: true, x: { y: 1 }, l: [{ n: "A" }, { n: "B" }] });
    expect(r).toEqual({ text: "Sí 1 A, B", missing: [] });
  });
  it("no inventa campos que faltan", () => {
    const r = renderTemplate("Rol {{propiedad.rol_avaluo}}", { propiedad: {} });
    expect(r.text).toBe("Rol [FALTA: propiedad.rol_avaluo]");
    expect(r.missing).toEqual(["propiedad.rol_avaluo"]);
  });
  it("usa los campos del elemento dentro de #each y los globales fuera", () => {
    const r = renderTemplate("{{#each p}}{{nombre}} en {{ciudad}}{{/each}}", { ciudad: "Santiago", p: [{ nombre: "Ana" }] });
    expect(r.text).toBe("Ana en Santiago");
  });
  it("trae las cuatro plantillas de docs/contratos sin el comentario de cabecera", () => {
    expect(Object.keys(CONTRACT_TEMPLATE_SOURCES)).toHaveLength(4);
    const r = renderTemplate(CONTRACT_TEMPLATE_SOURCES.orden_corretaje.body, {});
    expect(r.text.startsWith("# ORDEN DE CORRETAJE")).toBe(true);
    expect(r.missing.length).toBeGreaterThan(10);
  });
});

describe("operaciones", () => {
  it("no pasa a promesa ni contrato sin KYC aprobado de todas las partes", () => {
    expect(dealBlocker("promesa", [{ name: "Ana", kycStatus: "aprobado" }, { name: "Luis", kycStatus: "en_revision" }])).toBe("Falta KYC aprobado de: Luis.");
    expect(dealBlocker("contrato", [])).toMatch(/no tiene partes/);
    expect(dealBlocker("promesa", [{ name: "Ana", kycStatus: "aprobado" }])).toBeNull();
    expect(dealBlocker("reserva", [{ name: "Ana", kycStatus: null }])).toBeNull();
  });
  it("sigue el camino de venta y de arriendo", () => {
    expect(nextDealStage("reserva", "venta")).toBe("promesa");
    expect(nextDealStage("reserva", "arriendo")).toBe("contrato");
    expect(nextDealStage("cerrada", "venta")).toBeNull();
  });
  it("calcula riesgo, comisión e IVA", () => {
    expect(kycRisk({ pep: true, foreign: false, juridica: false, amountUf: 25_000, cashOrigin: false }).level).toBe("alto");
    expect(kycRisk({ pep: false, foreign: false, juridica: false, amountUf: 5_000, cashOrigin: false })).toEqual({ score: 10, level: "bajo" });
    expect(commissionAmount("venta", 10_000, 2)).toBe(200);
    expect(commissionAmount("arriendo", 1_000_000, 0.5)).toBe(500_000);
    expect(invoiceAmounts(1_000_000)).toEqual({ netClp: 1_000_000, ivaClp: 190_000, totalClp: 1_190_000 });
  });
});

describe("integraciones y agentes", () => {
  it("marca simulada en demo y conectada solo con todas sus variables", () => {
    const meta = INTEGRATIONS.find((i) => i.key === "meta_business")!;
    expect(integrationMode(meta, {}, true)).toBe("simulada");
    expect(integrationMode(meta, {}, false)).toBe("no_conectada");
    expect(integrationMode(meta, Object.fromEntries(meta.env.map((k) => [k, "x"])), true)).toBe("conectada");
  });
  it("reconoce las palabras de baja sin modelo", () => {
    expect(isStopWord(" baja. ", ["BAJA", "STOP"])).toBe(true);
    expect(isStopWord("quiero bajar el precio", ["BAJA"])).toBe(false);
  });
});

describe("serie Bull Haus te asesora (LinkedIn)", () => {
  it("tiene claves únicas y textos sin cifras, montos ni vocabulario fuera de Chile", () => {
    expect(new Set(LINKEDIN_TIPS.map((t) => t.key)).size).toBe(LINKEDIN_TIPS.length);
    for (const t of LINKEDIN_TIPS) {
      const text = linkedinPostText(t);
      expect(text, t.key).not.toMatch(/\d/);
      expect(text, t.key).not.toMatch(/\bUF\b|\$|%/);
      expect(text, t.key).not.toMatch(/\b(piso para|alquiler|móvil|crédito hipotecario|tasa)\b/i);
      expect(text).toContain("Bull Haus te asesora");
    }
  });
  it("cubre vender, comprar y arrendar", () => {
    expect(new Set(LINKEDIN_TIPS.map((t) => t.topic))).toEqual(new Set(["vender", "comprar", "arrendar"]));
  });
});
