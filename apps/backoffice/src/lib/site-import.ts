import "server-only";
import { randomBytes } from "node:crypto";
import { backofficeCode, parseSiteListing, type PropertyStatus, type SiteListing } from "@bullhaus/core";
import { hashPassword } from "@bullhaus/core/server";
import { prisma, Prisma } from "@bullhaus/db";
import type { CurrentUser } from "./auth";
import { savePhoto } from "./storage";

const SITE = "https://www.bullhaus.cl";
// Solo las primeras fotos: alcanzan para la web y la ficha, y cuidan el espacio en Supabase.
export const PHOTOS_PER_PROPERTY = 8;

/** Equipo publicado en bullhaus.cl. Si el corredor de una ficha no existe en el back office, se crea con estos datos. */
const TEAM: Record<string, string> = {
  "rodrigo@bullhaus.cl": "Rodrigo Abbott Irarrazaval",
  "alejandro@bullhaus.cl": "Alejandro Steinsapir Stitchkin",
  "sandra@bullhaus.cl": "Sandra Cáceres",
  "manuel@bullhaus.cl": "Manuel José Vial",
  "santiago@bullhaus.cl": "Santiago Andrés Krogh",
};
const FALLBACK_BROKER = "rodrigo@bullhaus.cl";

export interface ImportResult {
  code: string;
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  photos: number;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "BullHaus-BackOffice/1.0" }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`bullhaus.cl respondió ${res.status}`);
  return res.text();
}

async function brokerFor(tenantId: string, email: string | undefined): Promise<{ id: string; created: boolean }> {
  const wanted = email && TEAM[email] ? email : email ?? FALLBACK_BROKER;
  const existing = await prisma.user.findUnique({ where: { tenantId_email: { tenantId, email: wanted } } });
  if (existing) return { id: existing.id, created: false };
  // Cuenta sin acceso hasta que un administrador le restablezca la contraseña desde Usuarios.
  const user = await prisma.user.create({
    data: {
      tenantId,
      email: wanted,
      name: TEAM[wanted] ?? wanted.split("@")[0]!,
      role: "corredor",
      passwordHash: await hashPassword(randomBytes(24).toString("base64url")),
      mustChangePassword: true,
    },
  });
  return { id: user.id, created: true };
}

function statusFor(listing: SiteListing, operation: "venta" | "arriendo"): PropertyStatus {
  // La cinta de la ficha corresponde a una operación: "Arrendada" no cierra la venta, ni al revés.
  if (listing.status === "arrendada") return operation === "arriendo" ? "arrendada" : "disponible";
  if (listing.status === "vendida") return operation === "venta" ? "vendida" : "retirada";
  return listing.status;
}

async function importPhotos(propertyId: string, urls: string[]): Promise<number> {
  let saved = 0;
  for (const [i, url] of urls.slice(0, PHOTOS_PER_PROPERTY).entries()) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const { sizes } = await savePhoto(propertyId, Buffer.from(await res.arrayBuffer()));
      await prisma.propertyMedia.create({ data: { propertyId, storageKey: sizes.md, sizes, order: i, isCover: saved === 0, source: "panel" } });
      saved++;
    } catch {
      // Una foto que no baja no detiene la ficha.
    }
  }
  return saved;
}

/** Importa (o actualiza) una ficha de bullhaus.cl. Idempotente: no duplica propiedades ni fotos. */
export async function importSiteListing(user: CurrentUser, code: string): Promise<ImportResult> {
  const result: ImportResult = { code, ok: false, message: "", created: 0, updated: 0, photos: 0 };
  let listing: SiteListing;
  try {
    listing = parseSiteListing(await fetchText(`${SITE}/${encodeURIComponent(code)}`));
  } catch (e) {
    result.message = e instanceof Error ? e.message : "No se pudo leer la ficha";
    return result;
  }
  const broker = await brokerFor(user.tenantId, listing.brokerEmail);

  for (const offer of listing.offers) {
    const bo = backofficeCode(listing, offer);
    const status = statusFor(listing, offer.operation);
    const data = {
      operation: offer.operation,
      type: listing.type,
      comuna: listing.comuna,
      price: new Prisma.Decimal(offer.price),
      currency: offer.currency,
      m2Useful: listing.m2Useful !== undefined ? new Prisma.Decimal(listing.m2Useful) : null,
      m2Land: listing.m2Land !== undefined ? new Prisma.Decimal(listing.m2Land) : null,
      bedrooms: listing.bedrooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      status,
      headline: listing.headline ?? null,
      description: listing.description ?? null,
      features: listing.features,
      details: listing.details,
      sourceUrl: `${SITE}/${listing.code}`,
      // Las fichas ya estaban publicadas por Bull Haus en su sitio; siguen publicadas si están disponibles.
      publishWeb: status === "disponible",
    };
    const existing = await prisma.property.findUnique({ where: { tenantId_code: { tenantId: user.tenantId, code: bo } } });
    let propertyId: string;
    if (existing) {
      await prisma.property.update({ where: { id: existing.id }, data: { ...data, ...(status === "disponible" && !existing.listedAt ? { listedAt: new Date() } : {}) } });
      if (!existing.price.equals(data.price) || existing.currency !== data.currency) {
        await prisma.propertyPriceHistory.create({ data: { propertyId: existing.id, price: data.price, currency: data.currency } });
      }
      propertyId = existing.id;
      result.updated++;
    } else {
      const created = await prisma.property.create({ data: { ...data, listedAt: status === "disponible" ? new Date() : null, tenantId: user.tenantId, code: bo, brokerId: broker.id, adIds: [] } });
      await prisma.propertyPriceHistory.create({ data: { propertyId: created.id, price: data.price, currency: data.currency } });
      propertyId = created.id;
      result.created++;
    }
    if ((await prisma.propertyMedia.count({ where: { propertyId } })) === 0) {
      result.photos += await importPhotos(propertyId, listing.photos);
    }
  }

  await prisma.auditLog.create({
    data: { tenantId: user.tenantId, actorId: user.id, action: "property.import_site", entity: "property", entityId: listing.code, payload: { created: result.created, updated: result.updated, photos: result.photos, brokerCreated: broker.created } },
  });
  result.ok = true;
  result.message = `${listing.offers.map((o) => o.operation).join(" y ")} · ${listing.comuna}${broker.created ? " · corredor creado" : ""}`;
  return result;
}
