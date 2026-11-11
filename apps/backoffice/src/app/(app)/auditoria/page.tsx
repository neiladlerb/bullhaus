import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";

const dt = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" });

export default async function AuditPage() {
  const user = await requireUser("audit.read");
  const logs = await prisma.auditLog.findMany({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "desc" }, take: 200 });
  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((x): x is string => !!x))];
  const actors = new Map((await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })).map((a) => [a.id, a.name]));

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold">Auditoría</h1>
      <p className="mt-1 text-sm text-muted">Últimas 200 acciones. Hora de Santiago.</p>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Quién</th>
              <th className="px-4 py-3 font-medium">Acción</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap px-4 py-2 tabular-nums">{dt.format(l.createdAt)}</td>
                <td className="px-4 py-2">{l.actorId ? actors.get(l.actorId) ?? "Usuario eliminado" : "Sistema"}</td>
                <td className="px-4 py-2"><code className="text-xs">{l.action}</code></td>
                <td className="px-4 py-2 text-xs text-muted"><code className="break-all">{l.payload ? JSON.stringify(l.payload) : ""}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
