import "server-only";
import { prisma } from "@bullhaus/db";
import type { CurrentUser } from "../auth";
import { audit } from "../audit";
import { loadDemoConversations } from "./agents";
import { loadDemoDeals } from "./deals";
import { clearDemoLeads, loadDemoLeads } from "./leads";
import { ensureDemoUsers, loadDemoLegal } from "./legal";
import { loadDemoOutreach } from "./outreach";
import { loadDemoSocial } from "./social";

// Punto único de la demostración. Todo lo que se crea aquí lleva isDemo = true y se borra con
// clearDemoData; ningún registro real se modifica. Ver docs/demo.md.

export interface DemoSummary {
  leads: number;
  campaigns: number;
  contracts: number;
  deals: number;
  invoices: number;
  conversations: number;
  posts: number;
  brochures: number;
  tasks: number;
}

export async function loadDemoData(user: CurrentUser): Promise<DemoSummary> {
  await clearDemoData(user, { keepUsers: true });
  const ids = await ensureDemoUsers(user.tenantId);
  const usedRuts = new Set((await prisma.client.findMany({ where: { tenantId: user.tenantId }, select: { rut: true } })).map((c) => c.rut));
  const { leads, campaigns } = await loadDemoLeads(user);
  const legal = await loadDemoLegal(user, ids.compliance, usedRuts);
  const deals = await loadDemoDeals(user, legal.owners, ids, usedRuts);
  const conversations = await loadDemoConversations(user);
  const social = await loadDemoSocial(user);
  const outreach = await loadDemoOutreach(user);
  const summary = { leads, campaigns, contracts: legal.contracts + deals.contracts, deals: deals.deals, invoices: deals.invoices, conversations, posts: social.posts, brochures: outreach.brochures, tasks: outreach.tasks };
  await audit(user, "demo.load", "tenant", user.tenantId, { ...summary });
  return summary;
}

export async function hasDemoData(tenantId: string): Promise<boolean> {
  return (await prisma.lead.count({ where: { tenantId, isDemo: true } })) + (await prisma.mandate.count({ where: { isDemo: true, property: { tenantId } } })) > 0;
}

export async function clearDemoData(user: CurrentUser, opts: { keepUsers?: boolean } = {}): Promise<void> {
  const t = user.tenantId;
  // Orden: primero lo que depende de otros registros.
  await prisma.invoice.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.contract.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.kycCase.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.deal.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.mandate.deleteMany({ where: { isDemo: true, property: { tenantId: t } } });
  await prisma.propertyLegal.deleteMany({ where: { isDemo: true, property: { tenantId: t } } });
  await prisma.propertyDocument.deleteMany({ where: { isDemo: true, property: { tenantId: t } } });
  await prisma.client.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.contractTemplate.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.conversation.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.knowledgeItem.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.socialAccount.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.socialPost.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.adMetricDaily.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.webMetricDaily.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.agentSetting.updateMany({ where: { tenantId: t }, data: { enabled: false } });
  await prisma.leadTask.deleteMany({ where: { tenantId: t, isDemo: true } });
  await prisma.brochure.deleteMany({ where: { tenantId: t, isDemo: true } });
  await clearDemoLeads(user);
  if (!opts.keepUsers) await prisma.user.deleteMany({ where: { tenantId: t, isDemo: true } });
}
