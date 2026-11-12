import { can, CHANNEL_LABELS, formatDate, type Channel } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { DemoTag } from "@/components/demo";
import { requireUser } from "@/lib/auth";
import { deleteKnowledgeAction, saveKnowledgeAction, saveSettingAction } from "../actions";
import { AgentTabs } from "../tabs";

const CHANNELS: Channel[] = ["whatsapp", "instagram", "facebook", "voz"];

export default async function AjustesPage() {
  const user = await requireUser("agents.read");
  const editable = can(user.role, "agents.manage");
  const [settings, kb] = await Promise.all([
    prisma.agentSetting.findMany({ where: { tenantId: user.tenantId } }),
    prisma.knowledgeItem.findMany({ where: { tenantId: user.tenantId }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold">Agentes IA</h1>
      <AgentTabs active="ajustes" />
      <p className="text-sm text-muted">
        Bull Haus controla los ajustes y la base de conocimiento. El agente se presenta siempre como asistente virtual, el agente de voz avisa la grabación en la primera frase y las palabras de baja se procesan sin el modelo: esas reglas no se pueden apagar.
      </p>

      <section className="grid gap-4 lg:grid-cols-2">
        {CHANNELS.map((ch) => {
          const s = settings.find((x) => x.channel === ch);
          return (
            <form key={ch} action={saveSettingAction.bind(null, ch)} className="card space-y-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{CHANNEL_LABELS[ch]}</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="enabled" defaultChecked={s?.enabled ?? false} disabled={!editable} className="h-4 w-4 accent-brand" /> Encendido
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2">
                  <span className="label">Nombre del asistente</span>
                  <input name="assistantName" className="input" defaultValue={s?.assistantName ?? "Asistente virtual de Bull Haus"} disabled={!editable} />
                </label>
                <label>
                  <span className="label">Atiende desde</span>
                  <input name="hoursFrom" type="time" className="input" defaultValue={s?.hoursFrom ?? "08:00"} disabled={!editable} />
                </label>
                <label>
                  <span className="label">Hasta</span>
                  <input name="hoursTo" type="time" className="input" defaultValue={s?.hoursTo ?? "22:00"} disabled={!editable} />
                </label>
                <label>
                  <span className="label">Máximo de rechazos</span>
                  <input name="maxRejections" type="number" min={1} max={5} className="input" defaultValue={s?.maxRejections ?? 2} disabled={!editable} />
                </label>
                <label>
                  <span className="label">Duración de la visita (min)</span>
                  <input name="visitMinutes" type="number" min={15} max={180} className="input" defaultValue={s?.visitMinutes ?? 45} disabled={!editable} />
                </label>
                <label>
                  <span className="label">Antelación mínima (horas)</span>
                  <input name="minNoticeHours" type="number" min={0} max={72} className="input" defaultValue={s?.minNoticeHours ?? 3} disabled={!editable} />
                </label>
                <label>
                  <span className="label">Palabras de baja</span>
                  <input name="stopWords" className="input" defaultValue={(s?.stopWords ?? ["BAJA", "STOP", "NO MOLESTAR"]).join(", ")} disabled={!editable} />
                </label>
                <label className="col-span-2">
                  <span className="label">Cuándo derivar a un corredor</span>
                  <textarea name="handoffRules" rows={2} className="input" defaultValue={s?.handoffRules ?? ""} disabled={!editable} />
                </label>
              </div>
              {editable && <button className="btn-primary">Guardar {CHANNEL_LABELS[ch]}</button>}
            </form>
          );
        })}
      </section>

      <section className="card p-5">
        <h2 className="font-medium">Base de conocimiento</h2>
        <p className="mt-1 text-sm text-muted">Lo que el agente puede responder fuera de las fichas. Ninguna cifra ni condición que no esté aquí o en la ficha.</p>
        <ul className="mt-4 divide-y divide-line">
          {kb.map((k) => (
            <li key={k.id} className="py-3">
              <form action={saveKnowledgeAction.bind(null, k.id)} className="grid gap-2 md:grid-cols-[14rem_1fr_auto]">
                <input name="title" className="input font-medium" defaultValue={k.title} disabled={!editable} />
                <textarea name="body" rows={2} className="input" defaultValue={k.body} disabled={!editable} />
                {editable && (
                  <div className="flex gap-2 md:flex-col">
                    <button className="btn-ghost">Guardar</button>
                    <button formAction={deleteKnowledgeAction.bind(null, k.id)} className="btn text-red-700 hover:bg-red-50">Borrar</button>
                  </div>
                )}
              </form>
              <p className="mt-1 text-xs text-muted">
                Actualizado el {formatDate(k.updatedAt)}
                {k.isDemo && <DemoTag />}
              </p>
            </li>
          ))}
        </ul>
        {editable && (
          <form action={saveKnowledgeAction.bind(null, null)} className="mt-4 grid gap-2 border-t border-line pt-4 md:grid-cols-[14rem_1fr_auto]">
            <input name="title" className="input" placeholder="Tema, p. ej. Comisiones" />
            <textarea name="body" rows={2} className="input" placeholder="Lo que el agente puede decir sobre este tema" />
            <button className="btn-primary">Agregar</button>
          </form>
        )}
      </section>
    </div>
  );
}
