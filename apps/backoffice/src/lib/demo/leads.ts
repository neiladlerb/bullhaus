import "server-only";
import { randomUUID } from "node:crypto";
import { OPEN_STAGES, type LeadKind, type LeadSource, type LeadStage } from "@bullhaus/core";
import { prisma, Prisma } from "@bullhaus/db";
import type { CurrentUser } from "../auth";
import { audit } from "../audit";

// Datos de demostración: leads, movimientos del pipeline y campañas pasadas con métricas.
// Todo lleva isDemo = true para poder borrarlo de una vez. Los contactos son ficticios
// y ningún agente debe escribirles (el worker filtra isDemo).

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FIRST = ["Catalina", "Martín", "Josefa", "Benjamín", "Antonia", "Tomás", "Florencia", "Vicente", "Isidora", "Matías", "Trinidad", "Joaquín", "Fernanda", "Sebastián", "Valentina", "Cristóbal", "Constanza", "Felipe", "Magdalena", "Ignacio", "Paula", "Diego", "Javiera", "Nicolás", "Carolina", "Francisco", "María José", "Andrés", "Camila", "Pablo"];
export const LAST = ["González", "Muñoz", "Rojas", "Díaz", "Pérez", "Soto", "Contreras", "Silva", "Martínez", "Sepúlveda", "Morales", "Rodríguez", "López", "Fuentes", "Hernández", "Torres", "Araya", "Flores", "Espinoza", "Valenzuela", "Castillo", "Tapia", "Reyes", "Gutiérrez", "Larraín", "Errázuriz", "Ossa", "Vial", "Matte", "Edwards"];
const OWNER_COMUNAS = ["Las Condes", "Vitacura", "Lo Barnechea", "Providencia", "Ñuñoa", "Zapallar", "Cachagua", "Maitencillo", "Papudo", "Viña del Mar"];
const OWNER_INTEREST = ["Casa 4D 3B que quiere vender", "Departamento 3D 2B para arrendar", "Departamento 2D 2B para vender", "Casa en condominio para vender", "Parcela para vender", "Casa de playa para arrendar en temporada", "Oficina para arrendar"];
const LOST = ["No volvió a responder", "Compró con otra corredora", "Presupuesto fuera de rango", "Decidió no vender por ahora", "Encontró arriendo por su cuenta"];

const KINDS: [LeadKind, number][] = [["comprador", 0.48], ["arrendatario", 0.27], ["propietario", 0.25]];
const SOURCES: [LeadSource, number][] = [["instagram", 0.38], ["facebook", 0.14], ["whatsapp", 0.18], ["web", 0.14], ["portal", 0.1], ["referido", 0.06]];

/** Elige según pesos (no hace falta que sumen 1). */
export function weighted<T>(r: () => number, items: [T, number][]): T {
  let x = r() * items.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of items) if ((x -= w) <= 0) return v;
  return items[items.length - 1]![0];
}

/** Etapa final según la antigüedad: los leads viejos avanzaron más (o se perdieron). */
function finalStage(r: () => number, ageDays: number): LeadStage {
  const progress = Math.min(1, ageDays / 60);
  const x = r();
  if (ageDays > 10 && x < 0.22 * progress + 0.05) return "perdido";
  if (ageDays > 20 && x < 0.32 * progress + 0.05) return "ganado";
  const idx = Math.min(OPEN_STAGES.length - 1, Math.floor(r() * (1 + progress * OPEN_STAGES.length)));
  return OPEN_STAGES[idx]!;
}

const day = 86_400_000;

