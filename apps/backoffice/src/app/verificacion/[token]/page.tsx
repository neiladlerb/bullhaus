import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@bullhaus/db";
import { Logo } from "@/components/logo";
import { PortalForm } from "./form";

export const metadata: Metadata = { title: "Verificación de identidad · Bull Haus", robots: { index: false } };

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const k = await prisma.kycCase.findUnique({ where: { token }, include: { client: { select: { name: true, nationality: true } }, deal: { select: { parties: { select: { clientId: true, role: true } } } } } });
  if (!k) notFound();
  const role = k.deal?.parties.find((p) => p.clientId === k.clientId)?.role;
  const buyer = role === "comprador" || role === "arrendatario";
  const open = k.status === "enviado" || k.status === "pendiente";

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex justify-center"><Logo /></div>
        {k.isDemo && <p className="mb-4 rounded-md bg-violet-50 px-4 py-2 text-center text-xs text-violet-900">Portal de demostración: no subas documentos reales.</p>}
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Verificación de identidad</h1>
          <p className="mt-1 text-sm text-muted">
            Hola, {k.client.name.split(" ")[0]}. Para avanzar con tu operación, la ley nos pide verificar tu identidad. Toma unos 5 minutos desde el celular. Bull Haus nunca te pedirá documentos por WhatsApp.
          </p>
          <div className="mt-6">
            {open ? <PortalForm token={token} demo={k.isDemo} buyer={buyer} nationality={k.client.nationality ?? ""} /> : <p className="rounded-lg bg-paper p-5 text-sm">Esta verificación ya fue enviada. Gracias.</p>}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted">Tus datos se tratan conforme a la política de privacidad de Bull Haus y se conservan 5 años, como exige la normativa.</p>
      </div>
    </main>
  );
}
