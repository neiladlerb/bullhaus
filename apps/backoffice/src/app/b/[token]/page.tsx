import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { BULLHAUS_PUBLIC, formatPrice, SALES_PROCESS, TYPE_LABELS, waLink } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth";
import { brochureFacts, brochurePropertySelect, brochureUrl, canShare, captacionShowcase } from "@/lib/brochures";
import { BrochureForm } from "./form";

// Brochure público: se abre desde WhatsApp, redes o email. Se arma con la ficha aprobada; nunca muestra
// la dirección exacta. Mientras no esté aprobado, solo lo ve el equipo de Bull Haus como vista previa.

type Params = { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> };

const load = (token: string) => prisma.brochure.findUnique({ where: { token }, include: { property: { select: brochurePropertySelect } } });

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const b = await load((await params).token);
  if (!b) return { title: "Bull Haus" };
  const cover = (b.property?.media.find((m) => m.isCover) ?? b.property?.media[0])?.sizes as Record<string, string> | undefined;
  return {
    metadataBase: new URL(new URL(await brochureUrl(b.token)).origin),
    title: `${b.title} · Bull Haus`,
    description: b.intro ?? "Bull Haus Propiedades · venta, arriendo y asesoría inmobiliaria",
    robots: { index: false },
    openGraph: { title: b.title, description: b.intro ?? undefined, images: cover?.lg ? [`/media/${cover.lg}`] : undefined },
  };
}


