import "server-only";
import { BROCHURE_LEAD_KIND, CONTACT_TEMPLATES, OPEN_STAGES, sourceForChannel, TYPE_LABELS, type ShareChannel, type TaskKind } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import type { CurrentUser } from "../auth";
import { newBrochureToken } from "../brochures";
import { FIRST, LAST, rng, weighted } from "./leads";
import { DAY } from "./legal";

// Demo del flujo comercial: brochures de captación, venta y arriendo en todos los estados, envíos por
// WhatsApp, email y redes con sus aperturas, leads que llegaron por un brochure, y compromisos de
// contacto en el pipeline (vencidos, de hoy, próximos y ya hechos). Todo con isDemo = true.

const HOUR = 3_600_000;

export async function loadDemoOutreach(user: CurrentUser): Promise<{ brochures: number; shares: number; tasks: number }> {
  const r = rng(20261120);
  const tenantId = user.tenantId;
  const now = Date.now();

  const props = await prisma.property.findMany({
    where: { tenantId, status: "disponible", media: { some: {} } },
    orderBy: { price: "desc" },
    select: { id: true, code: true, type: true, comuna: true, operation: true, headline: true, brokerId: true, price: true, currency: true },
  });
  const venta = props.filter((p) => p.operation === "venta");
  const arriendo = props.filter((p) => p.operation === "arriendo");
  const titleOf = (p: (typeof props)[number]) => p.headline ?? `${TYPE_LABELS[p.type]} en ${p.operation} en ${p.comuna}`;

  type Plan = { kind: "captacion" | "venta" | "arriendo"; prop?: (typeof props)[number]; status: "aprobado" | "en_revision" | "borrador"; ageDays: number; intro?: string };
  const plans: Plan[] = [
    { kind: "captacion", status: "aprobado", ageDays: 75, intro: "Te acompañamos a vender o arrendar tu propiedad con una valorización fundamentada, difusión en todos nuestros canales y visitas acompañadas." },
    ...venta.slice(0, 5).map((p, i): Plan => ({ kind: "venta", prop: p, status: "aprobado", ageDays: 55 - i * 8 })),
    ...arriendo.slice(0, 2).map((p, i): Plan => ({ kind: "arriendo", prop: p, status: "aprobado", ageDays: 40 - i * 12 })),
    ...(venta[5] ? [{ kind: "venta", prop: venta[5], status: "en_revision", ageDays: 2 } as Plan] : []),
    ...(venta[6] ? [{ kind: "venta", prop: venta[6], status: "borrador", ageDays: 0 } as Plan] : []),
  ];

  const demoLeads = await prisma.lead.findMany({ where: { tenantId, isDemo: true, stage: { in: [...OPEN_STAGES] } }, select: { id: true, kind: true, brokerId: true, propertyId: true, stage: true } });
  const shares: Prisma.BrochureShareCreateManyInput[] = [];
  const newLeads: Prisma.LeadCreateInput[] = [];
  let brochures = 0;

  for (const plan of plans) {
    const createdAt = new Date(now - plan.ageDays * DAY - 3 * HOUR);
    const b = await prisma.brochure.create({
      data: {
        tenantId, kind: plan.kind, propertyId: plan.prop?.id ?? null, title: plan.prop ? titleOf(plan.prop) : "Vende o arrienda tu propiedad con Bull Haus", intro: plan.intro ?? null, token: newBrochureToken(), status: plan.status,
        createdById: plan.prop?.brokerId ?? user.id, ...(plan.status === "aprobado" ? { approvedById: user.id, approvedAt: new Date(createdAt.getTime() + 20 * HOUR) } : {}), isDemo: true, createdAt,
      },
    });
    brochures++;
    if (plan.status !== "aprobado") continue;

    // Envíos desde la aprobación hasta hoy.
    const leadKind = BROCHURE_LEAD_KIND[plan.kind];
    const targets = demoLeads.filter((l) => l.kind === leadKind && (!plan.prop || l.propertyId === plan.prop.id || r() < 0.15));
    let views = 0;
    const count = plan.kind === "captacion" ? 26 : 8 + Math.floor(r() * 10);
    for (let i = 0; i < count; i++) {
      const sentAt = new Date(createdAt.getTime() + DAY + r() * (now - createdAt.getTime() - 1.2 * DAY));
      const channel = weighted<ShareChannel>(r, [["whatsapp", 46], ["email", 12], ["instagram", 15], ["facebook", 11], ["linkedin", plan.kind === "captacion" ? 12 : 5], ["enlace", 6]]);
      const direct = channel === "whatsapp" || channel === "email";
      const lead = direct && targets.length && r() < 0.8 ? targets[Math.floor(r() * targets.length)]! : null;
      const openProb = channel === "whatsapp" ? 0.72 : channel === "email" ? 0.48 : 0.9;
      const opened = r() < openProb;
      const opens = !opened ? 0 : direct ? 1 + Math.floor(r() * 3) : 15 + Math.floor(r() * (channel === "instagram" ? 160 : 70));
      views += opens;
      const openedAt = opened ? new Date(Math.min(now - HOUR, sentAt.getTime() + (0.2 + r() * 20) * HOUR)) : null;
      shares.push({ tenantId, brochureId: b.id, channel, leadId: lead?.id ?? null, sentById: plan.prop?.brokerId ?? user.id, sentAt, openedAt, opens, isDemo: true });

      // De los envíos abiertos en redes y grupos sale una parte de los leads nuevos.
      const leadsFrom = !opened ? 0 : direct ? (r() < 0.12 ? 1 : 0) : Math.floor(opens * (0.008 + r() * 0.014));
      for (let k = 0; k < leadsFrom; k++) {
        const at = new Date(Math.min(now - 2 * HOUR, (openedAt ?? sentAt).getTime() + r() * 3 * DAY));
        const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
        const ageH = (now - at.getTime()) / HOUR;
        const stage = ageH < 30 ? "nuevo" : weighted(r, [["contactado", 4], ["calificado", 3], ["visita", 2], ["perdido", 1]] as [Prisma.LeadCreateInput["stage"], number][]);
        newLeads.push({
          tenant: { connect: { id: tenantId } }, kind: leadKind, source: sourceForChannel(channel), stage, name,
          phone: `+56 9 ${String(50000000 + Math.floor(r() * 49999999)).replace(/(\d{4})(\d{4})/, "$1 $2")}`,
          email: r() < 0.6 ? `${name.split(" ")[0]!.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}.${Math.floor(r() * 900 + 100)}@ejemplo.cl` : null,
          comuna: plan.prop?.comuna ?? weighted(r, [["Las Condes", 4], ["Vitacura", 3], ["Lo Barnechea", 2], ["Providencia", 2], ["Zapallar", 1]]),
          interest: plan.prop ? `Brochure ${plan.prop.code}` : "Quiere vender o arrendar su propiedad",
          ...(plan.prop ? { property: { connect: { id: plan.prop.id } }, budget: plan.prop.price, budgetCurrency: plan.prop.currency } : {}),
          broker: { connect: { id: plan.prop?.brokerId ?? user.id } }, brochure: { connect: { id: b.id } }, isDemo: true, createdAt: at, stageChangedAt: new Date(at.getTime() + (stage === "nuevo" ? 0 : r() * 2 * DAY)),
          tasks: {
            create: {
              tenant: { connect: { id: tenantId } }, owner: { connect: { id: plan.prop?.brokerId ?? user.id } }, kind: "llamar",
              title: leadKind === "propietario" ? "Llamar para agendar la valorización (pidió contacto desde el brochure)" : "Llamar: pidió información desde el brochure",
              dueAt: new Date(at.getTime() + 2 * HOUR), templateKey: leadKind === "propietario" ? "agendar_valorizacion" : "primer_contacto",
              status: stage === "nuevo" ? "pendiente" : "hecho", doneAt: stage === "nuevo" ? null : new Date(at.getTime() + (1 + r() * 5) * HOUR), isDemo: true,
            },
          },
        });
      }
    }
    await prisma.brochure.update({ where: { id: b.id }, data: { views: views + Math.floor(r() * 40) } });
  }
  await prisma.brochureShare.createMany({ data: shares });
  for (const l of newLeads) await prisma.lead.create({ data: l });

  // Compromisos de los leads abiertos del pipeline: algunos vencidos, otros hoy y los demás próximos,
  // más el historial de contactos ya hechos.
  const open = await prisma.lead.findMany({ where: { tenantId, isDemo: true, stage: { in: [...OPEN_STAGES] }, brochureId: null }, select: { id: true, kind: true, stage: true, brokerId: true, createdAt: true } });
  const tasks: Prisma.LeadTaskCreateManyInput[] = [];
  const todayHour = (h: number) => {
    const d = new Date(now);
    const santiago = new Date(d.toLocaleString("en-US", { timeZone: "America/Santiago" }));
    return new Date(now + (h - santiago.getHours()) * HOUR - santiago.getMinutes() * 60_000);
  };
  for (const l of open) {
    const owner = l.brokerId ?? user.id;
    const step = nextStep(l.kind, l.stage);
    if (r() < 0.82) {
      const bucket = weighted(r, [["vencido", 16], ["hoy", 22], ["proximo", 62]] as [string, number][]);
      const dueAt =
        bucket === "vencido" ? new Date(now - (2 + r() * 70) * HOUR) : bucket === "hoy" ? todayHour(9 + Math.floor(r() * 10)) : new Date(now + (1 + Math.floor(r() * 9)) * DAY + (Math.floor(r() * 8) - 3) * HOUR);
      tasks.push({ tenantId, leadId: l.id, ownerId: owner, kind: step.kind, title: step.title, dueAt, templateKey: step.template, isDemo: true, createdAt: new Date(Math.max(l.createdAt.getTime(), dueAt.getTime() - 3 * DAY)) });
    }
    const done = l.stage === "nuevo" ? 0 : 1 + Math.floor(r() * 2);
    for (let i = 0; i < done; i++) {
      const at = new Date(l.createdAt.getTime() + (i + 1) * (0.5 + r()) * DAY);
      if (at.getTime() > now - HOUR) break;
      tasks.push({ tenantId, leadId: l.id, ownerId: owner, kind: i === 0 ? "llamar" : "whatsapp", title: i === 0 ? "Primer contacto" : "Envío de información y brochure", dueAt: at, templateKey: i === 0 ? "primer_contacto" : "envio_brochure", status: "hecho", doneAt: new Date(at.getTime() + r() * 4 * HOUR), note: i === 0 ? "Conversamos; le interesa avanzar." : null, isDemo: true, createdAt: new Date(at.getTime() - DAY) });
    }
  }
  await prisma.leadTask.createMany({ data: tasks });
  return { brochures, shares: shares.length, tasks: tasks.length + newLeads.length };
}

