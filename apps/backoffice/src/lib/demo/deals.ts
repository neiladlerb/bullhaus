import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { commissionAmount, invoiceAmounts, kycRisk, type DealStage } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import type { CurrentUser } from "../auth";
import { generateDealContract } from "../contracts";
import { rng } from "./leads";
import { DAY, demoPerson, type OwnerInfo } from "./legal";

// Operaciones de demostración:
// - historial: las propiedades vendidas o arrendadas de la cartera, cerradas en los últimos 12 meses;
// - en curso: los leads que llegaron a oferta o cierre sobre propiedades disponibles.
// Cada una con sus partes, KYC, contratos y facturas de comisión. Todo con isDemo.

/** UF aproximada de una fecha pasada (sube ~4,5 % al año). Solo para la demostración; producción usa la UF del día. */
export const demoUfAt = (d: Date, today = 41_316.06) => Math.round(today * (1 - ((Date.now() - d.getTime()) / DAY) * 0.000123) * 100) / 100;

const FUNDS = ["Ahorros propios y crédito hipotecario", "Venta de otra propiedad", "Ahorros e indemnización laboral", "Herencia", "Remuneraciones"];

interface Planned {
  id: string;
  stage: DealStage;
  operation: "venta" | "arriendo";
  reservedAt: Date;
  stageAt: Date;
}

