import Link from "next/link";
import { formatDateTimeCl, SHARE_CHANNEL_LABELS, type ShareChannel } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";
import { brochureUrl } from "@/lib/brochures";
import { simulateOpenAction } from "../brochures/actions";

// Simulación del envío en la demo: muestra lo que el corredor vería en WhatsApp, en su correo o en la red
// social, sin abrir ninguna aplicación con los datos ficticios del contacto.

const safeBack = (v: string | undefined) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/pipeline");

export default async function DemoSendPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("leads.read");
  const sp = await searchParams;
  const channel = (sp.canal ?? "whatsapp") as ShareChannel | "llamar";
  const text = sp.texto ?? "";
  const back = safeBack(sp.volver);
  const share = sp.envio ? await prisma.brochureShare.findFirst({ where: { id: sp.envio, tenantId: user.tenantId, isDemo: true }, include: { brochure: { select: { token: true } } } }) : null;
  const url = share ? await brochureUrl(share.brochure.token, share.id) : null;
  const label = channel === "llamar" ? "Llamada" : SHARE_CHANNEL_LABELS[channel] ?? channel;

  return (
    <div className="max-w-2xl space-y-5">
      <Link href={back} className="text-sm text-muted hover:underline">← Volver</Link>
      <div>
        <h1 className="text-2xl font-semibold">Envío simulado por {label}</h1>
        <p className="mt-1 text-sm text-muted">
          Demostración: con un contacto real se abre {channel === "email" ? "tu correo" : channel === "whatsapp" ? "tu WhatsApp" : `${label}`} con este texto listo y tú lo envías. Aquí no sale nada porque el contacto es ficticio. El envío ya quedó registrado.
        </p>
      </div>

      {channel === "whatsapp" ? (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm">{(sp.para ?? "?").slice(0, 1)}</span>
            <span className="text-sm font-medium">{sp.para}</span>
          </div>
          <div className="bg-[#ece5dd] p-4">
            <div className="ml-auto max-w-[85%] rounded-lg bg-[#dcf8c6] px-3 py-2 text-sm shadow-sm">
              <p className="whitespace-pre-line break-words">{text}</p>
              <p className="mt-1 text-right text-[10px] text-ink/50">{formatDateTimeCl(new Date()).slice(11)} ✓✓</p>
            </div>
          </div>
        </div>
      ) : channel === "email" ? (
        <div className="card overflow-hidden">
          <div className="space-y-1 border-b border-line bg-paper px-4 py-3 text-sm">
            <p><span className="text-muted">Para:</span> {sp.para}</p>
            <p><span className="text-muted">Asunto:</span> {sp.asunto}</p>
          </div>
          <p className="whitespace-pre-line break-words p-4 text-sm leading-relaxed">{text}</p>
        </div>
      ) : (
        <div className="card p-4">
          <p className="text-xs text-muted">{sp.para}</p>
          <p className="mt-2 whitespace-pre-line break-words text-sm">{text}</p>
        </div>
      )}

      {share && url && (
        <div className="card space-y-3 p-5">
          <h2 className="font-medium">Siguiente paso de la demo</h2>
          <p className="text-sm text-muted">Simula que el contacto abre el enlace: la apertura aparece en el historial del brochure. Luego abre el brochure como lo vería él y deja sus datos para ver cómo entra al pipeline con un compromiso de llamada.</p>
          <div className="flex flex-wrap gap-2">
            <form action={simulateOpenAction}>
              <input type="hidden" name="id" value={share.id} />
              <button className="btn-primary text-sm" disabled={share.opens > 0}>{share.opens > 0 ? `Abierto (${share.opens})` : "Simular apertura"}</button>
            </form>
            <a href={url} target="_blank" rel="noopener" className="btn-ghost text-sm">Abrir el brochure ↗</a>
          </div>
        </div>
      )}
    </div>
  );
}
