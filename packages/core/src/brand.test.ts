import { describe, expect, it } from "vitest";
import { BrandSchema, brandError, brandFromForm, brandToForm, inZone, whatsappUrl, type Brand } from "./brand";

const brand: Brand = {
  name: "Corredora Prueba",
  shortName: "Prueba",
  legalName: "Corredora Prueba SpA",
  siteUrl: "https://www.prueba.cl",
  description: "Venta y arriendo en Ñuñoa.",
  logo: { lines: ["PRUEBA"] },
  colors: { brand: "#123456", brandDark: "#012345", ink: "#111111", coal: "#222222" },
  contact: { whatsapp: "+56 9 1234 5678", email: "hola@prueba.cl", office: "Irarrázaval 1, Ñuñoa" },
  social: {},
  texts: {
    heroEyebrow: "Venta y arriendo",
    heroTitle: "Tu corredora en Ñuñoa",
    heroSubtitle: "Departamentos en venta y arriendo.",
    heroImage: "/hero.webp",
    ownerPitch: "Visitamos tu propiedad.",
    ownerAreas: "Trabajamos en Ñuñoa.",
    aboutTitle: "Quiénes somos",
    aboutParagraphs: ["Somos una corredora."],
  },
  zones: [
    { key: "costa", name: "Costa", detail: "Zapallar", comunas: ["Zapallar", "Papudo"] },
    { key: "santiago", name: "Santiago", detail: "Oriente", comunas: [] },
  ],
  team: [],
};

describe("ficha de marca", () => {
  it("acepta una ficha completa", () => {
    expect(BrandSchema.safeParse(brand).success).toBe(true);
  });

  it("rechaza enlaces peligrosos y colores mal escritos", () => {
    expect(BrandSchema.safeParse({ ...brand, texts: { ...brand.texts, heroImage: "javascript:alert(1)" } }).success).toBe(false);
    expect(BrandSchema.safeParse({ ...brand, siteUrl: "http://prueba.cl" }).success).toBe(false);
    expect(BrandSchema.safeParse({ ...brand, colors: { ...brand.colors, brand: "rojo" } }).success).toBe(false);
    expect(BrandSchema.safeParse({ ...brand, contact: { ...brand.contact, whatsapp: "912345678" } }).success).toBe(false);
  });

  it("arma el enlace de WhatsApp", () => {
    expect(whatsappUrl("+56 9 9200 0211")).toBe("https://wa.me/56992000211");
    expect(whatsappUrl("+56 9 9200 0211", "Hola, código 109.958")).toBe("https://wa.me/56992000211?text=Hola%2C%20c%C3%B3digo%20109.958");
  });

  it("una zona sin comunas toma las que no están en otra", () => {
    expect(inZone(brand.zones, "costa", "Papudo")).toBe(true);
    expect(inZone(brand.zones, "costa", "Las Condes")).toBe(false);
    expect(inZone(brand.zones, "santiago", "Las Condes")).toBe(true);
    expect(inZone(brand.zones, "santiago", "Papudo")).toBe(false);
    expect(inZone(brand.zones, "no-existe", "Papudo")).toBe(true);
  });
});

describe("formulario de la ficha", () => {
  it("ida y vuelta sin perder datos", () => {
    const full: Brand = {
      ...brand,
      logo: { lines: ["BULL", "HAUS"], subtitle: "PROPIEDADES", iconUrl: "/logo.png" },
      social: { instagram: { handle: "@prueba", url: "https://www.instagram.com/prueba/" } },
      team: [{ name: "Ana Pérez", role: "Corredora", email: "ana@prueba.cl", photo: "/equipo/ana.jpg" }, { name: "Luis Soto", role: "Socio", email: "luis@prueba.cl" }],
    };
    const back = BrandSchema.parse(brandFromForm(brandToForm(full)));
    expect(back).toEqual(full);
  });

  it("explica el primer error con el campo", () => {
    const r = BrandSchema.safeParse(brandFromForm({ ...brandToForm(brand), email: "no-es-email" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(brandError(r.error.issues)).toMatch(/^contact › email: /);
  });
});
