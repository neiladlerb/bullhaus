// Diseño del brochure: plantilla, fotos y secciones que elige el corredor. Los textos y datos siguen saliendo de la
// ficha aprobada; el diseño solo decide cómo se ven. Cambiar el diseño de un brochure aprobado lo devuelve a revisión.
import { z } from "zod";

export const BROCHURE_TEMPLATES = ["portada", "editorial", "minimo"] as const;
export type BrochureTemplate = (typeof BROCHURE_TEMPLATES)[number];

export const BROCHURE_TEMPLATE_LABELS: Record<BrochureTemplate, { name: string; hint: string }> = {
  portada: { name: "Portada con foto", hint: "La foto principal a pantalla completa con el título encima." },
  editorial: { name: "Editorial", hint: "Foto arriba y título en blanco debajo, con detalles en magenta." },
  minimo: { name: "Mínimo", hint: "Fondo blanco, logo y título; las fotos en grilla." },
};

/**
 * Etiquetas permitidas. Son una lista cerrada para no prometer cosas que la ficha no respalda: "Nuevo valor" no está
 * porque exige el precio anterior en el historial (docs/sistema-ia.md, paso 4).
 */
export const BROCHURE_BADGES = ["", "Nuevo en cartera", "Disponible ya", "Visítala esta semana"] as const;
export type BrochureBadge = (typeof BROCHURE_BADGES)[number];

export const BROCHURE_SECTIONS = ["gallery", "description", "features", "process", "zones", "showcase"] as const;
export type BrochureSection = (typeof BROCHURE_SECTIONS)[number];

export const BROCHURE_SECTION_LABELS: Record<BrochureSection, string> = {
  gallery: "Galería de fotos",
  description: "Descripción",
  features: "Características",
  process: "Cómo trabajamos",
  zones: "Dónde estamos",
  showcase: "Parte de la cartera",
};

/** Secciones que tiene cada tipo de brochure. El contacto y el formulario van siempre. */
export const SECTIONS_BY_KIND: Record<"venta" | "arriendo" | "captacion", BrochureSection[]> = {
  venta: ["gallery", "description", "features"],
  arriendo: ["gallery", "description", "features"],
  captacion: ["process", "zones", "showcase"],
};

/** Máximo de fotos en el brochure (la primera es la portada). */
export const BROCHURE_MAX_PHOTOS = 12;

export const brochureDesignSchema = z.object({
  template: z.enum(BROCHURE_TEMPLATES).default("portada"),
  badge: z.enum(BROCHURE_BADGES).default(""),
  /** Ids de PropertyMedia en el orden elegido. Vacío: las de la ficha en su orden. */
  photoIds: z.array(z.string().min(1).max(40)).max(BROCHURE_MAX_PHOTOS).default([]),
  /** Secciones ocultas. Lo que no está aquí se muestra. */
  hidden: z.array(z.enum(BROCHURE_SECTIONS)).default([]),
});

export type BrochureDesign = z.infer<typeof brochureDesignSchema>;

export const DEFAULT_BROCHURE_DESIGN: BrochureDesign = { template: "portada", badge: "", photoIds: [], hidden: [] };

/** Lee el diseño guardado (o el de la vista previa). Si no es válido, el diseño por defecto. */
export function parseBrochureDesign(raw: unknown): BrochureDesign {
  let value = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return DEFAULT_BROCHURE_DESIGN;
    }
  }
  const parsed = brochureDesignSchema.safeParse(value ?? {});
  if (!parsed.success) return DEFAULT_BROCHURE_DESIGN;
  return { ...parsed.data, photoIds: [...new Set(parsed.data.photoIds)], hidden: [...new Set(parsed.data.hidden)] };
}

/** Fotos a mostrar: las elegidas, en su orden, que todavía existan en la ficha; si no hay, las de la ficha. */
export function orderedPhotos<T extends { id: string }>(media: T[], design: BrochureDesign): T[] {
  if (!design.photoIds.length) return media.slice(0, BROCHURE_MAX_PHOTOS);
  const byId = new Map(media.map((m) => [m.id, m]));
  const picked = design.photoIds.map((id) => byId.get(id)).filter((m): m is T => Boolean(m));
  return picked.length ? picked : media.slice(0, BROCHURE_MAX_PHOTOS);
}

export const showsSection = (design: BrochureDesign, s: BrochureSection) => !design.hidden.includes(s);

/** ¿Cambió algo que se vea? Sirve para saber si un brochure aprobado debe volver a revisión. */
export function designChanged(a: BrochureDesign, b: BrochureDesign): boolean {
  const norm = (d: BrochureDesign) => JSON.stringify({ ...d, hidden: [...d.hidden].sort() });
  return norm(a) !== norm(b);
}
