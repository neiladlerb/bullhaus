import "server-only";
import { prisma, type Prisma } from "@bullhaus/db";
import type { CurrentUser } from "./auth";

/** Registra una acción en audit_log. Nunca guardar aquí cuerpos de mensajes ni documentos. */
export async function audit(
  user: Pick<CurrentUser, "id" | "tenantId">,
  action: string,
  entity: string,
  entityId?: string,
  payload?: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.auditLog.create({
    data: { tenantId: user.tenantId, actorId: user.id, action, entity, entityId, payload },
  });
}
