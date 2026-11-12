import "server-only";
import { captacionPosts, listingPost, type ListingForPost } from "@bullhaus/core";
import { prisma, type Property } from "@bullhaus/db";
import type { CurrentUser } from "./auth";
import { audit } from "./audit";

const toListing = (p: Property): ListingForPost => ({
  code: p.code,
  operation: p.operation,
  type: p.type,
  comuna: p.comuna,
  headline: p.headline,
  price: Number(p.price),
  currency: p.currency,
  m2Useful: p.m2Useful ? Number(p.m2Useful) : null,
  m2Land: p.m2Land ? Number(p.m2Land) : null,
  bedrooms: p.bedrooms,
  bathrooms: p.bathrooms,
  parking: p.parking,
  features: p.features,
});

/** Elige propiedades variadas: distintas comunas, de mayor a menor precio, con fotos. */
async function pick(tenantId: string, operation: "venta" | "arriendo", n: number) {
  const all = await prisma.property.findMany({
    where: { tenantId, operation, status: "disponible", publishWeb: true, media: { some: {} } },
    orderBy: { price: "desc" },
  });
  const chosen: Property[] = [];
  const comunas = new Set<string>();
  for (const p of all) if (chosen.length < n && !comunas.has(p.comuna)) (chosen.push(p), comunas.add(p.comuna));
  for (const p of all) if (chosen.length < n && !chosen.includes(p)) chosen.push(p);
  return chosen;
}

const addDays = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));

/**
 * Crea las campañas de Instagram de captación, venta y arriendo como borradores "en revisión".
 * Los textos salen de las fichas aprobadas. Nada se publica ni gasta presupuesto hasta que
 * una persona con permiso de aprobación lo apruebe en Campañas.
 */
export async function createInstagramDrafts(user: CurrentUser): Promise<number> {
  const start = addDays(new Date(), 7);
  const specs = [
    {
      name: "Captación de propietarios · Instagram",
      objective: "captacion" as const,
      audience:
        "Personas en Las Condes, Vitacura, Lo Barnechea, Providencia, Ñuñoa, Zapallar, Cachagua, Papudo, Maitencillo y Viña del Mar con interés en bienes raíces. Sin segmentar por condiciones personales.",
      budgetClp: 450_000,
      posts: captacionPosts().map((p) => ({ ...p, propertyId: null as string | null })),
    },
    {
      name: "Venta · selección de propiedades · Instagram",
      objective: "venta" as const,
      audience: "Personas en la Región Metropolitana y la V Región con interés en compra de propiedades.",
      budgetClp: 600_000,
      posts: (await pick(user.tenantId, "venta", 6)).map((p) => ({ ...listingPost(toListing(p), "carrusel"), propertyId: p.id })),
    },
    {
      name: "Arriendo · propiedades disponibles · Instagram",
      objective: "arriendo" as const,
      audience: "Personas en la Región Metropolitana con interés en arriendo de departamentos y casas.",
      budgetClp: 250_000,
      posts: (await pick(user.tenantId, "arriendo", 4)).map((p) => ({ ...listingPost(toListing(p), "post"), propertyId: p.id })),
    },
  ];

  let created = 0;
  for (const s of specs) {
    if (s.posts.length === 0) continue;
    const exists = await prisma.campaign.findFirst({ where: { tenantId: user.tenantId, name: s.name, isDemo: false, status: { in: ["borrador", "en_revision"] } } });
    if (exists) continue;
    const c = await prisma.campaign.create({
      data: {
        tenantId: user.tenantId,
        name: s.name,
        objective: s.objective,
        status: "en_revision",
        audience: s.audience,
        budgetClp: s.budgetClp,
        startsAt: start,
        endsAt: addDays(start, 30),
        createdById: user.id,
        posts: {
          create: s.posts.map((p, i) => ({
            format: p.format,
            hook: p.hook,
            caption: p.caption,
            hashtags: p.hashtags,
            cta: p.cta,
            propertyId: p.propertyId,
            order: i,
            scheduledAt: addDays(start, i * 3),
          })),
        },
      },
    });
    await audit(user, "campaign.draft", "campaign", c.id, { posts: s.posts.length });
    created++;
  }
  return created;
}
