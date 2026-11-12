import { describe, expect, it } from "vitest";
import { captacionPosts, listingFacts, listingPost } from "./campaigns";
import { pipelineOf, rate, STAGE_LABELS } from "./pipeline";

const depto = {
  code: "109958",
  operation: "venta" as const,
  type: "departamento" as const,
  comuna: "Ñuñoa",
  headline: "Excelente luminoso",
  price: 5490,
  currency: "UF" as const,
  m2Useful: 77,
  bedrooms: 2,
  bathrooms: 2,
  features: ["Piscina", "Bodega"],
};

describe("listingPost", () => {
  it("usa el precio con formato chileno y el código de la ficha", () => {
    const p = listingPost(depto);
    expect(p.caption).toContain("UF 5.490");
    expect(p.caption).toContain("109958");
    expect(p.caption).toContain("2 dormitorios");
    expect(p.hashtags).toContain("#Nunoa");
  });

  it("no inventa datos que la ficha no tiene", () => {
    const p = listingPost({ ...depto, bedrooms: null, m2Useful: null, features: [] });
    expect(p.caption).not.toMatch(/dormitorio|m²/);
    expect(listingFacts({ ...depto, bedrooms: null, bathrooms: null, m2Useful: null })).toEqual([]);
  });

  it("marca el arriendo como mensual y en pesos", () => {
    const p = listingPost({ ...depto, operation: "arriendo", price: 1_450_000, currency: "CLP" });
    expect(p.caption).toContain("$1.450.000 mensual");
    expect(p.caption).not.toMatch(/piso|alquiler/i);
  });
});

describe("captacionPosts", () => {
  it("no promete plazos ni cifras que Bull Haus no publica", () => {
    for (const p of captacionPosts()) {
      expect(p.caption).not.toMatch(/\d+\s*(días|%)|garantiz/i);
    }
  });
});

describe("pipeline", () => {
  it("usa etiquetas de captación para propietarios", () => {
    expect(STAGE_LABELS[pipelineOf("propietario")].visita).toBe("Tasación agendada");
    expect(STAGE_LABELS[pipelineOf("comprador")].visita).toBe("Visita agendada");
  });
  it("calcula tasas", () => {
    expect(rate(1, 4)).toBe("25 %");
    expect(rate(1, 0)).toBe("—");
  });
});
