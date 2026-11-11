import Link from "next/link";
import { formatDate, SHEET_COLUMNS, type RowError } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";
import { ImportForm } from "./import-form";

export default async function ImportPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("properties.import");
  const sp = await searchParams;
  const [current, recent] = await Promise.all([
    sp.lote ? prisma.importBatch.findFirst({ where: { id: sp.lote, tenantId: user.tenantId } }) : null,
    prisma.importBatch.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const errors = (current?.errors ?? []) as unknown as RowError[];

  return (
    <div className="max-w-5xl">
      <Link href="/propiedades" className="text-sm text-muted hover:underline">← Propiedades</Link>
      <h1 className="mt-2 text-2xl font-semibold">Importar planilla</h1>
      <p className="mt-1 text-sm text-muted">Una fila por propiedad. Si el código ya existe, la fila la actualiza. Las filas con errores no se cargan y se listan abajo.</p>

      <section className="card mt-6 p-6">
        <ol className="mb-5 list-decimal space-y-1 pl-5 text-sm">
          <li><a href="/propiedades/plantilla" className="font-medium text-brand underline">Descarga la planilla modelo</a> (Excel, con una hoja de instrucciones).</li>
          <li>Llénala o pega ahí tu planilla actual respetando los encabezados. También sirve un .csv con los mismos encabezados.</li>
          <li>Súbela aquí.</li>
        </ol>
        <ImportForm />
      </section>

      {current && (
        <section className="card mt-6 p-6" aria-live="polite">
          <h2 className="font-medium">Resultado: {current.fileName}</h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="chip bg-emerald-100 text-emerald-800">{current.created} creadas</span>
            <span className="chip bg-sky-100 text-sky-900">{current.updated} actualizadas</span>
            <span className={`chip ${current.rejected ? "bg-red-100 text-red-800" : "bg-stone-100 text-stone-700"}`}>{current.rejected} con errores</span>
          </div>
          {errors.length > 0 && (
            <table className="mt-5 w-full text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr><th className="py-2 pr-4 font-medium">Fila</th><th className="py-2 pr-4 font-medium">Código</th><th className="py-2 font-medium">Qué corregir</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {errors.map((e) => (
                  <tr key={e.row}>
                    <td className="py-2 pr-4 tabular-nums">{e.row}</td>
                    <td className="py-2 pr-4">{e.code ?? "–"}</td>
                    <td className="py-2"><ul className="list-disc pl-4">{e.messages.map((m) => <li key={m}>{m}</li>)}</ul></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className="card mt-6 p-6">
        <h2 className="mb-3 font-medium">Columnas</h2>
        <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {SHEET_COLUMNS.map((c) => (
            <p key={c.key}><code className="text-xs">{c.key}</code>{c.required && <span className="text-brand"> *</span>} <span className="text-muted">{c.help}</span></p>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="mb-3 font-medium">Últimas importaciones</h2>
          <ul className="divide-y divide-line text-sm">
            {recent.map((b) => (
              <li key={b.id} className="flex justify-between py-2">
                <Link href={`/propiedades/importar?lote=${b.id}`} className="hover:underline">{b.fileName}</Link>
                <span className="text-muted">{formatDate(b.createdAt)} · {b.created} nuevas · {b.updated} actualizadas · {b.rejected} con errores</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
