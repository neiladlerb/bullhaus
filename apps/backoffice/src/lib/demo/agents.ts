import "server-only";
import { randomUUID } from "node:crypto";
import { formatPrice, listingFacts, TYPE_LABELS, type Channel } from "@bullhaus/core";
import { prisma, type Prisma } from "@bullhaus/db";
import type { CurrentUser } from "../auth";
import { rng } from "./leads";
import { DAY } from "./legal";

// Conversaciones de demostración de los agentes de WhatsApp, Instagram, Facebook y voz.
// Siguen las reglas del agente real: se presenta como asistente virtual, usa solo datos de la ficha,
// no da la dirección exacta antes de confirmar, no negocia precios y procesa BAJA sin modelo.

const MIN = 60_000;
type Msg = { role: "contacto" | "agente" | "corredor" | "sistema"; body: string; tool?: string; dt: number };

const SLOTS = ["jueves a las 11:00", "viernes a las 17:30", "sábado a las 10:30", "martes a las 18:00", "miércoles a las 12:00"];
const INTRO = (ch: Channel) =>
  ch === "voz"
    ? "Hola, te habla el asistente virtual de Bull Haus. Te aviso que esta llamada se graba para mejorar la atención. ¿En qué te puedo ayudar?"
    : "¡Hola! Soy el asistente virtual de Bull Haus. Te puedo ayudar con información de nuestras propiedades y a coordinar una visita.";

interface Prop {
  id: string;
  code: string;
  operation: "venta" | "arriendo";
  type: Parameters<typeof listingFacts>[0]["type"];
  comuna: string;
  price: unknown;
  currency: "UF" | "CLP";
  m2Useful: unknown;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  commonExpensesClp: number | null;
  pets: string | null;
}

function facts(p: Prop) {
  const f = listingFacts({ code: p.code, operation: p.operation, type: p.type, comuna: p.comuna, price: Number(p.price), currency: p.currency, m2Useful: p.m2Useful ? Number(p.m2Useful) : null, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parking: p.parking });
  return f.length ? f.join(", ") : "los datos de la ficha";
}

function visitScript(first: string, p: Prop, ch: Channel, r: () => number): { msgs: Msg[]; outcome: string } {
  const price = formatPrice(Number(p.price), p.currency) + (p.operation === "arriendo" ? " mensuales" : "");
  const slot = SLOTS[Math.floor(r() * SLOTS.length)]!;
  const msgs: Msg[] = [
    { role: "contacto", body: `Hola, vi la propiedad ${p.code} en ${ch === "instagram" ? "Instagram" : "la web"}. ¿Sigue disponible?`, dt: 0 },
    { role: "agente", body: `${INTRO(ch)} Sí, la ${TYPE_LABELS[p.type].toLowerCase()} ${p.code} en ${p.comuna} está disponible: ${facts(p)}. Precio: ${price}.`, tool: "get_property", dt: 0.3 },
    { role: "contacto", body: p.operation === "arriendo" ? "¿Cuánto son los gastos comunes?" : "¿Se puede visitar esta semana?", dt: 2 + r() * 8 },
  ];
  if (p.operation === "arriendo") {
    msgs.push({ role: "agente", body: p.commonExpensesClp ? `Según la ficha, los gastos comunes son ${formatPrice(p.commonExpensesClp, "CLP")} aprox. ¿Te gustaría visitarla?` : "Ese dato no está en la ficha; se lo pregunto al corredor y te confirmamos. ¿Te gustaría visitarla mientras tanto?", dt: 0.3 });
    msgs.push({ role: "contacto", body: "Sí, me interesa verla", dt: 3 + r() * 20 });
  }
  msgs.push(
    { role: "agente", body: `Perfecto. Tengo estos horarios con el corredor: ${slot} o ${SLOTS[(SLOTS.indexOf(slot) + 1) % SLOTS.length]}. ¿Cuál te acomoda? Y para agendar, ¿me dices tu nombre completo?`, tool: "get_slots", dt: 0.4 },
    { role: "contacto", body: `${first}. El ${slot.split(" a las")[0]} me sirve`, dt: 4 + r() * 30 },
    { role: "agente", body: `Gracias, ${first}. Para confirmar: visita a la propiedad ${p.code} el ${slot}. ¿Confirmas?`, dt: 0.3 },
    { role: "contacto", body: "Confirmo, gracias", dt: 1 + r() * 10 },
    { role: "agente", body: `¡Listo, quedó agendada! Te enviaremos la dirección exacta y el contacto del corredor en el mensaje de confirmación. Si necesitas cambiar la hora, escríbeme por aquí.`, tool: "book_appointment", dt: 0.4 },
  );
  return { msgs, outcome: "visita_agendada" };
}

