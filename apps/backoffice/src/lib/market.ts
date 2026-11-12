import "server-only";
import { marketTime, marketTimeByQuarter, type MarketDeal } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";

// Días en el mercado: de la salida al mercado (la de la operación o, si falta, la de la ficha)
// a la reserva. `realOnly` deja fuera los datos de demostración (lo que se publica en la web).
export async function loadMarketDeals(tenantId: string, opts: { realOnly?: boolean; since?: Date } = {}): Promise<MarketDeal[]> {
  const rows = await prisma.deal.findMany({
    where: { tenantId, ...(opts.realOnly ? { isDemo: false } : {}), ...(opts.since ? { reservedAt: { gte: opts.since } } : {}) },
    select: { operation: true, stage: true, listedAt: true, reservedAt: true, closedAt: true, property: { select: { listedAt: true } } },
  });
  return rows.map((d) => ({ operation: d.operation, stage: d.stage, listedAt: d.listedAt ?? d.property.listedAt, reservedAt: d.reservedAt, closedAt: d.closedAt }));
}

export async function marketSummary(tenantId: string, opts: { realOnly?: boolean; since?: Date } = {}) {
  const deals = await loadMarketDeals(tenantId, opts);
  return {
    venta: marketTime(deals, "venta"),
    arriendo: marketTime(deals, "arriendo"),
    trend: { venta: marketTimeByQuarter(deals, "venta"), arriendo: marketTimeByQuarter(deals, "arriendo") },
  };
}
