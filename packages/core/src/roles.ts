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
  | "demo.manage"
  | "agents.read"
  | "agents.manage"
  | "deals.read"
  | "deals.write"
  | "kyc.read"
  | "kyc.review"
  | "contracts.read"
  | "contracts.write"
  | "billing.read"
  | "billing.approve"
  | "analytics.read"
  | "integrations.read"
  | "brand.manage";

const MATRIX: Record<Role, readonly Permission[]> = {
  admin: [
    "properties.read", "properties.write", "properties.import", "mandates.write", "users.manage", "audit.read",
    "leads.read", "leads.write", "campaigns.read", "campaigns.write", "campaigns.approve", "site.import", "demo.manage",
    "agents.read", "agents.manage", "deals.read", "deals.write", "kyc.read", "contracts.read", "contracts.write", "billing.read",
    "analytics.read", "integrations.read", "brand.manage",
  ],
  corredor: [
    "properties.read", "properties.write", "properties.import", "mandates.write", "leads.read", "leads.write", "campaigns.read",
    "agents.read", "deals.read", "deals.write", "kyc.read", "contracts.read", "contracts.write",
  ],
  // Marketing prepara campañas; aprobarlas (y activar presupuesto) queda en administración.
  marketing: ["properties.read", "leads.read", "campaigns.read", "campaigns.write", "agents.read", "analytics.read"],
  // Solo Finanzas aprueba y emite documentos tributarios; solo Cumplimiento revisa y aprueba KYC (CLAUDE.md).
  finanzas: ["properties.read", "campaigns.read", "deals.read", "billing.read", "billing.approve", "analytics.read"],
  cumplimiento: ["properties.read", "deals.read", "kyc.read", "kyc.review", "contracts.read"],
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
