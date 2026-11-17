import Link from "next/link";
import { normalizeAvailability } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { visitSettings } from "@/lib/agenda";
import { requireUser } from "@/lib/auth";
import { AvailabilityForm } from "../forms";

export default async function HorarioPage() {
  const user = await requireUser("leads.write");
  const [me, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { availability: true } }),
    visitSettings(user.tenantId),
  ]);
  return (
    <div className="max-w-3xl">
      <Link href="/agenda" className="text-sm text-muted hover:underline">← Agenda</Link>
      <h1 className="mt-2 text-2xl font-semibold">Mi horario de visitas</h1>
      <p className="mt-1 text-sm text-muted">
        La web ofrece estos horarios para agendar visitas a tus propiedades, sin los que ya tienes ocupados. Cada visita dura {settings.durationMin} minutos y se puede pedir con al menos {settings.minNoticeHours} horas de anticipación (se cambia en Agentes IA, Ajustes).
      </p>
      <section className="card mt-6 p-6">
        <AvailabilityForm value={normalizeAvailability(me?.availability)} />
      </section>
    </div>
  );
}
