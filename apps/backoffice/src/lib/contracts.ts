import "server-only";
import { formatDate, formatPrice, formatRut, longDate, renderTemplate, type ContractKind } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";

// Generación de contratos desde plantillas (docs/contratos.md). Reglas que no se negocian:
// - solo con plantilla aprobada por el abogado (las de demostración solo sirven a registros de demostración),
// - solo con KYC aprobado de todas las partes que firman,
// - solo con los datos legales de la propiedad confirmados y el propietario inscrito igual a quien firma,
// - los datos legales salen de los certificados (PropertyLegal), no de la ficha comercial.

export const DEMO_COMPANY = {
  razon_social: "Bull Haus Intermediación y Gestión Inmobiliaria (datos de demostración)",
  rut: "RUT por confirmar",
  domicilio: "Las Condes, Santiago",
  representante: { nombre: "Representante legal por confirmar", rut: "RUT por confirmar" },
  url_privacidad: "https://bullhaus-web.vercel.app/privacidad",
  email_privacidad: "privacidad@bullhaus.cl",
};

type ClientRow = Prisma.ClientGetPayload<{ include: { kycCases: true } }>;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function approvedKyc(c: ClientRow) {
  return c.kycCases.filter((k) => k.status === "aprobado").sort((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0))[0];
}

function person(c: ClientRow) {
  const k = approvedKyc(c);
  const natural = c.kind === "natural";
  return {
    es_persona_natural: natural,
    nombre_completo: c.name,
    nombre_o_razon_social: c.name,
    razon_social: natural ? undefined : c.name,
    nacionalidad: c.nationality,
    estado_civil: c.maritalStatus,
    regimen_patrimonial: c.maritalRegime ?? "",
    profesion: c.profession,
    rut: formatRut(c.rut),
    domicilio: c.address,
    email: c.email,
    telefono: c.phone,
    requiere_conyuge: c.maritalRegime?.includes("sociedad conyugal") ? "Sí" : "No",
    representante: { nombre_completo: "No aplica", rut: "—", personeria: "—" },
    kyc: { aprobado_el: k?.reviewedAt ? formatDate(k.reviewedAt) : undefined, nivel: k?.riskLevel ?? undefined, origen_fondos: k?.fundsOrigin ?? "No aplica" },
  };
}

function propertyData(p: Prisma.PropertyGetPayload<{ include: { legal: true } }>) {
  const l = p.legal!;
  const parking = p.parking ?? 0;
  const storage = p.storage ?? 0;
  return {
    codigo: p.code,
    direccion: l.address,
    unidad: l.unit ?? "",
    comuna: p.comuna,
    region: l.region,
    fojas: l.fojas,
    numero: l.registryNumber,
    anio: l.registryYear,
    conservador: l.conservador,
    rol_avaluo: l.rolAvaluo,
    avaluo_fiscal_texto: formatPrice(l.avaluoFiscalClp, "CLP"),
    superficie_titulo_m2: l.titleM2 ? Number(l.titleM2).toLocaleString("es-CL") : "según título",
    propietarios_inscritos: l.registeredOwners,
    gravamenes_texto: l.liens ?? "",
    prohibiciones_texto: "No registra",
    fecha_certificado_gravamenes: l.liensCertDate ? formatDate(l.liensCertDate) : undefined,
    deslindes: l.boundaries ?? "Según título",
    deuda_contribuciones_texto: "Sin deuda según certificado de Tesorería",
    deuda_gastos_comunes_texto: "Sin deuda según certificado de la administración",
    recepcion_final_texto: "Con recepción final",
    no_expropiacion_texto: "No afecta a expropiación",
    estacionamientos_roles: parking > 0,
    estacionamientos_texto: parking > 0 ? `${parking} estacionamiento${parking > 1 ? "s" : ""}` : "",
    bodegas_roles: storage > 0,
    bodegas_texto: storage > 0 ? `${storage} bodega${storage > 1 ? "s" : ""}` : "",
    copropiedad: p.type === "departamento" || p.type === "oficina",
  };
}

export interface GenerateResult {
  ok: boolean;
  id?: string;
  problems: string[];
}

async function pickTemplate(tenantId: string, kind: ContractKind, isDemo: boolean) {
  return prisma.contractTemplate.findFirst({
    where: { tenantId, kind, isDemo, approvedByLawyer: { not: null } },
    orderBy: { createdAt: "desc" },
  });
}