export async function loadDemoDeals(user: CurrentUser, owners: Map<string, OwnerInfo>, ids: { compliance: string; finance: string }, usedRuts: Set<string>) {
  const r = rng(20261113);
  const now = Date.now();
  const tenantId = user.tenantId;
  const closedProps = await prisma.property.findMany({
    where: { tenantId, status: { in: ["vendida", "arrendada"] } },
    select: { id: true, operation: true, price: true, currency: true, brokerId: true },
  });
  const leads = await prisma.lead.findMany({
    where: { tenantId, isDemo: true, kind: { in: ["comprador", "arrendatario"] }, stage: { in: ["ganado", "propuesta"] }, propertyId: { not: null } },
    include: { property: { select: { id: true, operation: true, price: true, currency: true, brokerId: true } } },
    orderBy: { stageChangedAt: "asc" },
  });
  const last = await prisma.deal.findFirst({ where: { tenantId }, orderBy: { number: "desc" }, select: { number: true } });
  let number = (last?.number ?? 2400) + 1;

  const clients: Prisma.ClientCreateManyInput[] = [];
  const deals: Prisma.DealCreateManyInput[] = [];
  const parties: Prisma.DealPartyCreateManyInput[] = [];
  const kyc: Prisma.KycCaseCreateManyInput[] = [];
  const plan: Planned[] = [];

  type Source = { prop: (typeof closedProps)[number]; leadId: string | null; leadName: string | null; leadPhone: string | null; brokerId: string; stage: DealStage; reservedAt: Date; stageAt: Date };
  const sources: Source[] = [];
  // Historial cerrado, repartido en los últimos 12 meses.
  closedProps.forEach((p, i) => {
    const closedAgo = 8 + Math.floor(((i + r()) / closedProps.length) * 330);
    const stageAt = new Date(now - closedAgo * DAY);
    const reservedAt = new Date(stageAt.getTime() - (p.operation === "venta" ? 45 + r() * 30 : 12 + r() * 12) * DAY);
    sources.push({ prop: p, leadId: null, leadName: null, leadPhone: null, brokerId: p.brokerId, stage: "cerrada", reservedAt, stageAt });
  });
  // En curso, desde los leads.
  const seen = new Set<string>();
  let offers = 0;
  leads
    .filter((l) => l.property && owners.has(l.property.id) && !seen.has(l.property.id) && seen.add(l.property.id))
    .forEach((l, i) => {
      const p = l.property!;
      const won = l.stage === "ganado";
      const stage: DealStage = !won ? (offers++ === 2 ? "caida" : "reserva") : i % 3 === 0 ? "escritura" : p.operation === "venta" ? "promesa" : "contrato";
      const reservedAt = new Date(Math.min(l.stageChangedAt.getTime(), now - (won ? 28 : 6) * DAY));
      const stageAt = new Date(Math.min(now - DAY, reservedAt.getTime() + (stage === "reserva" ? 0 : stage === "escritura" ? 24 : 12) * DAY));
      sources.push({ prop: p, leadId: l.id, leadName: l.name, leadPhone: l.phone, brokerId: l.brokerId ?? p.brokerId, stage, reservedAt, stageAt });
    });

  sources.forEach((s, i) => {
    const p = s.prop;
    const owner = owners.get(p.id);
    if (!owner) return;
    const op = p.operation;
    const id = randomUUID();
    const buyer = demoPerson(r, usedRuts);
    if (s.leadName && s.leadName.split(" ").length >= 2) buyer.name = `${s.leadName} ${buyer.name.split(" ").pop()}`;
    const buyerId = randomUUID();
    clients.push({ id: buyerId, tenantId, ...buyer, phone: s.leadPhone ?? buyer.phone, isDemo: true, createdAt: s.reservedAt });
    deals.push({
      id, tenantId, number: number++, propertyId: p.id, leadId: s.leadId, operation: op, stage: s.stage, price: p.price, currency: p.currency,
      commissionOwner: op === "venta" ? 2 : 0.5, commissionClient: op === "venta" ? 2 : 0.5, brokerId: s.brokerId, reservedAt: s.reservedAt, stageChangedAt: s.stageAt,
      closedAt: s.stage === "cerrada" ? s.stageAt : null, lostReason: s.stage === "caida" ? "El comprador no obtuvo el crédito hipotecario" : null, isDemo: true, createdAt: s.reservedAt,
    });
    parties.push({ dealId: id, clientId: owner.clientId, role: op === "venta" ? "vendedor" : "arrendador" });
    parties.push({ dealId: id, clientId: buyerId, role: op === "venta" ? "comprador" : "arrendatario" });

    const amountUf = p.currency === "UF" ? Number(p.price) : Number(p.price) / 41_316;
    const pep = s.stage === "reserva" && i % 4 === 1;
    const risk = kycRisk({ pep, foreign: buyer.nationality !== "chilena", juridica: false, amountUf: op === "venta" ? amountUf : 0, cashOrigin: false });
    const inProgress: ("pendiente" | "enviado" | "en_revision")[] = ["en_revision", "enviado", "en_revision", "pendiente"];
    const status = s.stage === "reserva" ? inProgress[i % inProgress.length]! : s.stage === "caida" ? "rechazado" : "aprobado";
    const started = status !== "pendiente";
    const submitted = started && status !== "enviado";
    const reviewed = status === "aprobado" || status === "rechazado";
    kyc.push({
      tenantId, clientId: buyerId, dealId: id, status, token: randomBytes(18).toString("base64url"), provider: "simulado",
      providerRef: submitted ? `SIM-${Math.floor(r() * 900000 + 100000)}` : null,
      identityVerified: submitted ? true : null, livenessPassed: submitted ? true : null, listsClear: submitted ? true : null,
      pep: submitted ? pep : null, pepRole: pep && submitted ? "Concejal(a) municipal" : null,
      fundsOrigin: op === "venta" && submitted ? FUNDS[Math.floor(r() * FUNDS.length)]! : null,
      riskScore: submitted ? risk.score : null, riskLevel: submitted ? risk.level : null,
      sentAt: started ? new Date(s.reservedAt.getTime() + DAY) : null, submittedAt: submitted ? new Date(s.reservedAt.getTime() + 2 * DAY) : null,
      reviewedAt: reviewed ? new Date(s.reservedAt.getTime() + 4 * DAY) : null, reviewerId: reviewed ? ids.compliance : null,
      reviewNote: status === "rechazado" ? "No se pudo acreditar el origen de los fondos." : reviewed ? (risk.level === "alto" ? "Debida diligencia reforzada completa." : "Sin observaciones.") : null,
      expiresAt: new Date(s.reservedAt.getTime() + 365 * DAY), isDemo: true, createdAt: s.reservedAt,
    });
    plan.push({ id, stage: s.stage, operation: op, reservedAt: s.reservedAt, stageAt: s.stageAt });
  });

  await prisma.client.createMany({ data: clients });
  await prisma.deal.createMany({ data: deals });
  await prisma.dealParty.createMany({ data: parties });
  await prisma.kycCase.createMany({ data: kyc });

  // Contratos: solo con todas las partes con KYC aprobado (las reservas pendientes quedan bloqueadas, como en producción).
  let contracts = 0;
  for (const d of plan) {
    if (d.stage === "reserva" || d.stage === "caida") continue;
    const steps = [
      { kind: "carta_oferta" as const, at: new Date(d.reservedAt.getTime() + 5 * DAY) },
      { kind: d.operation === "venta" ? ("minuta_promesa" as const) : ("contrato_arriendo" as const), at: new Date(d.reservedAt.getTime() + (d.operation === "venta" ? 15 : 8) * DAY) },
    ];
    for (const s of steps) {
      const res = await generateDealContract(tenantId, d.id, s.kind, s.at);
      if (!res.ok) {
        console.warn(`Contrato demo no generado (${s.kind}): ${res.problems.join(" ")}`);
        continue;
      }
      contracts++;
      const signed = s.kind === "carta_oferta" || d.stage !== "promesa";
      await prisma.contract.update({ where: { id: res.id }, data: { status: signed ? "firmado" : "enviado", sentAt: s.at, signedAt: signed ? new Date(s.at.getTime() + 2 * DAY) : null } });
    }
  }

  // Facturas de comisión a cada lado, desde la escritura o entrega.
  const billable = await prisma.deal.findMany({
    where: { tenantId, isDemo: true, stage: { in: ["escritura", "cerrada"] } },
    include: { parties: true, property: { select: { code: true } } },
  });
  const invoices: Prisma.InvoiceCreateManyInput[] = [];
  let folio = 1200;
  billable
    .sort((a, b) => (a.closedAt ?? a.stageChangedAt).getTime() - (b.closedAt ?? b.stageChangedAt).getTime())
    .forEach((d, i) => {
      const at = d.closedAt ?? d.stageChangedAt;
      const ago = (now - at.getTime()) / DAY;
      const uf = demoUfAt(at);
      for (const party of d.parties.filter((x) => x.role !== "codeudor")) {
        const ownerSide = party.role === "vendedor" || party.role === "arrendador";
        const net = commissionAmount(d.operation, Number(d.price), Number(ownerSide ? d.commissionOwner : d.commissionClient));
        const amounts = invoiceAmounts(d.currency === "UF" ? net * uf : net);
        const status = ago < 6 ? (ownerSide ? "borrador" : "aprobada") : ago < 32 ? "emitida" : ago < 75 && i % 4 === 0 ? "vencida" : "pagada";
        const issued = status !== "borrador" && status !== "aprobada";
        invoices.push({
          tenantId, kind: "factura", status, folio: issued ? ++folio : null, dealId: d.id, clientId: party.clientId,
          concept: `Comisión de corretaje ${d.operation === "venta" ? "por compraventa" : "por arrendamiento"} de la propiedad ${d.property.code}, operación N° ${d.number}`,
          amountUf: d.currency === "UF" ? Math.round(net * 100) / 100 : null, ufValue: d.currency === "UF" ? uf : null, ...amounts, provider: "simulado",
          approvedById: status === "borrador" ? null : ids.finance, approvedAt: status === "borrador" ? null : at,
          issuedAt: issued ? at : null, dueAt: issued ? new Date(at.getTime() + 30 * DAY) : null,
          paidAt: status === "pagada" ? new Date(at.getTime() + Math.floor(6 + r() * 20) * DAY) : null, isDemo: true, createdAt: at,
        });
      }
    });
  // Una nota de crédito por un descuento acordado en una comisión ya pagada.
  const paid = invoices.find((x) => x.status === "pagada");
  if (paid) {
    const credit = invoiceAmounts(Math.round(paid.netClp * 0.1));
    invoices.push({ ...paid, kind: "nota_credito", status: "emitida", folio: ++folio, concept: `Nota de crédito: descuento acordado del 10 % sobre la factura folio ${paid.folio}`, amountUf: null, ...credit, paidAt: null, issuedAt: new Date(new Date(paid.issuedAt!).getTime() + 9 * DAY) });
  }
  await prisma.invoice.createMany({ data: invoices });
  return { deals: deals.length, contracts, invoices: invoices.length };
}
