// Ficha de marca de cada corredora (docs/plataforma-saas.md, paso 1). Todo lo que la web pública
// y el back office muestran de la corredora sale de aquí, nunca de constantes en el código: así la
// misma plataforma sirve a Bull Haus y a la siguiente corredora sin tocar código.
import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB");
// Rutas propias ("/equipo/ana.jpg") o URLs https. Nada de javascript: ni data:.
const asset = z.string().trim().max(500).regex(/^(\/[^/]|https:\/\/)/, "Ruta que empiece con / o URL https");
const url = z.string().trim().url().max(500).regex(/^https:\/\//, "URL https");
const text = (max: number) => z.string().trim().min(1).max(max);

export const BrandZoneSchema = z.object({
  /** Va en la URL del filtro: /propiedades?zona=<key>. */
  key: z.string().regex(/^[a-z0-9-]{2,30}$/),
  name: text(60),
  detail: text(160),
  /** Comunas de la zona. Vacía = todas las comunas que no están en otra zona. */
  comunas: z.array(text(60)).max(40),
  image: asset.optional(),
});

export const BrandTeamMemberSchema = z.object({
  name: text(80),
  role: text(80),
  email: z.string().trim().email().max(160),
  photo: asset.optional(),
});

const SocialSchema = z.object({ url, handle: text(60) });

export const BrandSchema = z.object({
  /** Nombre comercial completo: "Bull Haus Propiedades". */
  name: text(80),
  /** Nombre corto para frases: "un corredor de Bull Haus". */
  shortName: text(40),
  /** Razón social para el pie de página y los textos legales. */
  legalName: text(120),
  siteUrl: url,
  /** Descripción para Google y el pie de página. */
  description: text(300),
  logo: z.object({
    /** Logo en imagen. Si no hay, se dibuja un logotipo con las líneas de texto. */
    imageUrl: asset.optional(),
    /** Ícono de la pestaña del navegador. */
    iconUrl: asset.optional(),
    lines: z.array(text(12)).min(1).max(3),
    subtitle: z.string().trim().max(20).optional(),
  }),
  colors: z.object({ brand: hex, brandDark: hex, ink: hex, coal: hex }),
  contact: z.object({
    /** Celular de WhatsApp con código de país: "+56 9 9200 0211". */
    whatsapp: z.string().trim().regex(/^\+[\d\s]{8,20}$/, "Celular con código de país, por ejemplo +56 9 1234 5678"),
    email: z.string().trim().email().max(160),
    office: text(160),
    mapsUrl: url.optional(),
  }),
  social: z.object({ instagram: SocialSchema.optional(), facebook: SocialSchema.optional(), linkedin: SocialSchema.optional() }),
  texts: z.object({
    heroEyebrow: text(80),
    heroTitle: text(120),
    /** Palabra del título que va en negrita. */
    heroHighlight: z.string().trim().max(40).optional(),
    heroSubtitle: text(240),
    heroImage: asset,
    /** Párrafo para propietarios en la portada. */
    ownerPitch: text(400),
    /** Zonas en palabras, para la página de propietarios. */
    ownerAreas: text(300),
    aboutTitle: text(80),
    aboutParagraphs: z.array(text(800)).min(1).max(4),
  }),
  zones: z.array(BrandZoneSchema).max(6),
  team: z.array(BrandTeamMemberSchema).max(30),
});

export type Brand = z.infer<typeof BrandSchema>;
export type BrandZone = z.infer<typeof BrandZoneSchema>;

/** "+56 9 9200 0211" → "https://wa.me/56992000211". */
export function whatsappUrl(phone: string, message?: string): string {
  const base = `https://wa.me/${phone.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** ¿La comuna pertenece a la zona? Una zona sin comunas toma todas las que no están en otra. */
export function inZone(zones: BrandZone[], key: string, comuna: string): boolean {
  const zone = zones.find((z) => z.key === key);
  if (!zone) return true;
  if (zone.comunas.length) return zone.comunas.includes(comuna);
  return !zones.some((z) => z.key !== key && z.comunas.includes(comuna));
}

/** Variables CSS de la marca, para el estilo del <html>. */
export function brandCssVars(b: Brand): Record<string, string> {
  return { "--color-brand": b.colors.brand, "--color-brand-dark": b.colors.brandDark, "--color-ink": b.colors.ink, "--color-coal": b.colors.coal };
}

// Edición en el back office: las listas (zonas, equipo, párrafos) se escriben como texto, una por
// línea y con los campos separados por "|". Estas dos funciones pasan de la ficha al formulario y
// de vuelta; el resultado se valida siempre con BrandSchema antes de guardar.

const cells = (line: string) => line.split("|").map((c) => c.trim());
const lines = (v: string | undefined) => (v ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const opt = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export function brandToForm(b: Brand): Record<string, string> {
  return {
    name: b.name,
    shortName: b.shortName,
    legalName: b.legalName,
    siteUrl: b.siteUrl,
    description: b.description,
    logoImageUrl: b.logo.imageUrl ?? "",
    logoIconUrl: b.logo.iconUrl ?? "",
    logoLines: b.logo.lines.join(", "),
    logoSubtitle: b.logo.subtitle ?? "",
    colorBrand: b.colors.brand,
    colorBrandDark: b.colors.brandDark,
    colorInk: b.colors.ink,
    colorCoal: b.colors.coal,
    whatsapp: b.contact.whatsapp,
    email: b.contact.email,
    office: b.contact.office,
    mapsUrl: b.contact.mapsUrl ?? "",
    instagram: b.social.instagram ? `${b.social.instagram.handle} | ${b.social.instagram.url}` : "",
    facebook: b.social.facebook ? `${b.social.facebook.handle} | ${b.social.facebook.url}` : "",
    linkedin: b.social.linkedin ? `${b.social.linkedin.handle} | ${b.social.linkedin.url}` : "",
    heroEyebrow: b.texts.heroEyebrow,
    heroTitle: b.texts.heroTitle,
    heroHighlight: b.texts.heroHighlight ?? "",
    heroSubtitle: b.texts.heroSubtitle,
    heroImage: b.texts.heroImage,
    ownerPitch: b.texts.ownerPitch,
    ownerAreas: b.texts.ownerAreas,
    aboutTitle: b.texts.aboutTitle,
    aboutParagraphs: b.texts.aboutParagraphs.join("\n"),
    zones: b.zones.map((z) => [z.key, z.name, z.detail, z.comunas.join(", "), z.image ?? ""].join(" | ")).join("\n"),
    team: b.team.map((t) => [t.name, t.role, t.email, t.photo ?? ""].join(" | ")).join("\n"),
  };
}

function social(v: string | undefined) {
  if (!opt(v)) return undefined;
  const [handle = "", url = ""] = cells(v!);
  return { handle, url };
}

/** Arma la ficha desde el formulario. No valida: el resultado pasa por BrandSchema.safeParse. */
export function brandFromForm(f: Record<string, string | undefined>): unknown {
  return {
    name: f.name,
    shortName: f.shortName,
    legalName: f.legalName,
    siteUrl: f.siteUrl,
    description: f.description,
    logo: {
      imageUrl: opt(f.logoImageUrl),
      iconUrl: opt(f.logoIconUrl),
      lines: (f.logoLines ?? "").split(",").map((l) => l.trim()).filter(Boolean),
      subtitle: opt(f.logoSubtitle),
    },
    colors: { brand: f.colorBrand, brandDark: f.colorBrandDark, ink: f.colorInk, coal: f.colorCoal },
    contact: { whatsapp: f.whatsapp, email: f.email, office: f.office, mapsUrl: opt(f.mapsUrl) },
    social: { instagram: social(f.instagram), facebook: social(f.facebook), linkedin: social(f.linkedin) },
    texts: {
      heroEyebrow: f.heroEyebrow,
      heroTitle: f.heroTitle,
      heroHighlight: opt(f.heroHighlight),
      heroSubtitle: f.heroSubtitle,
      heroImage: f.heroImage,
      ownerPitch: f.ownerPitch,
      ownerAreas: f.ownerAreas,
      aboutTitle: f.aboutTitle,
      aboutParagraphs: lines(f.aboutParagraphs),
    },
    zones: lines(f.zones).map((l) => {
      const [key = "", name = "", detail = "", comunas = "", image = ""] = cells(l);
      return { key, name, detail, comunas: comunas.split(",").map((c) => c.trim()).filter(Boolean), image: opt(image) };
    }),
    team: lines(f.team).map((l) => {
      const [name = "", role = "", email = "", photo = ""] = cells(l);
      return { name, role, email, photo: opt(photo) };
    }),
  };
}

/** Primer error de la ficha en palabras, con el campo donde está. */
export function brandError(issues: readonly { path: readonly (string | number)[]; message: string }[]): string {
  const i = issues[0];
  return i ? `${i.path.join(" › ") || "Ficha"}: ${i.message}` : "Revisa los datos";
}