function ownerScript(first: string, comuna: string, ch: Channel, r: () => number): { msgs: Msg[]; outcome: string } {
  const slot = SLOTS[Math.floor(r() * SLOTS.length)]!;
  return {
    outcome: "tasacion_agendada",
    msgs: [
      { role: "contacto", body: ch === "voz" ? "Hola, llamo porque quiero vender mi casa" : `Hola! Tengo un departamento en ${comuna} y quiero venderlo, ¿cómo trabajan?`, dt: 0 },
      { role: "agente", body: `${INTRO(ch)} Con gusto te cuento: un corredor de Bull Haus visita la propiedad, prepara una valorización y te propone cómo publicarla. ¿En qué comuna está y qué tipo de propiedad es?`, dt: 0.3 },
      { role: "contacto", body: `${comuna}, 3 dormitorios y 2 baños`, dt: 2 + r() * 6 },
      { role: "agente", body: `Gracias. Podemos coordinar una visita de tasación sin costo el ${slot}. ¿Me indicas tu nombre completo para agendarla?`, tool: "get_slots", dt: 0.3 },
      { role: "contacto", body: `${first}, ese horario me sirve`, dt: 5 + r() * 40 },
      { role: "agente", body: `Perfecto, ${first}. Visita de tasación agendada el ${slot}. El corredor te escribirá para confirmar la dirección. ¡Gracias por confiar en Bull Haus!`, tool: "book_appointment", dt: 0.3 },
    ],
  };
}

function handoffScript(p: Prop | null, ch: Channel, r: () => number): { msgs: Msg[]; outcome: string } {
  const code = p?.code ?? "la propiedad";
  return {
    outcome: "derivada",
    msgs: [
      { role: "contacto", body: `Hola, ¿el precio de ${code} es conversable? Podría ofrecer menos`, dt: 0 },
      { role: "agente", body: `${INTRO(ch)} No puedo negociar precios, pero sí puedo pasarle tu propuesta al corredor a cargo para que te responda. ¿Quieres que lo haga?`, dt: 0.3 },
      { role: "contacto", body: "Sí, por favor", dt: 1 + r() * 5 },
      { role: "agente", body: "Listo, le dejé tu mensaje al corredor. Te va a escribir por este mismo chat.", tool: "handoff_to_broker", dt: 0.3 },
      { role: "corredor", body: "Hola, te saluda el corredor a cargo. Recibí tu consulta; ¿te parece si conversamos por teléfono hoy en la tarde?", dt: 25 + r() * 90 },
    ],
  };
}

function botQuestionScript(p: Prop | null, ch: Channel, r: () => number): { msgs: Msg[]; outcome: string } {
  return {
    outcome: "informacion",
    msgs: [
      { role: "contacto", body: "¿Estoy hablando con una persona o con un robot?", dt: 0 },
      { role: "agente", body: `${INTRO(ch)} Soy un asistente virtual, no una persona. Si prefieres hablar con un corredor, te paso con uno.`, dt: 0.3 },
      { role: "contacto", body: p ? `No, está bien. ¿${p.code} acepta mascotas?` : "Ok. ¿Qué requisitos piden para arrendar?", dt: 1 + r() * 3 },
      {
        role: "agente",
        body: p?.pets
          ? `Según la ficha de ${p.code}, las mascotas ${p.pets === "si" ? "están permitidas" : p.pets === "no" ? "no están permitidas" : "se consultan con el propietario"}.`
          : "Para arrendar, Bull Haus pide acreditar ingresos y un mes de garantía; el detalle te lo confirma el corredor al postular.",
        tool: p ? "get_property" : "search_knowledge",
        dt: 0.3,
      },
    ],
  };
}

function optOutScript(ch: Channel): { msgs: Msg[]; outcome: string } {
  return {
    outcome: "baja",
    msgs: [
      { role: "contacto", body: "BAJA", dt: 0 },
      { role: "sistema", body: "Palabra de baja recibida: el contacto queda fuera de toda comunicación. Procesado sin pasar por el modelo.", tool: "opt_out", dt: 0.05 },
      { role: "agente", body: ch === "voz" ? "Entendido, no volveremos a llamarte." : "Listo, no te volveremos a escribir. Si en el futuro necesitas algo, aquí estamos.", dt: 0.1 },
    ],
  };
}

function noReplyScript(p: Prop | null, ch: Channel): { msgs: Msg[]; outcome: string } {
  return {
    outcome: "sin_respuesta",
    msgs: [
      { role: "contacto", body: p ? `Info ${p.code}` : "Hola, info", dt: 0 },
      { role: "agente", body: p ? `${INTRO(ch)} La propiedad ${p.code} en ${p.comuna}: ${facts(p)}. ¿Te gustaría visitarla?` : `${INTRO(ch)} ¿Qué tipo de propiedad buscas y en qué comuna?`, tool: p ? "get_property" : undefined, dt: 0.3 },
    ],
  };
}

