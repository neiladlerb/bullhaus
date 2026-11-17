import Link from "next/link";
import { canEditProperty, formatWhen } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";
import { dictationEngine } from "@/lib/dictation";
import { listProperties } from "@/lib/properties";
import { createDictationAction } from "./actions";
import { Recorder } from "./recorder";

const ENGINE_NOTE = {
  claude: "Los datos los propone Claude y cada uno trae la frase de la que salió.",
  openai: "Los datos los propone el modelo configurado y cada uno trae la frase de la que salió.",
  reglas: "Los datos se proponen con reglas, sin modelo de IA (sin costo). Cada uno trae la frase de la que salió.",
} as const;

export default async function DictadoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("properties.write");
  const sp = await searchParams;
  const properties = (await listProperties(user, {})).filter((p) => canEditProperty(user, p));
  const recent = await prisma.propertyDictation.findMany({
    where: { tenantId: user.tenantId, ...(user.role === "corredor" ? { authorId: user.id } : {}) },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { property: { select: { code: true, comuna: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Dictar una propiedad</h1>
        <p className="mt-1 text-muted">
          Cuenta cómo es la propiedad mientras la recorres. El sistema propone los datos de la ficha, tú los revisas uno por uno y después se redacta la descripción.
        </p>
      </header>

      {sp.error && (
        <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger" role="alert">
          {sp.error === "sin-permiso" ? "No tienes permiso para editar esa propiedad." : sp.error}
        </p>
      )}

      {properties.length === 0 ? (
        <p className="card p-5 text-muted">No tienes propiedades que puedas editar.</p>
      ) : (
        <form action={createDictationAction} className="card p-5">
          <Recorder properties={properties.map((p) => ({ id: p.id, label: `${p.code}, ${p.comuna}${p.sector ? `, ${p.sector}` : ""}` }))} defaultProperty={sp.propiedad} />
          <p className="mt-4 text-sm text-muted">{ENGINE_NOTE[dictationEngine()]}</p>
        </form>
      )}

      <section className="card p-5">
        <h2 className="font-semibold">Instalar en el celular</h2>
        <p className="mt-1 text-sm text-muted">
          En Android (Chrome): menú de tres puntos, Instalar aplicación. En iPhone (Safari): botón Compartir, Agregar a inicio. Queda como app con acceso directo a la agenda y al dictado.
        </p>
      </section>

      {recent.length > 0 && (
        <section className="card p-5">
          <h2 className="font-semibold">Dictados recientes</h2>
          <ul className="mt-3 divide-y divide-line">
            {recent.map((d) => (
              <li key={d.id}>
                <Link href={`/dictado/${d.id}`} className="flex min-h-12 items-center justify-between gap-3 py-2 hover:underline">
                  <span>
                    {d.property.code}, {d.property.comuna}
                    <span className="block text-sm text-muted">{formatWhen(d.createdAt)}</span>
                  </span>
                  <span className={`chip ${d.status === "aplicado" ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                    {d.status === "aplicado" ? "Aplicado" : "Por revisar"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