export default async function BrochurePage({ params, searchParams }: Params) {
  const { token } = await params;
  const sp = await searchParams;
  const b = await load(token);
  if (!b) notFound();
  const team = await getCurrentUser();
  const preview = !!team && team.tenantId === b.tenantId;
  const live = canShare(b.status, b.property?.status, b.kind);

  if (!live && !preview) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <p className="text-muted">Este brochure ya no está disponible. Escríbenos por WhatsApp al {BULLHAUS_PUBLIC.whatsapp} y te ayudamos.</p>
        </div>
      </main>
    );
  }

  // Medición: aperturas del enlace y del envío (si viene con ?s=). El equipo no suma aperturas.
  const shareId = sp.s ?? null;
  if (live && !preview) {
    after(async () => {
      await prisma.brochure.update({ where: { id: b.id }, data: { views: { increment: 1 } } });
      if (shareId) {
        const s = await prisma.brochureShare.findFirst({ where: { id: shareId, brochureId: b.id }, select: { openedAt: true } });
        if (s) await prisma.brochureShare.update({ where: { id: shareId }, data: { opens: { increment: 1 }, ...(s.openedAt ? {} : { openedAt: new Date() }) } });
      }
    });
  }

  const p = b.property;
  const photos = (p?.media ?? []).map((m) => (m.sizes as Record<string, string>).lg ?? (m.sizes as Record<string, string>).md).filter(Boolean) as string[];
  const showcase = b.kind === "captacion" ? await captacionShowcase(b.tenantId) : [];
  const heroImg = photos[0] ? `/media/${photos[0]}` : showcase[0] ? `/media/${(showcase[0].media[0]?.sizes as Record<string, string>).lg}` : null;
  const waText = p ? `Hola, vi el brochure de la propiedad ${p.code} y me gustaría coordinar una visita.` : "Hola, vi el brochure de Bull Haus y quiero una valorización de mi propiedad.";
  const brokerWa = waLink(waText, BULLHAUS_PUBLIC.whatsapp);

  return (
    <main className="min-h-screen bg-white">
      {preview && !live && (
        <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">Vista previa para el equipo: este brochure aún no está aprobado y no se puede compartir.</p>
      )}
      {b.isDemo && <p className="bg-violet-600 px-4 py-1.5 text-center text-xs text-white">Brochure de demostración</p>}

      <header className="relative isolate overflow-hidden bg-ink text-white">
        {heroImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImg} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/55 to-black/45" />
        <div className="mx-auto max-w-4xl px-5 pb-10 pt-6">
          <Logo light />
          <div className="pt-24 sm:pt-36">
            <p className="text-xs uppercase tracking-[0.3em] text-white/80">{b.kind === "captacion" ? "Vende o arrienda con Bull Haus" : `${TYPE_LABELS[p!.type]} en ${p!.operation} · ${p!.comuna}`}</p>
            <h1 className="mt-3 text-3xl font-normal leading-tight drop-shadow sm:text-5xl">{b.title}</h1>
            {b.intro && <p className="mt-4 max-w-2xl text-white/85">{b.intro}</p>}
            {p && (
              <p className="mt-5 text-2xl font-semibold">
                {formatPrice(Number(p.price), p.currency)}
                {p.operation === "arriendo" ? " / mes" : ""}
              </p>
            )}
          </div>
        </div>
      </header>

      {p ? (
        <div className="mx-auto max-w-4xl space-y-10 px-5 py-10">
          <section className="flex flex-wrap gap-2">
            {brochureFacts(p).map((f) => (
              <span key={f} className="rounded-full bg-paper px-4 py-2 text-sm">{f}</span>
            ))}
            {p.commonExpensesClp ? <span className="rounded-full bg-paper px-4 py-2 text-sm">Gastos comunes {formatPrice(p.commonExpensesClp, "CLP")}</span> : null}
            {p.sector && <span className="rounded-full bg-paper px-4 py-2 text-sm">{p.sector}</span>}
            <span className="rounded-full bg-paper px-4 py-2 text-sm text-muted">Código {p.code}</span>
          </section>

          {photos.length > 1 && (
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.slice(1).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={`/media/${src}`} alt={`Foto ${i + 2} de la propiedad ${p.code}`} loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
              ))}
            </section>
          )}

          {(p.headline || p.description) && (
            <section>
              <h2 className="text-xl font-semibold">La propiedad</h2>
              {p.headline && <p className="mt-2 font-medium">{p.headline}</p>}
              {p.description && <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/85">{p.description}</p>}
            </section>
          )}

          {p.features.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold">Características</h2>
              <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-brand">•</span>{f}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-6 rounded-2xl bg-paper p-6 sm:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-xl font-semibold">Coordina tu visita</h2>
              <p className="mt-2 text-sm text-muted">La dirección exacta se entrega al confirmar la visita.</p>
              <p className="mt-4 text-sm">
                <span className="font-medium">{p.broker.name}</span>
                <br />
                Corredor Bull Haus
              </p>
              <a href={brokerWa} target="_blank" rel="noopener" className="btn-primary mt-4 inline-flex">Escribir por WhatsApp</a>
            </div>
            <BrochureForm token={token} shareId={shareId} owner={false} demo={b.isDemo} />
          </section>
        </div>
      ) : (
        <div className="mx-auto max-w-4xl space-y-12 px-5 py-10">
          <section>
            <h2 className="text-2xl font-light">Así trabajamos <span className="font-semibold">tu propiedad</span></h2>
            <ol className="mt-6 divide-y divide-line border-y border-line">
              {SALES_PROCESS.map((step) => (
                <li key={step.title} className="grid gap-2 py-5 sm:grid-cols-[10rem_1fr]">
                  <h3 className="font-semibold">{step.title}</h3>
                  <div>
                    <p className="text-sm leading-relaxed">{step.tasks.join(". ")}.</p>
                    <p className="mt-1.5 text-xs text-muted"><span className="font-medium text-brand">Tecnología.</span> {step.tech}.</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-light">Dónde estamos</h2>
            <p className="mt-2 text-muted">{BULLHAUS_PUBLIC.zones.join(", ")}. Oficina en {BULLHAUS_PUBLIC.office}.</p>
          </section>

          {showcase.length > 0 && (
            <section>
              <h2 className="text-2xl font-light">Parte de nuestra <span className="font-semibold">cartera</span></h2>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {showcase.map((s) => {
                  const img = (s.media[0]?.sizes as Record<string, string> | undefined)?.md;
                  return (
                    <figure key={s.id} className="overflow-hidden rounded-xl bg-paper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {img && <img src={`/media/${img}`} alt={`${TYPE_LABELS[s.type]} en ${s.comuna}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />}
                      <figcaption className="p-3 text-xs text-muted">{TYPE_LABELS[s.type]} en {s.operation} · {s.comuna}</figcaption>
                    </figure>
                  );
                })}
              </div>
            </section>
          )}

          <section className="grid gap-6 rounded-2xl bg-paper p-6 sm:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="text-xl font-semibold">Pide tu valorización</h2>
              <p className="mt-2 text-sm text-muted">Un corredor te llama para coordinar la visita a tu propiedad.</p>
              <a href={brokerWa} target="_blank" rel="noopener" className="btn-primary mt-4 inline-flex">Escribir por WhatsApp</a>
            </div>
            <BrochureForm token={token} shareId={shareId} owner demo={b.isDemo} />
          </section>
        </div>
      )}

      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        Bull Haus Propiedades · {BULLHAUS_PUBLIC.office} · {BULLHAUS_PUBLIC.instagram}
      </footer>
    </main>
  );
}
