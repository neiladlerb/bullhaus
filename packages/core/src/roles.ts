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
  | "audit.read";

const MATRIX: Record<Role, readonly Permission[]> = {
  admin: ["properties.read", "properties.write", "properties.import", "mandates.write", "users.manage", "audit.read"],
  corredor: ["properties.read", "properties.write", "properties.import", "mandates.write"],
  marketing: ["properties.read"],
  finanzas: ["properties.read"],
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
