// Roles y permisos del back office (docs/plataforma.md, sección 3.1).

export const ROLES = ["admin", "corredor", "marketing", "finanzas", "cumplimiento"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  corredor: "Corredor",
  marketing: "Marketing",
  finanzas: "Finanzas",
  cumplimiento: "Cumplimiento",
};

export type Permission =
  | "properties.read"
  | "properties.write"
  | "properties.import"
  | "mandates.write"
  | "users.manage"
  | "audit.read"
  | "leads.read"
  | "leads.write"
  | "campaigns.read"
  | "campaigns.write"
  | "campaigns.approve"
  | "site.import"
  | "demo.manage";

const MATRIX: Record<Role, readonly Permission[]> = {
  admin: [
    "properties.read", "properties.write", "properties.import", "mandates.write", "users.manage", "audit.read",
    "leads.read", "leads.write", "campaigns.read", "campaigns.write", "campaigns.approve", "site.import", "demo.manage",
  ],
  corredor: ["properties.read", "properties.write", "properties.import", "mandates.write", "leads.read", "leads.write", "campaigns.read"],
  // Marketing prepara campañas; aprobarlas (y activar presupuesto) queda en administración.
  marketing: ["properties.read", "leads.read", "campaigns.read", "campaigns.write"],
  finanzas: ["properties.read", "campaigns.read"],
  cumplimiento: ["properties.read"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

/** Un corredor solo ve y edita sus propiedades; el resto de roles con lectura ve todas. */
export function seesOnlyOwnProperties(role: Role): boolean {
  return role === "corredor";
}

export function canEditProperty(user: { id: string; role: Role }, property: { brokerId: string }): boolean {
  if (!can(user.role, "properties.write")) return false;
  return !seesOnlyOwnProperties(user.role) || property.brokerId === user.id;
}
