import { describe, expect, it } from "vitest";
import { DEFAULT_BROCHURE_DESIGN, designChanged, orderedPhotos, parseBrochureDesign, showsSection } from "./brochure-design";

describe("diseño del brochure", () => {
  it("sin diseño guardado o con uno inválido, usa el de por defecto", () => {
    expect(parseBrochureDesign(null)).toEqual(DEFAULT_BROCHURE_DESIGN);
    expect(parseBrochureDesign("{no es json")).toEqual(DEFAULT_BROCHURE_DESIGN);
    expect(parseBrochureDesign({ template: "otra" })).toEqual(DEFAULT_BROCHURE_DESIGN);
  });

  it("no acepta etiquetas fuera de la lista (no se promete lo que la ficha no respalda)", () => {
    expect(parseBrochureDesign({ badge: "Nuevo valor" })).toEqual(DEFAULT_BROCHURE_DESIGN);
    expect(parseBrochureDesign({ badge: "Disponible ya" }).badge).toBe("Disponible ya");
  });

  it("lee el diseño desde texto (vista previa) y quita repetidos", () => {
    const d = parseBrochureDesign(JSON.stringify({ template: "minimo", photoIds: ["b", "a", "b"], hidden: ["gallery", "gallery"] }));
    expect(d).toEqual({ template: "minimo", badge: "", photoIds: ["b", "a"], hidden: ["gallery"] });
    expect(showsSection(d, "gallery")).toBe(false);
    expect(showsSection(d, "features")).toBe(true);
  });

  it("ordena las fotos como las eligió el corredor y descarta las que ya no están en la ficha", () => {
    const media = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(orderedPhotos(media, { ...DEFAULT_BROCHURE_DESIGN, photoIds: ["c", "x", "a"] }).map((m) => m.id)).toEqual(["c", "a"]);
    expect(orderedPhotos(media, DEFAULT_BROCHURE_DESIGN).map((m) => m.id)).toEqual(["a", "b", "c"]);
    expect(orderedPhotos(media, { ...DEFAULT_BROCHURE_DESIGN, photoIds: ["x"] }).map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("detecta cambios visibles sin importar el orden de las secciones ocultas", () => {
    const a = { ...DEFAULT_BROCHURE_DESIGN, hidden: ["gallery", "features"] as const };
    expect(designChanged({ ...a, hidden: [...a.hidden] }, { ...a, hidden: ["features", "gallery"] })).toBe(false);
    expect(designChanged(DEFAULT_BROCHURE_DESIGN, { ...DEFAULT_BROCHURE_DESIGN, template: "editorial" })).toBe(true);
  });
});