async function nextNumber(tenantId: string, tx: Prisma.TransactionClient = prisma) {
  const last = await tx.contract.findFirst({ where: { tenantId }, orderBy: { number: "desc" }, select: { number: true } });
  return (last?.number ?? 1000) + 1;
}

function commonChecks(p: { legal: { confirmedAt: Date | null; registeredOwners: string } | null }, signers: ClientRow[], ownerSigners: ClientRow[]): string[] {
  const problems: string[] = [];
  if (!p.legal) problems.push("Faltan los datos legales de la propiedad (certificados).");
  else if (!p.legal.confirmedAt) problems.push("Los datos legales de la propiedad no están confirmados por una persona.");
  for (const c of signers) if (!approvedKyc(c)) problems.push(`Falta KYC aprobado de ${c.name}.`);
  if (p.legal) {
    const inscribed = norm(p.legal.registeredOwners);
    for (const o of ownerSigners) if (!inscribed.includes(norm(o.name))) problems.push(`${o.name} no figura como propietario inscrito en el certificado de dominio.`);
  }
  return problems;
}

/** Orden de corretaje de un mandato. */
export async function generateMandateContract(tenantId: string, mandateId: string, now = new Date()): Promise<GenerateResult> {
  const m = await prisma.mandate.findUnique({
    where: { id: mandateId },
    include: { owner: { include: { kycCases: true } }, property: { include: { legal: true } } },
  });
  if (!m || m.property.tenantId !== tenantId) return { ok: false, problems: ["Mandato no encontrado."] };
  const template = await pickTemplate(tenantId, "orden_corretaje", m.isDemo);
  const problems = template ? [] : ["No hay una plantilla de orden de corretaje aprobada por el abogado."];
  problems.push(...commonChecks(m.property, [m.owner], [m.owner]));
  if (problems.length) return { ok: false, problems };

  const p = m.property;
  const venta = p.operation === "venta";
  const price = formatPrice(Number(p.price), p.currency);
  const plazo = Math.max(30, Math.round((m.expiresAt.getTime() - m.signedAt.getTime()) / 86_400_000));
  const number = await nextNumber(tenantId);
  const data = {
    contrato: { numero: number, ciudad: "Santiago", fecha_larga: longDate(m.signedAt), comuna_jurisdiccion: "Las Condes" },
    empresa: DEMO_COMPANY,
    propietarios: [person(m.owner)],
    propiedad: propertyData(p),
    mandato: {
      exclusivo: m.exclusive,
      operacion_texto: venta ? "VENTA" : "ARRIENDO",
      operacion_texto_minuscula: venta ? "venta" : "arrendamiento",
      es_venta: venta,
      es_arriendo: !venta,
      precio_texto: price,
      renta_texto: price,
      gastos_comunes_incluidos: false,
      garantia_texto: "un mes de renta",
      plazo_arriendo_texto: "un año, renovable",
      comision_texto: venta ? `${Number(m.commissionPct).toLocaleString("es-CL")} % del precio de venta` : `${Number(m.commissionPct).toLocaleString("es-CL")} % de un mes de renta`,
      comision_mas_iva: true,
      devengo_texto: venta ? "al firmarse la escritura de compraventa" : "al firmarse el contrato de arrendamiento",
      dias_proteccion: 90,
      plazo_dias: plazo,
      renovacion_automatica: true,
      aviso_termino_dias: 15,
    },
    clausulas_especiales: [],
  };
  const r = renderTemplate(template!.body, data);
  if (r.missing.length) return { ok: false, problems: [`La plantilla pide datos que faltan: ${r.missing.join(", ")}.`] };
  const c = await prisma.contract.create({
    data: {
      tenantId, number, kind: "orden_corretaje", status: m.isDemo ? "firmado" : "borrador", propertyId: p.id, mandateId: m.id, templateId: template!.id,
      data: data as Prisma.InputJsonValue, body: r.text, isDemo: m.isDemo, sentAt: m.isDemo ? m.signedAt : null, signedAt: m.isDemo ? m.signedAt : null, createdAt: m.isDemo ? m.signedAt : now,
    },
  });
  return { ok: true, id: c.id, problems: [] };
}