export async function loadDemoLeads(user: CurrentUser): Promise<{ leads: number; campaigns: number }> {
  const r = rng(20261111);
  const now = Date.now();
  const brokers = await prisma.user.findMany({ where: { tenantId: user.tenantId, active: true, role: { in: ["corredor", "admin"] } }, select: { id: true } });
  const props = await prisma.property.findMany({
    where: { tenantId: user.tenantId, status: "disponible" },
    select: { id: true, operation: true, comuna: true, price: true, currency: true, brokerId: true },
  });
  const approver = user.id;

  const campaignSpecs = [
    { name: "Captación Lo Barnechea y Vitacura · agosto", objective: "captacion" as const, from: 95, to: 65, budget: 380_000 },
    { name: "Venta casas sector oriente · septiembre", objective: "venta" as const, from: 70, to: 40, budget: 520_000 },
    { name: "Arriendos Las Condes · octubre", objective: "arriendo" as const, from: 45, to: 15, budget: 210_000 },
    { name: "Captación costa: Zapallar, Cachagua, Maitencillo", objective: "captacion" as const, from: 20, to: -10, budget: 420_000 },
    { name: "Venta departamentos Las Condes y Ñuñoa", objective: "venta" as const, from: 14, to: -16, budget: 480_000 },
  ];
  const campaigns = [];
  for (const s of campaignSpecs) {
    const done = Math.min(1, s.from / (s.from - s.to));
    const spend = Math.round(s.budget * Math.min(1, done) * (0.92 + r() * 0.08));
    const impressions = Math.round((spend / 1000) * (260 + r() * 120));
    const reach = Math.round(impressions * (0.55 + r() * 0.15));
    const clicks = Math.round(impressions * (0.011 + r() * 0.01));
    campaigns.push(
      await prisma.campaign.create({
        data: {
          tenantId: user.tenantId,
          name: s.name,
          objective: s.objective,
          status: s.to < 0 ? "activa" : "finalizada",
          audience: "Personas con interés en bienes raíces en las comunas de la campaña.",
          budgetClp: s.budget,
          startsAt: new Date(now - s.from * day),
          endsAt: new Date(now - s.to * day),
          approvedById: approver,
          approvedAt: new Date(now - (s.from + 2) * day),
          impressions,
          reach,
          clicks,
          spendClp: spend,
          isDemo: true,
        },
      }),
    );
  }

  const leads: Prisma.LeadCreateManyInput[] = [];
  const events: Prisma.LeadEventCreateManyInput[] = [];
  const TOTAL = 168;
  for (let i = 0; i < TOTAL; i++) {
    const ageDays = Math.floor(Math.pow(r(), 1.3) * 90);
    const createdAt = new Date(now - ageDays * day - Math.floor(r() * day));
    const kind = weighted(r, KINDS);
    const source = weighted(r, SOURCES);
    const stage = finalStage(r, ageDays);
    const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
    const op = kind === "comprador" ? "venta" : "arriendo";
    const candidates = props.filter((p) => p.operation === op);
    const prop = kind !== "propietario" && candidates.length ? candidates[Math.floor(r() * candidates.length)]! : null;
    const social = source === "instagram" || source === "facebook";
    const campaign = social
      ? campaigns.find(
          (c) =>
            c.startsAt! <= createdAt && c.endsAt! >= createdAt && (kind === "propietario" ? c.objective === "captacion" : c.objective !== "captacion"),
        )
      : undefined;
    const brokerId = prop?.brokerId ?? brokers[Math.floor(r() * brokers.length)]?.id ?? null;
    const id = randomUUID();
    leads.push({
      id,
      tenantId: user.tenantId,
      kind,
      source,
      stage,
      name,
      phone: `+56 9 ${String(50000000 + Math.floor(r() * 49999999)).replace(/(\d{4})(\d{4})/, "$1 $2")}`,
      comuna: prop?.comuna ?? (kind === "propietario" ? OWNER_COMUNAS[Math.floor(r() * OWNER_COMUNAS.length)]! : null),
      interest: kind === "propietario" ? OWNER_INTEREST[Math.floor(r() * OWNER_INTEREST.length)]! : null,
      budget: prop ? prop.price : null,
      budgetCurrency: prop ? prop.currency : null,
      propertyId: prop?.id ?? null,
      campaignId: campaign?.id ?? null,
      brokerId: stage === "nuevo" && r() < 0.5 ? null : brokerId,
      lostReason: stage === "perdido" ? LOST[Math.floor(r() * LOST.length)]! : null,
      isDemo: true,
      createdAt,
      stageChangedAt: new Date(createdAt.getTime() + Math.floor(ageDays * 0.7 * day)),
    });
    // Historial: cada etapa por la que pasó hasta la actual.
    const path: LeadStage[] = stage === "perdido" ? ["contactado"] : stage === "ganado" ? [...OPEN_STAGES.slice(1)] : OPEN_STAGES.slice(1, OPEN_STAGES.indexOf(stage) + 1);
    if (stage === "perdido" || stage === "ganado") path.push(stage);
    let prev: LeadStage = "nuevo";
    path.forEach((to, k) => {
      events.push({ leadId: id, fromStage: prev, toStage: to, createdAt: new Date(createdAt.getTime() + ((k + 1) / (path.length + 1)) * ageDays * day) });
      prev = to;
    });
  }

  await prisma.lead.createMany({ data: leads });
  await prisma.leadEvent.createMany({ data: events });

  await audit(user, "demo.load", "tenant", user.tenantId, { leads: leads.length, campaigns: campaigns.length });
  return { leads: leads.length, campaigns: campaigns.length };
}

export async function clearDemoLeads(user: CurrentUser): Promise<void> {
  await prisma.lead.deleteMany({ where: { tenantId: user.tenantId, isDemo: true } });
  await prisma.campaign.deleteMany({ where: { tenantId: user.tenantId, isDemo: true } });
}
