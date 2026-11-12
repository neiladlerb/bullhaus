import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { CONTRACT_TEMPLATE_SOURCES, rutCheckDigit, type ContractKind } from "@bullhaus/core";
import { hashPassword } from "@bullhaus/core/server";
import { prisma, type Prisma } from "@bullhaus/db";
import type { CurrentUser } from "../auth";
import { generateMandateContract } from "../contracts";
import { FIRST, LAST, rng } from "./leads";

// Propietarios, datos legales, mandatos y órdenes de corretaje de demostración para cada
// propiedad de la cartera. Personas, RUT, fojas y roles son ficticios y van marcados isDemo.

export const DAY = 86_400_000;

const NATIONALITY = ["chilena", "chilena", "chilena", "chilena", "argentina", "española"];
const MARITAL: [string, string][] = [
  ["casado(a)", "separación total de bienes"],
  ["casado(a)", "sociedad conyugal"],
  ["soltero(a)", ""],
  ["divorciado(a)", ""],
  ["casado(a)", "participación en los gananciales"],
  ["viudo(a)", ""],
];
const PROFESSIONS = ["ingeniero(a) comercial", "abogado(a)", "médico(a)", "arquitecto(a)", "empresario(a)", "profesor(a)", "ingeniero(a) civil", "diseñador(a)", "contador(a) auditor(a)", "psicólogo(a)"];
const STREETS = ["Calle Demostración", "Avenida Ejemplo", "Pasaje Ficticio", "Camino de Prueba"];
const CONSERVADOR: Record<string, string> = { "Viña del Mar": "Viña del Mar", Zapallar: "La Ligua", Papudo: "La Ligua", Cachagua: "La Ligua", Maitencillo: "Puchuncaví" };
const COAST = new Set(["Viña del Mar", "Zapallar", "Papudo", "Cachagua", "Maitencillo", "Concón", "Puchuncaví"]);

/** RUT ficticio válido (módulo 11) en un rango alto que no se confunde con uno real conocido. */
export function demoRut(r: () => number): string {
  const body = String(9_000_000 + Math.floor(r() * 26_000_000));
  return `${body}${rutCheckDigit(body)}`;
}

