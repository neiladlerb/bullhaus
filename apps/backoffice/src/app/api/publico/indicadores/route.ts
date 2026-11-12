import { PUBLIC_MARKET_MIN_DEALS } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { marketSummary } from "@/lib/market";
import { json, publicTenantId } from "@/lib/public-api";

// Cifras para la web pública. Solo operaciones reales (nunca las de demostración) y solo cuando hay
// suficientes para que el promedio diga algo; si no, la web no muestra el número.
export async function GET() {
  const tenantId = await publicTenantId();
  if (!tenantId) return json({ venta: null, arriendo: null, closedLast12m: 0 });
  const since = new Date(Date.now() - 365 * 86_400_000);
  const [s, closed] = await Promise.all([
    marketSummary(tenantId, { realOnly: true, since }),
    prisma.deal.count({ where: { tenantId, isDemo: false, stage: "cerrada", closedAt: { gte: since } } }),
  ]);
  const pick = (m: typeof s.venta) => (m.count >= PUBLIC_MARKET_MIN_DEALS && m.avgDays !== null ? { avgDays: m.avgDays, count: m.count } : null);
  return json({ venta: pick(s.venta), arriendo: pick(s.arriendo), closedLast12m: closed });
}
