import "server-only";
import { seesOnlyOwnProperties, type ComparableInput, type ValuationSubject } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import type { CurrentUser } from "./auth";

export interface Candidate extends ComparableInput {
  propertyId: string | null;
  dealId: string | null;
  label: string;
  observedAt: Date | null;
}

/** El corredor ve sus tasaciones; administración ve todas las del tenant. */
export function valuationScope(user: CurrentUser): Prisma.ValuationWhereInput {
  return seesOnlyOwnProperties(user.role) ? { tenantId: user.tenantId, authorId: user.id } : { tenantId: user.tenantId };
}

const num = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));
/** Los cierres de más de tres años ya no dicen mucho del precio de hoy. */
const CLOSINGS_SINCE_DAYS = 3 * 365;

/**
 * Candidatos de la propia data de Bull Haus: operaciones cerradas (precio real) y cartera disponible o reservada
 * (precio publicado). Sin datos de demostración. La comuna se filtra después, sin tildes ni mayúsculas.
 */
export async function loadCandidates(tenantId: string, subject: ValuationSubject, excludePropertyId?: string | null): Promise<Candidate[]> {
  const since = new Date(Date.now() - CLOSINGS_SINCE_DAYS * 86_400_000);
  const propertySelect = { id: true, code: true, type: true, comuna: true, sector: true, m2Useful: true, m2Land: true, bedrooms: true, bathrooms: true } as const;
  const [deals, listings] = await Promise.all([
    prisma.deal.findMany({
      where: {
        tenantId,
        isDemo: false,
        operation: subject.operation,
        currency: subject.currency,
        stage: { in: ["escritura", "cerrada"] },
        OR: [{ closedAt: { gte: since } }, { closedAt: null, stageChangedAt: { gte: since } }],
        property: { type: subject.type, isDemo: false },
      },
      select: { id: true, number: true, price: true, closedAt: true, stageChangedAt: true, property: { select: propertySelect } },
    }),
    prisma.property.findMany({
      where: { tenantId, isDemo: false, operation: subject.operation, type: subject.type, currency: subject.currency, status: { in: ["disponible", "reservada"] } },
      select: { ...propertySelect, price: true, listedAt: true, updatedAt: true },
    }),
  ]);

  const closed = new Set<string>();
  const out: Candidate[] = [];
  for (const d of deals) {
    if (d.property.id === excludePropertyId) continue;
    closed.add(d.property.id);
    out.push({
      source: "cierre",
      propertyId: d.property.id,
      dealId: d.id,
      label: `Operación ${d.number} (${d.property.code})`,
      operation: subject.operation,
      type: d.property.type,
      comuna: d.property.comuna,
      sector: d.property.sector,
      currency: subject.currency,
      price: Number(d.price),
      m2Useful: num(d.property.m2Useful),
      m2Land: num(d.property.m2Land),
      bedrooms: d.property.bedrooms,
      bathrooms: d.property.bathrooms,
      observedAt: d.closedAt ?? d.stageChangedAt,
    });
  }
  for (const p of listings) {
    if (p.id === excludePropertyId || closed.has(p.id)) continue;
    out.push({
      source: "cartera",
      propertyId: p.id,
      dealId: null,
      label: p.code,
      operation: subject.operation,
      type: p.type,
      comuna: p.comuna,
      sector: p.sector,
      currency: subject.currency,
      price: Number(p.price),
      m2Useful: num(p.m2Useful),
      m2Land: num(p.m2Land),
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      observedAt: p.listedAt ?? p.updatedAt,
    });
  }
  return out;
}

type ValuationRow = Prisma.ValuationGetPayload<object>;
type ComparableRow = Prisma.ValuationComparableGetPayload<object>;

export function subjectOf(v: ValuationRow): ValuationSubject {
  return {
    operation: v.operation,
    type: v.type,
    comuna: v.comuna,
    sector: v.sector,
    currency: v.currency,
    m2Useful: num(v.m2Useful),
    m2Land: num(v.m2Land),
    bedrooms: v.bedrooms,
    bathrooms: v.bathrooms,
  };
}

export function comparableOf(c: ComparableRow): ComparableInput {
  return {
    source: c.source,
    operation: c.operation,
    type: c.type,
    comuna: c.comuna,
    sector: c.sector,
    currency: c.currency,
    price: Number(c.price),
    m2Useful: num(c.m2Useful),
    m2Land: num(c.m2Land),
    bedrooms: c.bedrooms,
    bathrooms: c.bathrooms,
  };
}