function nextStep(kind: string, stage: string): { kind: TaskKind; title: string; template: string | null } {
  const pick = (key: string) => CONTACT_TEMPLATES.find((t) => t.key === key)!.key;
  if (kind === "propietario") {
    if (stage === "nuevo") return { kind: "llamar", title: "Llamar para conocer la propiedad y agendar la valorización", template: pick("agendar_valorizacion") };
    if (stage === "contactado" || stage === "calificado") return { kind: "whatsapp", title: "Enviar el brochure de captación y proponer día de visita", template: pick("envio_brochure") };
    if (stage === "visita") return { kind: "visita", title: "Visita de valorización", template: pick("agendar_valorizacion") };
    return { kind: "seguimiento", title: "Seguimiento de la propuesta de orden de corretaje", template: pick("propuesta_mandato") };
  }
  if (stage === "nuevo") return { kind: "whatsapp", title: "Primer contacto por WhatsApp", template: pick("primer_contacto") };
  if (stage === "contactado") return { kind: "whatsapp", title: "Enviar el brochure de la propiedad", template: pick("envio_brochure") };
  if (stage === "calificado") return { kind: "visita", title: "Confirmar la visita", template: pick("confirmar_visita") };
  if (stage === "visita") return { kind: "seguimiento", title: "Seguimiento después de la visita", template: pick("seguimiento_visita") };
  return { kind: "llamar", title: "Llamar para conversar la oferta", template: null };
}