export async function loadDemoConversations(user: CurrentUser): Promise<number> {
  const r = rng(20261114);
  const leads = await prisma.lead.findMany({
    where: { tenantId: user.tenantId, isDemo: true },
    include: { property: { select: { id: true, code: true, operation: true, type: true, comuna: true, price: true, currency: true, m2Useful: true, bedrooms: true, bathrooms: true, parking: true, commonExpensesClp: true, pets: true } } },
  });
  const conversations: Prisma.ConversationCreateManyInput[] = [];
  const messages: Prisma.MessageCreateManyInput[] = [];
  for (const l of leads) {
    const channel: Channel | null = l.source === "whatsapp" ? "whatsapp" : l.source === "instagram" ? "instagram" : l.source === "facebook" ? "facebook" : l.source === "referido" && l.kind === "propietario" ? "voz" : null;
    if (!channel) continue;
    const first = l.name.split(" ")[0]!;
    const p = (l.property as Prop | null) ?? null;
    const x = r();
    const script =
      x < 0.06 ? optOutScript(channel)
      : x < 0.14 ? noReplyScript(p, channel)
      : x < 0.22 ? botQuestionScript(p, channel, r)
      : x < 0.32 ? handoffScript(p, channel, r)
      : l.kind === "propietario" ? ownerScript(first, l.comuna ?? "Las Condes", channel, r)
      : p ? visitScript(first, p, channel, r)
      : noReplyScript(null, channel);
    const id = randomUUID();
    let t = l.createdAt.getTime();
    for (const m of script.msgs) {
      t += m.dt * MIN;
      messages.push({ conversationId: id, role: m.role, body: m.body, tool: m.tool ?? null, createdAt: new Date(t) });
    }
    const old = Date.now() - t > 2 * DAY;
    const status = script.outcome === "derivada" ? (old ? "cerrada" : "humano") : old || script.outcome === "baja" ? "cerrada" : "agente";
    conversations.push({
      id, tenantId: user.tenantId, channel, status, contactName: l.name, contactHandle: channel === "instagram" ? `@${first.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${Math.floor(r() * 900 + 100)}` : (l.phone ?? "+56 9 0000 0000"),
      leadId: l.id, propertyId: p?.id ?? null, outcome: script.outcome, optedOut: script.outcome === "baja", flagged: script.outcome === "derivada" && r() < 0.3,
      costUsd: Math.round((0.004 + script.msgs.length * (channel === "voz" ? 0.03 : 0.0045) + r() * 0.006) * 10000) / 10000,
      startedAt: l.createdAt, lastMessageAt: new Date(t), isDemo: true,
    });
  }
  await prisma.conversation.createMany({ data: conversations });
  await prisma.message.createMany({ data: messages });

  const kb = [
    { title: "Requisitos para arrendar", body: "Acreditar renta líquida de al menos tres veces el arriendo, un mes de garantía y un mes de arriendo adelantado. Codeudor solidario cuando la renta no alcanza." },
    { title: "Horario de atención", body: "Corredores de lunes a viernes de 9:00 a 19:00 y sábados de 10:00 a 14:00. El asistente virtual responde todos los días de 8:00 a 22:00." },
    { title: "Zonas en que trabajamos", body: "Sector oriente de Santiago (Las Condes, Vitacura, Lo Barnechea, Providencia, Ñuñoa) y la costa: Zapallar, Papudo, Cachagua, Maitencillo y Viña del Mar." },
    { title: "Tasación de propiedades", body: "La visita de tasación para propietarios que quieren vender o arrendar no tiene costo. El corredor entrega una valorización en 48 horas." },
    { title: "Lo que el asistente no hace", body: "No negocia precios, no asesora sobre créditos ni temas legales y no pide documentos por chat. Para KYC solo envía el enlace del portal de verificación." },
  ];
  await prisma.knowledgeItem.createMany({ data: kb.map((k) => ({ ...k, tenantId: user.tenantId, isDemo: true })) });
  for (const channel of ["whatsapp", "instagram", "facebook", "voz"] as const) {
    await prisma.agentSetting.upsert({
      where: { tenantId_channel: { tenantId: user.tenantId, channel } },
      update: { enabled: channel !== "facebook" },
      create: { tenantId: user.tenantId, channel, enabled: channel !== "facebook", hoursFrom: channel === "voz" ? "09:00" : "08:00", hoursTo: channel === "voz" ? "20:00" : "22:00", handoffRules: "Derivar si pide hablar con una persona, quiere negociar el precio o pregunta por temas legales o de crédito." },
    });
  }
  return conversations.length;
}
