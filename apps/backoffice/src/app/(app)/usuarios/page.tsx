import { ROLES, ROLE_LABELS } from "@bullhaus/core";
import { prisma } from "@bullhaus/db";
import { requireUser } from "@/lib/auth";
import { updateUserAction } from "./actions";
import { CreateUserForm } from "./create-user-form";
import { ResetPassword } from "./reset-password";

export default async function UsersPage() {
  const admin = await requireUser("users.manage");
  const users = await prisma.user.findMany({
    where: { tenantId: admin.tenantId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { properties: true } } },
  });

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <p className="mt-1 text-sm text-muted">Corredores y equipo de Bull Haus. Cada cambio queda en la auditoría.</p>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 font-medium">Nuevo usuario</h2>
        <CreateUserForm />
      </section>

      <section className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Propiedades</th>
              <th className="px-4 py-3 font-medium">Rol y estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "text-muted"}>
                <td className="px-4 py-3">
                  <span className="font-medium">{u.name}</span>
                  <span className="block text-xs text-muted">{u.email}{u.phone ? ` · ${u.phone}` : ""}</span>
                  {u.mustChangePassword && u.active && <span className="mt-1 inline-block text-xs text-amber-800">Con contraseña temporal</span>}
                  {u.id !== admin.id && u.active && <ResetPassword userId={u.id} name={u.name} />}
                </td>
                <td className="px-4 py-3 tabular-nums">{u._count.properties}</td>
                <td className="px-4 py-3">
                  <form action={updateUserAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="input w-auto py-1" disabled={u.id === admin.id} aria-label={`Rol de ${u.name}`}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    <select name="active" defaultValue={u.active ? "si" : "no"} className="input w-auto py-1" disabled={u.id === admin.id} aria-label={`Estado de ${u.name}`}>
                      <option value="si">Activo</option>
                      <option value="no">Inactivo</option>
                    </select>
                    {u.id === admin.id ? <span className="text-xs text-muted">Tú</span> : <button className="btn-ghost py-1">Guardar</button>}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
