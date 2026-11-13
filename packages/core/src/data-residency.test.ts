import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DataResidencyError, HOSTING_REGIONS, INTEGRATIONS, PROJECT_JURISDICTION, SUBPROCESSORS, isVercelEuRegion, resolveModelRoute } from "./index";

const prod = { VERCEL_ENV: "production" };

describe("regiones de Vercel", () => {
  for (const app of ["web", "backoffice"]) {
    it(`apps/${app} declara las regiones elegidas (sin región, Vercel usa iad1)`, () => {
      const cfg = JSON.parse(readFileSync(new URL(`../../../apps/${app}/vercel.json`, import.meta.url), "utf8")) as { regions?: string[] };
      expect(cfg.regions).toEqual([...HOSTING_REGIONS]);
    });
  }
  it("distingue regiones UE", () => {
    expect(isVercelEuRegion("cdg1")).toBe(true);
    expect(isVercelEuRegion("iad1")).toBe(false);
  });
});

describe("ruta del modelo", () => {
  it("Bull Haus es un proyecto chileno", () => expect(PROJECT_JURISDICTION).toBe("cl"));

  it("en Chile se permite la API directa de Anthropic u OpenAI en producción", () => {
    expect(resolveModelRoute({ ...prod, LLM_PROVIDER: "anthropic" }, "cl")).toEqual({ provider: "anthropic", region: "us", eu: false });
    expect(resolveModelRoute({ ...prod, LLM_PROVIDER: "openai" }, "cl").provider).toBe("openai");
  });

  it("con residencia UE rechaza la API directa en producción y en vistas previas", () => {
    expect(() => resolveModelRoute({ ...prod, LLM_PROVIDER: "anthropic" }, "eu")).toThrow(DataResidencyError);
    expect(() => resolveModelRoute({ VERCEL_ENV: "preview", LLM_PROVIDER: "openai" }, "eu")).toThrow(DataResidencyError);
    expect(() => resolveModelRoute({ NODE_ENV: "production", LLM_PROVIDER: "anthropic", LLM_REGION: "global" }, "eu")).toThrow(DataResidencyError);
  });

  it("con residencia UE acepta Vertex y Bedrock en regiones europeas", () => {
    expect(resolveModelRoute({ ...prod, LLM_PROVIDER: "vertex", LLM_REGION: "europe-west1" }, "eu").eu).toBe(true);
    expect(resolveModelRoute({ ...prod, LLM_PROVIDER: "vertex", LLM_REGION: "eu" }, "eu").eu).toBe(true);
    expect(resolveModelRoute({ ...prod, LLM_PROVIDER: "bedrock", LLM_REGION: "eu-west-3" }, "eu").eu).toBe(true);
    expect(() => resolveModelRoute({ ...prod, LLM_PROVIDER: "vertex", LLM_REGION: "us-east5" }, "eu")).toThrow(DataResidencyError);
  });

  it("en local se puede probar cualquier proveedor aunque el proyecto sea UE", () => {
    expect(resolveModelRoute({ NODE_ENV: "development", LLM_PROVIDER: "openai" }, "eu").eu).toBe(false);
  });

  it("sin proveedor, o con Vertex sin región, no hay ruta", () => {
    expect(() => resolveModelRoute(prod)).toThrow(DataResidencyError);
    expect(() => resolveModelRoute({ ...prod, LLM_PROVIDER: "vertex" })).toThrow(/LLM_REGION/);
  });
});

describe("subencargados", () => {
  it("cada integración que maneja datos personales está en la lista", () => {
    const listed = new Set(SUBPROCESSORS.map((s) => s.integration).filter(Boolean));
    for (const key of ["anthropic", "whatsapp", "calendar", "voice", "kyc", "esign"]) expect(listed.has(key), key).toBe(true);
    for (const s of SUBPROCESSORS) if (s.integration) expect(INTEGRATIONS.some((i) => i.key === s.integration), s.name).toBe(true);
  });
});
