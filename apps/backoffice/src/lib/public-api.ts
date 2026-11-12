import "server-only";
import { prisma, type Prisma } from "@bullhaus/db";

// Lo que la web pública puede ver de una propiedad. Nunca addressPrivate, mandatos ni dueños.
// Solo fichas disponibles y marcadas para publicar en la web.

const TENANT_SLUG = process.env.PUBLIC_TENANT_SLUG ?? "bullhaus";

export const publicWhere = (tenantId: string): Prisma.PropertyWhereInput => ({ tenantId, status: "disponible", publishWeb: true });

export async function publicTenantId(): Promise<string | null> {
  const t = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG }, select: { id: true } });
  return t?.id ?? null;
}

export const publicSelect = {
  code: true,
  operation: true,
  type: true,
  comuna: true,
  sector: true,
  headline: true,
  price: true,
  currency: true,
  commonExpensesClp: true,
  m2Useful: true,
  m2Land: true,
  bedrooms: true,
  bathrooms: true,
  parking: true,
  storage: true,
  pets: true,
  furnished: true,
  features: true,
  details: true,
  description: true,
  updatedAt: true,
  broker: { select: { name: true, email: true, phone: true } },
  media: { orderBy: [{ isCover: "desc" }, { order: "asc" }], select: { sizes: true, label: true } },
} satisfies Prisma.PropertySelect;

type Row = Prisma.PropertyGetPayload<{ select: typeof publicSelect }>;

export function toPublic(p: Row, opts: { allPhotos: boolean }) {
  const photos = (opts.allPhotos ? p.media : p.media.slice(0, 1)).map((m) => ({ ...(m.sizes as Record<string, string>), label: m.label }));
  return {
    ...p,
    price: Number(p.price),
    m2Useful: p.m2Useful ? Number(p.m2Useful) : null,
    m2Land: p.m2Land ? Number(p.m2Land) : null,
    description: opts.allPhotos ? p.description : null,
    details: opts.allPhotos ? p.details : null,
    media: undefined,
    photos,
    photoCount: p.media.length,
  };
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", ...(init?.headers ?? {}) },
  });
}
