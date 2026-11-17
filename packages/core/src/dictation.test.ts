import { describe, expect, it } from "vitest";
import { extractByRules, mergeExtractions, numbersNotInFicha, parseModelExtraction, sourceInTranscript, templateDescription, type FichaForText } from "./dictation";

const dictado = `Casa en Los Dominicos, muy luminosa. Tiene 4 dormitorios y tres baños, el principal en suite con walk-in.
Son unos 220 metros construidos y 800 metros de terreno. Piscina y quincho en el jardín, no tiene calefacción central.
Dos estacionamientos techados y con bodega. Orientación norte, construida en 2008.`;

const get = (key: string, text = dictado) => extractByRules(text).find((f) => f.key === key);

describe("dictado: reglas sin modelo", () => {
  it("saca números en cifra y en palabra, con la frase de origen", () => {
    expect(get("bedrooms")?.value).toBe(4);
    expect(get("bathrooms")?.value).toBe(3);
    expect(get("parking")?.value).toBe(2);
    expect(get("storage")?.value).toBe(1);
    expect(get("bedrooms")?.source).toContain("4 dormitorios");
  });

  it("separa superficie construida y terreno", () => {
    expect(get("m2Useful")?.value).toBe(220);
    expect(get("m2Land")?.value).toBe(800);
  });

  it("agrega características y respeta la negación", () => {
    const f = get("features")?.value as string[];
    expect(f).toEqual(expect.arrayContaining(["Piscina", "Quincho", "Jardín", "Walk-in closet"]));
    expect(f).not.toContain("Calefacción central");
  });

  it("orientación y año van a los detalles", () => {
    expect(get("orientation")?.value).toBe("Norte");
    expect(get("yearBuilt")?.value).toBe("2008");
  });

  it("entiende lenguaje de terreno: piezas, bañitos, est, gc en lucas", () => {
    const t = "depa de 2 piezas y 2 bañitos, 1 est. gc de 180 lucas. acepta mascotas, sin amoblar. piso 12";
    const r = Object.fromEntries(extractByRules(t).map((f) => [f.key, f.value]));
    expect(r).toMatchObject({ bedrooms: 2, bathrooms: 2, parking: 1, commonExpensesClp: 180000, pets: "si", furnished: false, floor: "12" });
  });

  it("lo que no se dijo queda vacío", () => {
    const r = extractByRules("Casa bonita y bien cuidada, cerca del metro.");
    expect(r).toEqual([]);
  });
});

describe("dictado: lo que propone el modelo", () => {
  it("descarta datos cuya frase no está en el dictado (inventados)", () => {
    const raw = JSON.stringify({
      campos: [
        { campo: "bedrooms", valor: 4, frase: "Tiene 4 dormitorios y tres baños" },
        { campo: "m2Useful", valor: 300, frase: "son 300 metros útiles" },
        { campo: "features", valor: ["Piscina"], frase: "Piscina y quincho en el jardín" },
      ],
    });
    const { fields, dropped } = parseModelExtraction(`Aquí va: ${raw}`, dictado);
    expect(fields.map((f) => f.key)).toEqual(["bedrooms", "features"]);
    expect(dropped).toBe(1);
  });

  it("ignora campos desconocidos y respuestas que no son JSON", () => {
    expect(parseModelExtraction("no entendí", dictado).fields).toEqual([]);
    expect(parseModelExtraction(JSON.stringify({ campos: [{ campo: "precio", valor: 1, frase: "Casa" }] }), dictado).fields).toEqual([]);
  });

  it("la frase se compara sin mayúsculas, tildes ni espacios dobles", () => {
    expect(sourceInTranscript("ORIENTACION  norte", dictado)).toBe(true);
    expect(sourceInTranscript("a", dictado)).toBe(false);
  });

  it("el modelo manda y las reglas completan", () => {
    const merged = mergeExtractions([{ key: "bedrooms", value: 5, source: "x" }], extractByRules(dictado));
    expect(merged.find((f) => f.key === "bedrooms")?.value).toBe(5);
    expect(merged.some((f) => f.key === "m2Land")).toBe(true);
  });
});

describe("descripción desde la ficha", () => {
  const ficha: FichaForText = {
    type: "casa",
    operation: "venta",
    comuna: "Las Condes",
    sector: "Los Dominicos",
    m2Useful: 220,
    m2Land: 800,
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    storage: 1,
    furnished: null,
    pets: null,
    features: ["Piscina", "Quincho"],
    details: { Orientación: "Norte" },
  };

  it("la plantilla usa solo datos de la ficha", () => {
    const t = templateDescription(ficha, "Casa");
    expect(t).toContain("Casa en venta en Las Condes, sector Los Dominicos.");
    expect(t).toContain("220 m² útiles, 800 m² de terreno, 4 dormitorios, 3 baños, 2 estacionamientos y 1 bodega");
    expect(numbersNotInFicha(t, ficha)).toEqual([]);
  });

  it("detecta cifras que no están en la ficha", () => {
    expect(numbersNotInFicha("Casa de 250 m² con 4 dormitorios a 5 minutos del metro", ficha)).toEqual(["250", "5"]);
  });
});
