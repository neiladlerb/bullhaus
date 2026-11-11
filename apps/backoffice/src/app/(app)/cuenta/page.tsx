import { ROLE_LABELS } from "@bullhaus/core";
import { requireUser } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export default async function AccountPage() {
  const user = await requireUser(undefined, { allowPendingPasswordChange: true });
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Mi cuenta</h1>
      <p className="mt-1 text-sm text-muted">
        {user.name} · {user.email} · {ROLE_LABELS[user.role]}
      </p>

      {user.mustChangePassword && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          Estás usando una contraseña temporal. Elige una propia para seguir usando el back office.
        </div>
      )}

      <section className="card mt-6 p-6">
        <h2 className="mb-4 font-medium">Cambiar contraseña</h2>
        <PasswordForm pending={user.mustChangePassword} />
      </section>
    </div>
  );
}