export function demoPerson(r: () => number, usedRuts: Set<string>) {
  let rut = demoRut(r);
  while (usedRuts.has(rut)) rut = demoRut(r);
  usedRuts.add(rut);
  const first = FIRST[Math.floor(r() * FIRST.length)]!;
  const last1 = LAST[Math.floor(r() * LAST.length)]!;
  const last2 = LAST[Math.floor(r() * LAST.length)]!;
  const [maritalStatus, maritalRegime] = MARITAL[Math.floor(r() * MARITAL.length)]!;
  const slug = `${first}.${last1}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "").toLowerCase();
  return {
    rut,
    name: `${first} ${last1} ${last2}`,
    email: `${slug}${Math.floor(r() * 90 + 10)}@demo.bullhaus.cl`,
    phone: `+56 9 ${String(50000000 + Math.floor(r() * 49999999)).replace(/(\d{4})(\d{4})/, "$1 $2")}`,
    nationality: NATIONALITY[Math.floor(r() * NATIONALITY.length)]!,
    maritalStatus,
    maritalRegime: maritalRegime || null,
    profession: PROFESSIONS[Math.floor(r() * PROFESSIONS.length)]!,
    address: `${STREETS[Math.floor(r() * STREETS.length)]} ${Math.floor(r() * 9000 + 100)}, Las Condes (demo)`,
  };
}

/** Plantillas de demostración: las de docs/contratos, marcadas sin aprobación real de abogado. */
export async function ensureDemoTemplates(tenantId: string): Promise<void> {
  const existing = await prisma.contractTemplate.count({ where: { tenantId, isDemo: true } });
  if (existing) return;
  await prisma.contractTemplate.createMany({
    data: (Object.keys(CONTRACT_TEMPLATE_SOURCES) as ContractKind[]).map((kind) => ({
      tenantId,
      kind,
      version: CONTRACT_TEMPLATE_SOURCES[kind].version,
      body: CONTRACT_TEMPLATE_SOURCES[kind].body,
      approvedByLawyer: "Demostración (sin revisión de abogado)",
      approvedAt: new Date(),
      isDemo: true,
    })),
  });
}

/** Usuarios de Cumplimiento y Finanzas para mostrar la separación de funciones. Sin acceso hasta restablecer su contraseña. */
export async function ensureDemoUsers(tenantId: string): Promise<{ compliance: string; finance: string }> {
  const specs = [
    { key: "compliance" as const, name: "Paula Ríos (demo)", email: "cumplimiento.demo@bullhaus.local", role: "cumplimiento" as const },
    { key: "finance" as const, name: "Andrés Vidal (demo)", email: "finanzas.demo@bullhaus.local", role: "finanzas" as const },
  ];
  const out = { compliance: "", finance: "" };
  for (const s of specs) {
    const u = await prisma.user.upsert({
      where: { tenantId_email: { tenantId, email: s.email } },
      update: {},
      create: { tenantId, name: s.name, email: s.email, role: s.role, isDemo: true, mustChangePassword: true, passwordHash: await hashPassword(randomBytes(24).toString("base64url")) },
    });
    out[s.key] = u.id;
  }
  return out;
}

export interface OwnerInfo {
  clientId: string;
  mandateId: string;
  name: string;
}

/** Propietario, KYC aprobado, certificados, datos legales confirmados, mandato y orden de corretaje por propiedad. */
export async function loadDemoLegal(user: CurrentUser, complianceId: string, usedRuts: Set<string>): Promise<{ owners: Map<string, OwnerInfo>; contracts: number }> {
  const r = rng(20261112);
  const now = Date.now();
  await ensureDemoTemplates(user.tenantId);
  const props = await prisma.property.findMany({
    where: { tenantId: user.tenantId },
    select: { id: true, code: true, operation: true, comuna: true, type: true, m2Useful: true, legal: { select: { id: true } }, mandates: { where: { isDemo: false }, select: { id: true } } },
    orderBy: { code: "asc" },
  });

  const clients: Prisma.ClientCreateManyInput[] = [];
  const kyc: Prisma.KycCaseCreateManyInput[] = [];
  const legal: Prisma.PropertyLegalCreateManyInput[] = [];
  const docs: Prisma.PropertyDocumentCreateManyInput[] = [];
  const mandates: Prisma.MandateCreateManyInput[] = [];
  const owners = new Map<string, OwnerInfo>();

  for (const p of props) {
    if (p.mandates.length) continue; // la propiedad ya tiene un mandato real: no se toca
    const person = demoPerson(r, usedRuts);
    const clientId = randomUUID();
    const mandateId = randomUUID();
    const signedAt = new Date(now - Math.floor(12 + r() * 160) * DAY);
    clients.push({ id: clientId, tenantId: user.tenantId, kind: "natural", ...person, isDemo: true, createdAt: new Date(signedAt.getTime() - 20 * DAY) });
    kyc.push({
      tenantId: user.tenantId, clientId, status: "aprobado", token: randomBytes(18).toString("base64url"), provider: "simulado", providerRef: `SIM-${Math.floor(r() * 900000 + 100000)}`,
      identityVerified: true, livenessPassed: true, listsClear: true, pep: false, fundsOrigin: "No aplica (propietario)", riskScore: 10 + Math.floor(r() * 15), riskLevel: "bajo",
      sentAt: new Date(signedAt.getTime() - 9 * DAY), submittedAt: new Date(signedAt.getTime() - 8 * DAY), reviewedAt: new Date(signedAt.getTime() - 6 * DAY), reviewerId: complianceId,
      reviewNote: "Identidad y listas sin observaciones.", expiresAt: new Date(signedAt.getTime() + 365 * DAY), isDemo: true, createdAt: new Date(signedAt.getTime() - 10 * DAY),
    });
    if (!p.legal) {
      const year = 1998 + Math.floor(r() * 26);
      const certDate = new Date(signedAt.getTime() - 15 * DAY);
      const unit = p.type === "departamento" || p.type === "oficina" ? `departamento ${Math.floor(r() * 18 + 2)}0${Math.floor(r() * 4 + 1)}` : null;
      legal.push({
        propertyId: p.id,
        address: `${STREETS[Math.floor(r() * STREETS.length)]} ${Math.floor(r() * 9000 + 100)} (dirección de demostración)`,
        unit,
        region: COAST.has(p.comuna) ? "de Valparaíso" : "Metropolitana de Santiago",
        fojas: String(Math.floor(r() * 90000 + 1000)),
        registryNumber: String(Math.floor(r() * 90000 + 1000)),
        registryYear: year,
        conservador: CONSERVADOR[p.comuna] ?? "Santiago",
        rolAvaluo: `${Math.floor(r() * 9000 + 100)}-${Math.floor(r() * 300 + 1)}`,
        avaluoFiscalClp: Math.round((p.m2Useful ? Number(p.m2Useful) : 120) * (900_000 + r() * 1_400_000)),
        titleM2: p.m2Useful,
        registeredOwners: person.name,
        liens: r() < 0.3 ? "Hipoteca a favor de un banco, que se alzará con el producto de la venta" : null,
        liensCertDate: certDate,
        boundaries: "Según el título de dominio inscrito",
        confirmedAt: new Date(signedAt.getTime() - 3 * DAY),
        confirmedById: user.id,
        isDemo: true,
      });
      for (const kind of ["dominio_vigente", "hipotecas_gravamenes", "avaluo_fiscal", "deuda_contribuciones", ...(p.operation === "venta" ? ["titulo", "recepcion_final", "numero"] : [])]) {
        docs.push({ propertyId: p.id, kind, issuedAt: new Date(certDate.getTime() - Math.floor(r() * 10) * DAY), isDemo: true });
      }
    }
    const venta = p.operation === "venta";
    mandates.push({
      id: mandateId, propertyId: p.id, ownerClientId: clientId, exclusive: r() < 0.6, commissionPct: venta ? 2 : 50,
      commissionTerms: venta ? "2 % más IVA al firmarse la escritura" : "50 % de un mes de renta más IVA", signedAt, expiresAt: new Date(signedAt.getTime() + 180 * DAY),
      status: "vigente", isDemo: true, createdAt: signedAt,
    });
    owners.set(p.id, { clientId, mandateId, name: person.name });
  }

  await prisma.client.createMany({ data: clients });
  await prisma.kycCase.createMany({ data: kyc });
  await prisma.propertyLegal.createMany({ data: legal });
  await prisma.propertyDocument.createMany({ data: docs });
  await prisma.mandate.createMany({ data: mandates });

  let contracts = 0;
  for (const m of mandates) {
    const res = await generateMandateContract(user.tenantId, m.id!);
    if (res.ok) contracts++;
    else console.warn(`Orden de corretaje demo no generada (${m.propertyId}): ${res.problems.join(" ")}`);
  }
  return { owners, contracts };
}
