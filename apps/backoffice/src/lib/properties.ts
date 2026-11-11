import "server-only";
import { canEditProperty, seesOnlyOwnProperties, type PropertyInput } from "@bullhaus/core";
import { prisma, Prisma } from "@bullhaus/db";
import type { CurrentUser } from "./auth";
import { audit } from "./audit";

export interface PropertyFilters {
  q?: string;
  operation?: string;
  status?: string;
  comuna?: string;
  brokerId?: string;
}

function scope(user: CurrentUser): Prisma.PropertyWhereInput {
  return seesOnlyOwnProperties(user.role) ? { tenantId: user.tenantId, brokerId: user.id } : { tenantId: user.tenantId };
}

export async function listProperties(user: CurrentUser, f: PropertyFilters) {
  const where: Prisma.PropertyWhereInput = { ...scope(user) };
  if (f.q) where.OR = [{ code: { contains: f.q, mode: "insensitive" } }, { sector: { contains: f.q, mode: "insensitive" } }, { comuna: { contains: f.q, mode: "insensitive" } }];
  if (f.operation === "venta" || f.operation === "arriendo") where.operation = f.operation;
  if (f.status) where.status = f.status as Prisma.EnumPropertyStatusFilter["equals"];
  if (f.comuna) where.comuna = f.comuna;
  if (f.brokerId && !seesOnlyOwnProperties(user.role)) where.brokerId = f.brokerId;
  return prisma.property.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { broker: { select: { name: true } }, media: { where: { isCover: true }, take: 1 } },
    take: 500,
  });
}

export async function getProperty(user: CurrentUser, id: string) {
  return prisma.property.findFirst({
    where: { id, ...scope(user) },
    include: {
      broker: { select: { id: true, name: true, email: true } },
      media: { orderBy: [{ isCover: "desc" }, { order: "asc" }] },
      priceHistory: { orderBy: { changedAt: "desc" } },
      mandates: { include: { owner: true }, orderBy: { expiresAt: "desc" } },
    },
  });
}

export async function activeBrokers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId, active: true, role: { in: ["corredor", "admin"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export class PropertyError extends Error {}

function toData(input: PropertyInput, brokerId: string) {
  return {
    code: input.code,
    operation: input.operation,
    type: input.type,
    comuna: input.comuna,
    sector: input.sector ?? null,
    price: new Prisma.Decimal(input.price ?? 0),
    currency: input.currency,
    commonExpensesClp: input.commonExpensesClp ?? null,
    m2Useful: input.m2Useful !== undefined ? new Prisma.Decimal(input.m2Useful) : null,
    m2Land: input.m2Land !== undefined ? new Prisma.Decimal(input.m2Land) : null,
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    parking: input.parking ?? null,
    storage: input.storage ?? null,
    pets: input.pets ?? null,
    furnished: input.furnished ?? null,
    availableFrom: input.availableFrom ?? null,
    status: input.status,
    brokerId,
    addressPrivate: input.addressPrivate ?? null,
    instagramUrl: input.instagramUrl ?? null,
    adIds: input.adIds,
    description: input.description ?? null,
    publishWeb: input.publishWeb ?? false,
  };
}

/**
 * Crea o actualiza una propiedad por código, respetando permisos y registrando
 * el historial de precio y la auditoría.
 */
export async function saveProperty(
  user: CurrentUser,
  input: PropertyInput,
  opts: { id?: string; source: "panel" | "planilla" },
): Promise<{ id: string; created: boolean }> {
  const broker = await prisma.user.findFirst({ where: { tenantId: user.tenantId, email: input.brokerEmail, active: true } });
  if (!broker) throw new PropertyError(`El corredor ${input.brokerEmail} no existe o está inactivo`);
  if (seesOnlyOwnProperties(user.role) && broker.id !== user.id) {
    throw new PropertyError("Un corredor solo puede asignarse propiedades a sí mismo");
  }

  const existing = opts.id
    ? await prisma.property.findFirst({ where: { id: opts.id, tenantId: user.tenantId } })
    : await prisma.property.findUnique({ where: { tenantId_code: { tenantId: user.tenantId, code: input.code } } });

  if (opts.id && !existing) throw new PropertyError("La propiedad no existe");
  if (existing && !canEditProperty(user, existing)) throw new PropertyError(`No tienes permiso para editar ${existing.code}`);
  if (existing && existing.code !== input.code) {
    const clash = await prisma.property.findUnique({ where: { tenantId_code: { tenantId: user.tenantId, code: input.code } } });
    if (clash) throw new PropertyError(`Ya existe otra propiedad con el código ${input.code}`);
  }
  if (!existing && opts.id === undefined && user.role !== "admin" && user.role !== "corredor") {
    throw new PropertyError("No tienes permiso para crear propiedades");
  }

  const data = toData(input, broker.id);

  if (!existing) {
    const created = await prisma.property.create({
      data: { ...data, tenantId: user.tenantId, priceHistory: { create: { price: data.price, currency: data.currency } } },
    });
    await audit(user, "property.create", "property", created.id, { code: created.code, source: opts.source });
    return { id: created.id, created: true };
  }

  const priceChanged = !existing.price.equals(data.price) || existing.currency !== data.currency;
  await prisma.property.update({
    where: { id: existing.id },
    data: { ...data, ...(priceChanged ? { priceHistory: { create: { price: data.price, currency: data.currency } } } : {}) },
  });
  await audit(user, "property.update", "property", existing.id, {
    code: input.code,
    source: opts.source,
    ...(priceChanged ? { price: { from: existing.price.toString(), to: data.price.toString(), currency: data.currency } } : {}),
    ...(existing.status !== data.status ? { status: { from: existing.status, to: data.status } } : {}),
  });
  return { id: existing.id, created: false };
}
