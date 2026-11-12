import "server-only";
import { BULLHAUS_PUBLIC, LINKEDIN_SERIES, LINKEDIN_TIPS, linkedinPostText, listingPost } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import type { CurrentUser } from "../auth";
import { rng } from "./leads";
import { DAY } from "./legal";

// Simulación de las integraciones con Meta (Instagram, Facebook, Ads), Google Ads y GA4: cuentas
// conectadas en modo demo, 120 días de métricas diarias y publicaciones con sus resultados.
// Los textos de las publicaciones salen de la ficha (listingPost), como en producción.

const HISTORY_DAYS = 120;
const dayStart = (offset: number) => {
  const d = new Date(Date.now() - offset * DAY);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

export async function loadDemoSocial(user: CurrentUser): Promise<{ posts: number; days: number }> {
  const r = rng(20261115);
  const tenantId = user.tenantId;

  const ig = await prisma.socialAccount.create({ data: { tenantId, platform: "instagram", handle: BULLHAUS_PUBLIC.instagram, name: "Bull Haus Propiedades", followers: 0, connectedVia: "demo", isDemo: true } });
  const fb = await prisma.socialAccount.create({ data: { tenantId, platform: "facebook", handle: "BullHauspropiedades", name: "Bull Haus Propiedades", followers: 0, connectedVia: "demo", isDemo: true } });

  const daily: Prisma.SocialDailyCreateManyInput[] = [];
  let igF = 5_610;
  let fbF = 2_040;
  for (let o = HISTORY_DAYS; o >= 1; o--) {
    const date = dayStart(o);
    const weekend = [0, 6].includes(date.getUTCDay());
    igF += Math.round(3 + r() * 9 + (o < 60 ? 3 : 0));
    fbF += Math.round(r() * 3);
    daily.push({ accountId: ig.id, date, followers: igF, reach: Math.round((1_400 + r() * 1_600) * (weekend ? 1.2 : 1)), profileVisits: Math.round(60 + r() * 90), messages: Math.round(2 + r() * 7) });
    daily.push({ accountId: fb.id, date, followers: fbF, reach: Math.round(300 + r() * 500), profileVisits: Math.round(10 + r() * 25), messages: Math.round(r() * 3) });
  }
  await prisma.socialDaily.createMany({ data: daily });
  await prisma.socialAccount.update({ where: { id: ig.id }, data: { followers: igF } });
  await prisma.socialAccount.update({ where: { id: fb.id }, data: { followers: fbF } });

  const props = await prisma.property.findMany({
    where: { tenantId, status: "disponible", media: { some: {} } },
    select: { id: true, code: true, operation: true, type: true, comuna: true, headline: true, price: true, currency: true, m2Useful: true, m2Land: true, bedrooms: true, bathrooms: true, parking: true, features: true },
  });
  const posts: Prisma.SocialPostCreateManyInput[] = [];
  const formats = ["carrusel", "carrusel", "reel", "post"] as const;
  for (let o = HISTORY_DAYS; o >= 1; o -= 2 + Math.floor(r() * 2)) {
    if (!props.length) break;
    const p = props[Math.floor(r() * props.length)]!;
    const format = formats[Math.floor(r() * formats.length)]!;
    const draft = listingPost({ ...p, price: Number(p.price), m2Useful: p.m2Useful ? Number(p.m2Useful) : null, m2Land: p.m2Land ? Number(p.m2Land) : null }, format);
    const base = format === "reel" ? 5_500 : format === "carrusel" ? 2_600 : 1_700;
    const reach = Math.round(base * (0.6 + r() * 1.1));
    const publishedAt = new Date(dayStart(o).getTime() + (18 + Math.floor(r() * 3)) * 3_600_000);
    posts.push({
      tenantId, accountId: ig.id, propertyId: p.id, format, caption: `${draft.caption}\n\n${draft.hashtags.join(" ")}`, publishedAt, reach, impressions: Math.round(reach * (1.25 + r() * 0.4)),
      likes: Math.round(reach * (0.025 + r() * 0.03)), comments: Math.round(reach * (0.002 + r() * 0.004)), saves: Math.round(reach * (0.006 + r() * 0.012)), shares: Math.round(reach * (0.002 + r() * 0.006)), isDemo: true,
    });
    if (r() < 0.55) {
      const fbReach = Math.round(reach * (0.18 + r() * 0.2));
      posts.push({ tenantId, accountId: fb.id, propertyId: p.id, format: "post", caption: draft.caption, publishedAt, reach: fbReach, impressions: Math.round(fbReach * 1.2), likes: Math.round(fbReach * 0.02), comments: Math.round(fbReach * 0.003), saves: 0, shares: Math.round(fbReach * 0.004), isDemo: true });
    }
  }
  await prisma.socialPost.createMany({ data: posts });

  // Gasto diario de las campañas de Meta coherente con sus totales, y dos campañas de búsqueda en Google.
  const campaigns = await prisma.campaign.findMany({ where: { tenantId, isDemo: true, startsAt: { not: null } }, include: { _count: { select: { leads: true } } } });
  const ads: Prisma.AdMetricDailyCreateManyInput[] = [];
  for (const c of campaigns) {
    const start = c.startsAt!.getTime();
    const end = Math.min(c.endsAt!.getTime(), Date.now() - DAY);
    const days: Date[] = [];
    for (let t = start; t <= end; t += DAY) days.push(new Date(Date.UTC(new Date(t).getUTCFullYear(), new Date(t).getUTCMonth(), new Date(t).getUTCDate())));
    if (!days.length) continue;
    const weights = days.map(() => 0.7 + r() * 0.6);
    const sum = weights.reduce((a, b) => a + b, 0);
    let leadsLeft = c._count.leads;
    days.forEach((date, i) => {
      const w = weights[i]! / sum;
      const leads = i === days.length - 1 ? leadsLeft : Math.min(leadsLeft, Math.round(c._count.leads * w + (r() - 0.5)));
      leadsLeft -= leads;
      ads.push({ tenantId, platform: "meta", campaignId: c.id, campaignName: c.name, date, spendClp: Math.round(c.spendClp * w), impressions: Math.round(c.impressions * w), clicks: Math.round(c.clicks * w), leads: Math.max(0, leads), isDemo: true });
    });
  }
  const google = [
    { name: "Google búsqueda · Departamentos en venta Las Condes y Vitacura", spend: 9_500, cpc: 520, conv: 0.045 },
    { name: "Google búsqueda · Vender o arrendar mi propiedad", spend: 6_500, cpc: 610, conv: 0.06 },
  ];
  for (const g of google) {
    for (let o = 90; o >= 1; o--) {
      const spend = Math.round(g.spend * (0.75 + r() * 0.5));
      const clicks = Math.round(spend / (g.cpc * (0.85 + r() * 0.3)));
      ads.push({ tenantId, platform: "google", campaignId: null, campaignName: g.name, date: dayStart(o), spendClp: spend, impressions: Math.round(clicks / (0.045 + r() * 0.03)), clicks, leads: r() < clicks * g.conv ? 1 : 0, isDemo: true });
    }
  }
  await prisma.adMetricDaily.createMany({ data: ads });

  const web: Prisma.WebMetricDailyCreateManyInput[] = [];
  for (let o = HISTORY_DAYS; o >= 1; o--) {
    const date = dayStart(o);
    const weekend = [0, 6].includes(date.getUTCDay());
    const trend = 1 + (HISTORY_DAYS - o) / HISTORY_DAYS * 0.35;
    const sessions = Math.round((weekend ? 210 : 260) * trend * (0.85 + r() * 0.3));
    web.push({ tenantId, date, sessions, users: Math.round(sessions * 0.78), propertyViews: Math.round(sessions * (1.6 + r() * 0.5)), whatsappClicks: Math.round(sessions * (0.022 + r() * 0.014)), forms: Math.round(sessions * (0.004 + r() * 0.005)), isDemo: true });
  }
  await prisma.webMetricDaily.deleteMany({ where: { tenantId, isDemo: true } });
  await prisma.webMetricDaily.createMany({ data: web, skipDuplicates: true });
  const li = await loadDemoLinkedIn(user, r);
  return { posts: posts.length + li, days: HISTORY_DAYS };
}

/**
 * Página de empresa en LinkedIn con la serie "Bull Haus te asesora": un consejo por semana (martes) publicado
 * durante los últimos meses, los próximos aprobados y programados, y otros en revisión o en borrador,
 * para mostrar el flujo de aprobación. Los textos salen de la biblioteca de core.
 */
async function loadDemoLinkedIn(user: CurrentUser, r: () => number): Promise<number> {
  const tenantId = user.tenantId;
  const days = 90;
  const li = await prisma.socialAccount.create({ data: { tenantId, platform: "linkedin", handle: "Bull Haus Propiedades", name: "Bull Haus Propiedades", followers: 0, connectedVia: "demo", isDemo: true } });

  const daily: Prisma.SocialDailyCreateManyInput[] = [];
  let followers = 410;
  for (let o = days; o >= 1; o--) {
    const date = dayStart(o);
    const weekday = ![0, 6].includes(date.getUTCDay());
    followers += Math.round(r() * (weekday ? 3 : 1) + (o < 45 ? r() * 2 : 0));
    daily.push({ accountId: li.id, date, followers, reach: Math.round((weekday ? 260 : 70) * (0.7 + r() * 0.7)), profileVisits: Math.round((weekday ? 14 : 4) * (0.6 + r() * 0.8)), messages: r() < 0.12 ? 1 : 0 });
  }
  await prisma.socialDaily.createMany({ data: daily });
  await prisma.socialAccount.update({ where: { id: li.id }, data: { followers } });

  // Martes de las últimas semanas, del más antiguo al más reciente.
  const tuesdays: Date[] = [];
  for (let o = days; o >= 1; o--) {
    const d = dayStart(o);
    if (d.getUTCDay() === 2) tuesdays.push(new Date(d.getTime() + 12 * 3_600_000)); // 09:00 en Santiago
  }
  const upcoming = (weeks: number, weekday: number) => {
    const d = dayStart(0);
    const add = ((weekday - d.getUTCDay() + 7) % 7 || 7) + (weeks - 1) * 7;
    return new Date(d.getTime() + add * DAY + 12 * 3_600_000);
  };

  // Alterna vender, comprar y arrendar para que el historial muestre los tres temas.
  const byTopic = ["vender", "comprar", "arrendar"].map((t) => LINKEDIN_TIPS.filter((x) => x.topic === t));
  const tips = Array.from({ length: Math.max(...byTopic.map((l) => l.length)) }, (_, i) => byTopic.map((l) => l[i])).flat().filter((t): t is (typeof LINKEDIN_TIPS)[number] => Boolean(t));
  const published = tips.slice(0, Math.min(tuesdays.length, tips.length - 5));
  const rows: Prisma.SocialPostCreateManyInput[] = published.map((t, i) => {
    const publishedAt = tuesdays[tuesdays.length - published.length + i]!;
    const impressions = Math.round((700 + r() * 1_600) * (1 + i * 0.05));
    return {
      tenantId, accountId: li.id, format: "post", status: "publicado", series: LINKEDIN_SERIES, topic: t.topic, title: t.title, caption: linkedinPostText(t),
      approvedById: user.id, approvedAt: new Date(publishedAt.getTime() - 2 * DAY), scheduledAt: publishedAt, publishedAt,
      impressions, reach: Math.round(impressions * 0.68), likes: Math.round(impressions * (0.018 + r() * 0.025)), comments: Math.round(impressions * (0.001 + r() * 0.004)),
      shares: Math.round(impressions * (0.001 + r() * 0.003)), clicks: Math.round(impressions * (0.008 + r() * 0.018)), saves: 0, isDemo: true,
    };
  });
  const rest = tips.slice(published.length);
  const plan: Array<{ status: "aprobado" | "en_revision" | "borrador"; at: Date }> = [
    { status: "aprobado", at: upcoming(1, 2) },
    { status: "aprobado", at: upcoming(2, 2) },
    { status: "en_revision", at: upcoming(3, 2) },
    { status: "en_revision", at: upcoming(4, 2) },
    { status: "borrador", at: upcoming(5, 2) },
  ];
  rest.slice(0, plan.length).forEach((t, i) => {
    const p = plan[i]!;
    rows.push({
      tenantId, accountId: li.id, format: "post", status: p.status, series: LINKEDIN_SERIES, topic: t.topic, title: t.title, caption: linkedinPostText(t), scheduledAt: p.at,
      ...(p.status === "aprobado" ? { approvedById: user.id, approvedAt: new Date(Date.now() - DAY) } : {}), isDemo: true,
    });
  });
  await prisma.socialPost.createMany({ data: rows });
  return rows.length;
}
