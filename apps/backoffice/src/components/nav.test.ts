import { describe, expect, it } from "vitest";
import { activeHref } from "./nav";

const hrefs = ["/", "/propiedades", "/propiedades/importar", "/propiedades/precios", "/leads", "/agentes"];

describe("menú del back office: página activa", () => {
  it("marca Inicio solo en la raíz", () => {
    expect(activeHref("/", hrefs)).toBe("/");
    expect(activeHref("/leads", hrefs)).toBe("/leads");
  });

  it("marca la sección también en sus subpáginas", () => {
    expect(activeHref("/propiedades/123", hrefs)).toBe("/propiedades");
    expect(activeHref("/agentes/ajustes", hrefs)).toBe("/agentes");
  });

  it("gana el enlace más específico", () => {
    expect(activeHref("/propiedades/importar", hrefs)).toBe("/propiedades/importar");
    expect(activeHref("/propiedades/precios", hrefs)).toBe("/propiedades/precios");
  });

  it("no confunde prefijos parecidos", () => {
    expect(activeHref("/leadsx", hrefs)).toBeNull();
  });
});
