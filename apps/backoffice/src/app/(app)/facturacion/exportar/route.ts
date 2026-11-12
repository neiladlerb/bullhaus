import { can, formatDate, INVOICE_STATUS_LABELS } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { getCurrentUser } from "@/lib/auth";

// Exportación para la contabilidad: una fila por documento, separada por punto y coma (Excel en español).
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "billing.read")) return new Response("Sin permiso", { status: 403 });
  const rows = await prisma.invoice.findMany({ where: { tenantId: user.tenantId, folio: { not: null } }, orderBy: { folio: "asc" }, include: { client: { select: { name: true, rut: true } }, deal: { select: { number: true } } } });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["Tipo", "Folio", "Fecha emisión", "RUT cliente", "Cliente", "Operación", "Neto", "IVA", "Total", "Estado", "Fecha pago", "Demo"].join(";"),
    ...rows.map((i) =>
      [
        i.kind === "nota_credito" ? "Nota de crédito" : "Factura",
        i.folio,
        i.issuedAt ? formatDate(i.issuedAt) : "",
        i.client.rut,
        i.client.name,
        i.deal?.number ?? "",
        i.netClp,
        i.ivaClp,
        i.totalClp,
        INVOICE_STATUS_LABELS[i.status],
        i.paidAt ? formatDate(i.paidAt) : "",
        i.isDemo ? "sí" : "no",
      ].map(esc).join(";"),
    ),
  ];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="facturas-bullhaus.csv"` },
  });
}