/** Carta oferta, contrato de arriendo o minuta de promesa de una operación. */
export async function generateDealContract(tenantId: string, dealId: string, kind: Exclude<ContractKind, "orden_corretaje">, at = new Date()): Promise<GenerateResult> {
  const d = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { property: { include: { legal: true, mandates: { orderBy: { signedAt: "desc" }, take: 1, include: { contracts: { select: { number: true } } } } } }, parties: { include: { client: { include: { kycCases: true } } } } },
  });
  if (!d || d.tenantId !== tenantId) return { ok: false, problems: ["Operación no encontrada."] };
  const template = await pickTemplate(tenantId, kind, d.isDemo);
  const owners = d.parties.filter((x) => x.role === "vendedor" || x.role === "arrendador").map((x) => x.client);
  const clients = d.parties.filter((x) => x.role === "comprador" || x.role === "arrendatario").map((x) => x.client);
  const cosigners = d.parties.filter((x) => x.role === "codeudor").map((x) => x.client);
  const problems = template ? [] : ["No hay una plantilla aprobada por el abogado para este documento."];
  problems.push(...commonChecks(d.property, [...owners, ...clients, ...cosigners], owners));
  if (problems.length) return { ok: false, problems };

  const broker = await prisma.user.findUnique({ where: { id: d.brokerId }, select: { name: true, email: true, phone: true } });
  const venta = d.operation === "venta";
  const price = formatPrice(Number(d.price), d.currency);
  const reserve = venta ? formatPrice(Math.round(Number(d.price) * 0.01), d.currency) : price;
  const number = await nextNumber(tenantId);
  const day = 86_400_000;
  const mandate = d.property.mandates[0];
  const main = clients[0]!;
  const mainKyc = approvedKyc(main);
  const data = {
    contrato: { numero: number, ciudad: "Santiago", fecha_larga: longDate(at), fecha: formatDate(at), texto_forma_firma: "Las partes firman este contrato ante notario." },
    empresa: DEMO_COMPANY,
    deal: { numero: d.number },
    corredor: { nombre: broker?.name, email: broker?.email, telefono: broker?.phone ?? "+56 2 2345 6789" },
    abogado: { nombre: "Abogado de las partes (por designar)", email: "por confirmar" },
    propietarios: owners.map(person),
    vendedores: owners.map(person),
    arrendadores: owners.map(person),
    oferentes: clients.map(person),
    compradores: clients.map(person),
    arrendatarios: clients.map(person),
    codeudores: cosigners.map(person),
    oferente_principal: { nombre_o_razon_social: main.name, rut: formatRut(main.rut), pep: mainKyc?.pep ?? false, pep_cargo: mainKyc?.pepRole ?? "" },
    kyc: { aprobado_el: mainKyc?.reviewedAt ? formatDate(mainKyc.reviewedAt) : undefined, nivel: mainKyc?.riskLevel, origen_fondos: mainKyc?.fundsOrigin ?? "No aplica" },
    propiedad: propertyData(d.property),
    mandato: { numero: mandate?.contracts[0]?.number ?? "s/n", firmado_el: mandate ? formatDate(mandate.signedAt) : "s/f" },
    comision: {
      vendedor_texto: `${Number(d.commissionOwner).toLocaleString("es-CL")} % del precio, más IVA`,
      comprador_texto: `${Number(d.commissionClient).toLocaleString("es-CL")} % del precio, más IVA`,
      devengo_texto: "al firmarse la escritura de compraventa",
    },
    docs: {
      dominio_vigente: { fecha: formatDate(new Date(at.getTime() - 12 * day)) },
      hipotecas_gravamenes: { fecha: formatDate(new Date(at.getTime() - 12 * day)) },
      avaluo_fiscal: { fecha: formatDate(new Date(at.getTime() - 20 * day)) },
      deuda_contribuciones: { fecha: formatDate(new Date(at.getTime() - 10 * day)) },
      deuda_gastos_comunes: { fecha: formatDate(new Date(at.getTime() - 8 * day)) },
      numero: { fecha: formatDate(new Date(at.getTime() - 30 * day)) },
      faltantes_texto: "Ninguno",
    },
    oferta: {
      numero: `${d.number}-1`,
      es_venta: venta,
      precio_texto: price,
      renta_texto: price,
      reserva_texto: reserve,
      reserva_medio: "transferencia a la cuenta de Bull Haus",
      forma_pago_texto: venta ? "pie con recursos propios y saldo con crédito hipotecario" : "renta mensual por transferencia",
      con_credito: venta,
      banco: "banco a elección del comprador",
      credito_preaprobado: venta,
      plazo_credito_dias: 45,
      credito_texto: "Crédito hipotecario preaprobado",
      ejecutivo_banco: "por informar",
      fecha_promesa: formatDate(new Date(d.reservedAt.getTime() + 15 * day)),
      fecha_escritura: formatDate(new Date(d.reservedAt.getTime() + 60 * day)),
      fecha_inicio: formatDate(new Date(d.reservedAt.getTime() + 10 * day)),
      plazo_texto: "un año",
      garantia_texto: `un mes de renta (${price})`,
      codeudor: cosigners[0] ? { nombre_completo: cosigners[0].name, rut: formatRut(cosigners[0].rut) } : null,
      condiciones: "",
      vigencia_dias: 5,
      dias_devolucion: 10,
      imputacion_reserva_texto: "La reserva se imputa al pie de la promesa.",
      desistimiento_texto: "Si el oferente desiste sin causa justificada, la reserva queda a favor del propietario.",
      origen_fondos: mainKyc?.fundsOrigin ?? "Ahorros y crédito hipotecario",
      aceptada_el: formatDate(new Date(d.reservedAt.getTime() + 2 * day)),
      alzamiento_texto: "No aplica",
      entrega_texto: "Material, al firmarse la escritura",
      pie_promesa_texto: formatPrice(Math.round(Number(d.price) * 0.1), d.currency),
    },
    arriendo: {
      renta_texto: price,
      renta_en_uf: d.currency === "UF",
      reajuste: d.currency === "CLP",
      reajuste_periodo_texto: "semestralmente según IPC",
      dia_pago: 5,
      cuenta_pago_texto: "la cuenta que indique el arrendador",
      garantia_texto: `un mes de renta (${price})`,
      dias_devolucion_garantia: 30,
      fecha_inicio: formatDate(new Date(d.reservedAt.getTime() + 10 * day)),
      plazo_texto: "un año",
      renovacion_automatica: true,
      periodo_renovacion_texto: "un año",
      aviso_no_renovacion_dias: 60,
      destino: "habitacional",
      amoblado: Boolean(d.property.furnished),
      mascotas: d.property.pets === "si",
      gastos_comunes_estimados: d.property.commonExpensesClp ? formatPrice(d.property.commonExpensesClp, "CLP") : "",
      otros_servicios: "",
      administracion: false,
      apoderado: null,
      permitir_visitas_ultimo_mes: true,
      aviso_visita_horas: 24,
      salida_anticipada: true,
      salida_anticipada_aviso_dias: 60,
      salida_anticipada_multa_texto: "un mes de renta",
      interes_mora_texto: "el interés máximo convencional",
      comision_arrendador_texto: `${Number(d.commissionOwner).toLocaleString("es-CL")} mes de renta, más IVA`,
      comision_arrendatario_texto: `${Number(d.commissionClient).toLocaleString("es-CL")} mes de renta, más IVA`,
      comision_mas_iva: true,
    },
    clausulas_especiales: [],
  };
  if (kind === "minuta_promesa") {
    // La minuta es una tabla para el abogado: lo que no aplica se escribe, no se deja en blanco.
    for (const p of [...data.vendedores, ...data.compradores]) p.regimen_patrimonial ||= "No aplica";
    data.propiedad.estacionamientos_texto ||= "No incluye";
    data.propiedad.bodegas_texto ||= "No incluye";
    data.propiedad.unidad ||= "(sin unidad)";
    data.propiedad.gravamenes_texto ||= "No registra";
    data.oferta.condiciones ||= "Ninguna";
  }
  const r = renderTemplate(template!.body, data);
  if (r.missing.length) return { ok: false, problems: [`La plantilla pide datos que faltan: ${r.missing.join(", ")}.`] };
  const c = await prisma.contract.create({
    data: { tenantId, number, kind, propertyId: d.propertyId, dealId: d.id, templateId: template!.id, data: data as Prisma.InputJsonValue, body: r.text, isDemo: d.isDemo, createdAt: at },
  });
  return { ok: true, id: c.id, problems: [] };
}
