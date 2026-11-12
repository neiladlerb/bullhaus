import "server-only";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { listingFacts, type BrochureKind } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";

// El brochure se arma cada vez desde la ficha aprobada (venta y arriendo) o desde los datos de
// Bull Haus (captación). Nunca muestra address_private, y solo propiedades disponibles.

export const newBrochureToken = () => randomBytes(12).toString("base64url");

/** URL pública absoluta del brochure. `s` identifica el envío para medir aperturas por canal. */
export async function brochureUrl(token: string, shareId?: string): Promise<string> {
  const base = process.env.BROCHURE_BASE_URL ?? (await originFromRequest());
  return `${base.replace(/\/+$/, "")}/b/${token}${shareId ? `?s=${shareId}` : ""}`;
}

async function originFromRequest(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3100";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const brochurePropertySelect = {
  id: true, code: true, operation: true, type: true, comuna: true, sector: true, headline: true, description: true, price: true, currency: true,
  commonExpensesClp: true, m2Useful: true, m2Land: true, bedrooms: true, bathrooms: true, parking: true, storage: true, features: true, status: true,
  broker: { select: { name: true, email: true, phone: true } },
  media: { orderBy: { order: "asc" as const }, take: 8, select: { sizes: true, isCover: true } },
} as const;

export type BrochureProperty = Prisma.PropertyGetPayload<{ select: typeof brochurePropertySelect }>;

export function brochureFacts(p: BrochureProperty): string[] {
  return listingFacts({ ...p, price: Number(p.price), m2Useful: p.m2Useful ? Number(p.m2Useful) : null, m2Land: p.m2Land ? Number(p.m2Land) : null });
}

/** Propiedades de muestra para el brochure de captación: disponibles, con fotos, de la cartera real. */
export async function captacionShowcase(tenantId: string) {
  return prisma.property.findMany({
    where: { tenantId, status: "disponible", media: { some: {} } },
    orderBy: { price: "desc" },
    take: 6,
    select: { id: true, code: true, type: true, operation: true, comuna: true, headline: true, media: { where: { isCover: true }, take: 1, select: { sizes: true } } },
  });
}

export const canShare = (status: string, propertyStatus: string | null | undefined, kind: BrochureKind) => status === "aprobado" && (kind === "captacion" || propertyStatus === "disponible");
