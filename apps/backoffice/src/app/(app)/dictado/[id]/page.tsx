import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { canEditProperty, DETAIL_LABELS, DICTATION_FIELDS, DICTATION_KEYS, formatWhen, type DictationFieldKey, type ExtractedField, type FieldValue } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";
import { getProperty } from "@/lib/properties";
import { applyFieldsAction, approveDescriptionAction, generateDescriptionAction } from "../actions";

const storedSchema = z.object({
  fields: z.array(z.object({ key: z.enum(DICTATION_KEYS as [DictationFieldKey, ...DictationFieldKey[]]), value: z.unknown(), source: z.string() })),
  dropped: z.number().optional(),
});

const ENGINE_LABEL: Record<string, string> = { claude: "Claude", openai: "OpenAI", reglas: "reglas, sin IA" };

function toInput(key: DictationFieldKey, v: unknown): string {
  if (v === null || v === undefined) return "";
  const kind = DICTATION_FIELDS[key].kind;
  if (kind === "bool") return v ? "si" : "no";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

function show(key: DictationFieldKey, v: unknown): string {
  const s = toInput(key, v);
  if (!s) return "Vacío";
  const kind = DICTATION_FIELDS[key].kind;
  if (kind === "bool" || kind === "pets") return s === "si" ? "Sí" : s === "no" ? "No" : "Consultar";
  return s;
}

export default async function DictationReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("properties.write");
  const { id } = await params;
  const sp = await searchParams;
  const d = await prisma.propertyDictation.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!d) notFound();
  const property = await getProperty(user, d.propertyId);
  if (!property || !canEditProperty(user, property)) notFound();
  const author = await prisma.user.findFirst({ where: { id: d.authorId, tenantId: user.tenantId }, select: { name: true } });

  const stored = storedSchema.safeParse(d.extracted);
  const fields = (stored.success ? stored.data.fields : []) as ExtractedField[];
  const dropped = stored.success ? (stored.data.dropped ?? 0) : 0;
  const details = (property.details && typeof property.details === "object" && !Array.isArray(property.details) ? property.details : {}) as Record<string, unknown>;

  const current = (key: DictationFieldKey): unknown => {
    switch (key) {
      case "m2Useful":
      case "m2Land":
        return property[key] ? Number(property[key]) : null;
      case "bedrooms":
      case "bathrooms":
      case "parking":
      case "storage":
      case "commonExpensesClp":
      case "pets":
      case "furnished":
        return property[key];
      case "features":
        return property.features.length ? property.features : null;
      default:
        return details[DETAIL_LABELS[key] ?? key] ?? null;
    }
  };

  const draft = d.descriptionDraft ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <Link href="/dictado" className="text-sm text-muted hover:underline">Dictar una propiedad</Link>
        <h1 className="mt-1 text-2xl font-semibold">
          Revisar dictado de <Link href={`/propiedades/${property.id}`} className="underline">{property.code}</Link>
        </h1>
        <p className="mt-1 text-sm text-muted">
          {property.comuna}{property.sector ? `, ${property.sector}` : ""}. Dictado por {author?.name ?? "un usuario"} el {formatWhen(d.createdAt)}. Propuesta con {ENGINE_LABEL[d.engine ?? "reglas"] ?? d.engine}.
        </p>
      </header>

      {sp.error && <p className="rounded-lg bg-danger-soft p-3 text-sm text-danger" role="alert">{sp.error}</p>}
      {sp.aviso && <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning" role="status">{sp.aviso}</p>}
      {sp.ok && <p className="rounded-lg bg-success-soft p-3 text-sm text-success" role="status">{sp.ok}</p>}

      <section className="card p-5">
        <h2 className="font-semibold">1. Datos propuestos</h2>
        <p className="mt-1 text-sm text-muted">
          Marca los que están bien y corrige el valor si hace falta. Solo lo marcado pasa a la ficha. Lo que no dijiste no aparece aquí.
          {dropped > 0 && ` Se descartaron ${dropped} ${dropped === 1 ? "dato" : "datos"} del modelo porque su frase no estaba en el dictado.`}
        </p>
        {fields.length === 0 ? (
          <p className="mt-4 text-muted">No se encontraron datos de la ficha en el dictado. Puedes ir directo a la descripción o dictar de nuevo con más detalle.</p>
        ) : (
          <form action={applyFieldsAction} className="mt-4">
            <input type="hidden" name="dictationId" value={d.id} />
            <ul className="divide-y divide-line">
              {fields.map((f) => {
                const now = current(f.key);
                const same = toInput(f.key, now) === toInput(f.key, f.value as FieldValue);
                const def = DICTATION_FIELDS[f.key];
                return (
                  <li key={f.key} className="grid gap-2 py-3 sm:grid-cols-[auto_12rem_1fr] sm:items-start sm:gap-4">
                    <label className="flex min-h-11 items-center gap-3 font-medium sm:min-w-44">
                      <input type="checkbox" name="apply" value={f.key} defaultChecked={!same} className="size-5" />
                      {def.label}
                    </label>
                    <div>
                      {def.kind === "bool" || def.kind === "pets" ? (
                        <select name={`v_${f.key}`} defaultValue={toInput(f.key, f.value)} className="input" aria-label={`${def.label}, valor propuesto`}>
                          <option value="si">Sí</option>
                          <option value="no">No</option>
                          {def.kind === "pets" && <option value="consultar">Consultar</option>}
                        </select>
                      ) : (
                        <input
                          name={`v_${f.key}`}
                          defaultValue={toInput(f.key, f.value)}
                          inputMode={def.kind === "int" || def.kind === "number" ? "decimal" : "text"}
                          className="input"
                          aria-label={`${def.label}, valor propuesto`}
                        />
                      )}
                      <p className="mt-1 text-xs text-muted">En la ficha: {show(f.key, now)}{same ? " (igual)" : ""}</p>
                    </div>
                    <blockquote className="border-l-2 border-line pl-3 text-sm text-muted">“{f.source}”</blockquote>
                  </li>
                );
              })}
            </ul>
            <button type="submit" className="btn-primary mt-4 min-h-12 w-full sm:w-auto">Pasar los marcados a la ficha</button>
          </form>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">2. Descripción</h2>
        <p className="mt-1 text-sm text-muted">
          Se redacta con los datos de la ficha (no con el dictado), así que primero pasa los datos. No se puede guardar con cifras que la ficha no tenga.
        </p>
        <form action={generateDescriptionAction} className="mt-4">
          <input type="hidden" name="dictationId" value={d.id} />
          <button type="submit" className="btn-brand min-h-12 w-full sm:w-auto">{draft ? "Redactar de nuevo" : "Redactar descripción"}</button>
        </form>
        {draft && (
          <form action={approveDescriptionAction} className="mt-4 space-y-3">
            <input type="hidden" name="dictationId" value={d.id} />
            <label className="label" htmlFor="dc-desc">Borrador (puedes editarlo)</label>
            <textarea id="dc-desc" name="description" rows={9} defaultValue={draft} className="input text-base" />
            {property.description && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted">Ver la descripción actual de la ficha</summary>
                <p className="mt-2 whitespace-pre-line">{property.description}</p>
              </details>
            )}
            <button type="submit" className="btn-primary min-h-12 w-full sm:w-auto">Aprobar y guardar en la ficha</button>
          </form>
        )}
      </section>

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">Dictado completo</summary>
        <p className="mt-3 whitespace-pre-line text-sm">{d.transcript}</p>
      </details>
    </div>
  );
}
