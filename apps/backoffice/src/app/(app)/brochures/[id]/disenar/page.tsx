import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BROCHURE_STATUS_LABELS, can, orderedPhotos, parseBrochureDesign, seesOnlyOwnProperties } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { Chip } from "@/components/demo";
import { BROCHURE_TONE } from "@/components/tones";
import { requireUser } from "@/lib/auth";
import { brochureUrl, canShare } from "@/lib/brochures";
import { Designer } from "./designer";

const OK: Record<string, string> = {
  guardado: "Diseño guardado.",
  revision: "Diseño guardado. Como estaba aprobado, volvió a revisión: administración lo tiene que aprobar de nuevo.",
  "sin-cambios": "No había cambios que guardar.",
};

type Sizes = Record<string, string>;

export default async function DisenarBrochurePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser("leads.read");
  if (!can(user.role, "leads.write") && !can(user.role, "campaigns.write")) redirect("/brochures");
  const { id } = await params;
  const sp = await searchParams;
  const b = await prisma.brochure.findFirst({
    where: { id, tenantId: user.tenantId, ...(seesOnlyOwnProperties(user.role) ? { OR: [{ createdById: user.id }, { property: { brokerId: user.id } }] } : {}) },
    include: { property: { select: { code: true, status: true, media: { orderBy: [{ isCover: "desc" }, { order: "asc" }], take: 40, select: { id: true, sizes: true } } } } },
  });
  if (!b || b.status === "archivado") notFound();

  const design = parseBrochureDesign(b.design);
  const media = b.property?.media ?? [];
  const photos = media.map((m) => ({ id: m.id, thumb: `/media/${(m.sizes as Sizes).sm ?? (m.sizes as Sizes).md}` }));
  const cover = orderedPhotos(media, design)[0];
  const coverUrl = cover ? `/media/${(cover.sizes as Sizes).md ?? (cover.sizes as Sizes).lg}` : null;
  const shareable = canShare(b.status, b.property?.status, b.kind);
  const domain = new URL(await brochureUrl(b.token)).host;
  const v = b.updatedAt.getTime();

  return (
    <div className="max-w-7xl space-y-6">
      <div>
        <Link href={`/brochures/${b.id}`} className="text-sm text-muted hover:underline">← {b.title}</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Diseñar brochure</h1>
          <Chip tone={BROCHURE_TONE[b.status]}>{BROCHURE_STATUS_LABELS[b.status]}</Chip>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Elige cómo se ve. Los textos, precio y datos siguen saliendo de la ficha aprobada{b.property ? ` de ${b.property.code}` : ""}; el título y la bajada se cambian en la página del brochure. Nada se publica sin la aprobación de administración.
        </p>
      </div>

      {sp.ok && OK[sp.ok] && <p className="rounded-lg bg-success-soft p-3 text-sm text-success" role="status">{OK[sp.ok]}</p>}

      <Designer id={b.id} token={b.token} kind={b.kind} initial={design} photos={photos} approved={b.status === "aprobado"} />

      <section className="card p-5">
        <h2 className="font-semibold">Cómo se ve en redes</h2>
        <p className="mt-1 text-sm text-muted">
          Con el diseño guardado. {shareable ? "Descarga la imagen y publícala con el enlace del brochure." : "Se pueden descargar cuando el brochure esté aprobado."}
        </p>
        <div className="mt-4 grid gap-6 md:grid-cols-[1fr_0.6fr_1fr] md:items-start">
          <figure>
            <figcaption className="mb-2 text-sm font-medium">Post de Instagram y Facebook (1080 x 1080)</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/b/${b.token}/imagen/post?v=${v}`} alt="Post cuadrado del brochure" className="aspect-square w-full rounded-lg border border-line" loading="lazy" />
            {shareable && <a href={`/b/${b.token}/imagen/post?v=${v}`} download={`bullhaus-${b.property?.code ?? "captacion"}-post.png`} className="btn-ghost mt-2 w-full">Descargar post</a>}
          </figure>
          <figure>
            <figcaption className="mb-2 text-sm font-medium">Historia (1080 x 1920)</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/b/${b.token}/imagen/historia?v=${v}`} alt="Historia vertical del brochure" className="aspect-[9/16] w-full rounded-lg border border-line" loading="lazy" />
            {shareable && <a href={`/b/${b.token}/imagen/historia?v=${v}`} download={`bullhaus-${b.property?.code ?? "captacion"}-historia.png`} className="btn-ghost mt-2 w-full">Descargar historia</a>}
          </figure>
          <figure>
            <figcaption className="mb-2 text-sm font-medium">Al mandar el enlace por WhatsApp</figcaption>
            <div className="rounded-lg bg-success-soft p-3">
              <div className="overflow-hidden rounded-md bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {coverUrl && <img src={coverUrl} alt="" className="aspect-[1.91/1] w-full object-cover" loading="lazy" />}
                <div className="p-3">
                  <p className="text-sm font-semibold">{b.title}, Bull Haus</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{b.intro ?? "Bull Haus Propiedades: venta, arriendo y asesoría inmobiliaria"}</p>
                  <p className="mt-1 text-xs text-muted">{domain}</p>
                </div>
              </div>
            </div>
          </figure>
        </div>
      </section>
    </div>
  );
}
