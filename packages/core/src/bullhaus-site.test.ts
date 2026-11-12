import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { backofficeCode, decodeEntities, parseSiteListing, SiteListingError } from "./bullhaus-site";

const fixture = (code: string) => readFileSync(join(__dirname, "__fixtures__", "bullhaus", `${code}.html`), "utf8");

describe("parseSiteListing", () => {
  it("lee un departamento en venta con todos sus datos", () => {
    const l = parseSiteListing(fixture("109958"));
    expect(l.code).toBe("109958");
    expect(l.offers).toEqual([{ operation: "venta", price: 5490, currency: "UF" }]);
    expect(l.type).toBe("departamento");
    expect(l.comuna).toBe("Ñuñoa");
    expect(l.bedrooms).toBe(2);
    expect(l.bathrooms).toBe(2);
    expect(l.m2Useful).toBe(77);
    expect(l.m2Land).toBeUndefined();
    expect(l.status).toBe("disponible");
    expect(l.brokerEmail).toBe("sandra@bullhaus.cl");
    expect(l.photos.length).toBeGreaterThan(10);
    expect(l.photos[0]).toMatch(/^https:\/\/demoazimg\.prop360\.cl\/sys\/img\/propiedades\/109958_/);
    expect(l.details["Orientación"]).toBe("Sur-Oriente");
    expect(l.details).not.toHaveProperty("N° Ascensores");
    expect(l.description).toBeTruthy();
    expect(l.description).not.toMatch(/<|Descripción/);
  });

  it("lee una casa con superficie construida y de terreno", () => {
    const l = parseSiteListing(fixture("109974"));
    expect(l.type).toBe("casa");
    expect(l.comuna).toBe("Lo Barnechea");
    expect(l.offers[0]).toEqual({ operation: "venta", price: 19990, currency: "UF" });
    expect(l.m2Useful).toBe(204);
    expect(l.m2Land).toBe(825);
    expect(l.features).toContain("Piscina");
    expect(l.headline).toBe("Condiminio Lomas de la Cruz");
    expect(l.brokerEmail).toBe("alejandro@bullhaus.cl");
  });

  it("lee una propiedad en venta y arriendo con los dos precios", () => {
    const l = parseSiteListing(fixture("109944"));
    expect(l.type).toBe("oficina");
    expect(l.offers).toEqual([
      { operation: "venta", price: 2100, currency: "UF" },
      { operation: "arriendo", price: 7.6, currency: "UF" },
    ]);
    expect(backofficeCode(l, l.offers[0]!)).toBe("109944");
    expect(backofficeCode(l, l.offers[1]!)).toBe("109944-A");
  });

  it("lee un arriendo en pesos", () => {
    const l = parseSiteListing(fixture("109960"));
    expect(l.offers).toEqual([{ operation: "arriendo", price: 1_450_000, currency: "CLP" }]);
    expect(backofficeCode(l, l.offers[0]!)).toBe("109960");
  });

  it("marca como arrendada una ficha con la cinta Arrendada", () => {
    expect(parseSiteListing(fixture("109945")).status).toBe("arrendada");
  });

  it("no inventa datos: la ficha sin dormitorios los deja vacíos", () => {
    const l = parseSiteListing(fixture("109944"));
    expect(l.bedrooms).toBeUndefined();
  });

  it("no importa un precio en dólares ni lo convierte", () => {
    expect(() => parseSiteListing(fixture("109796"))).toThrow(/US\$/);
  });

  it("no calcula un total a partir de un precio por m²", () => {
    const html = fixture("109960").replace("$ 1.450.000<span", "UF 0,80/m2<span");
    expect(() => parseSiteListing(html)).toThrow(/por m²/);
  });

  it("cambia los espacios especiales por espacios normales", () => {
    const html = fixture("109958").replace("Excelente", "Excelente ");
    expect(parseSiteListing(html).headline).not.toMatch(/ /);
  });

  it("rechaza una página que no es una ficha", () => {
    expect(() => parseSiteListing("<html><body>Inicio</body></html>")).toThrow(SiteListingError);
  });
});

describe("decodeEntities", () => {
  it("decodifica entidades con nombre y numéricas", () => {
    expect(decodeEntities("&Ntilde;u&ntilde;oa &#233; &#xE1; &amp;")).toBe("Ñuñoa é á &");
  });
});
