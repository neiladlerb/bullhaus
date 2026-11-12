import "server-only";
import { seesOnlyOwnProperties } from "@bullhaus/core";
import type { Prisma } from "@bullhaus/db";
import type { CurrentUser } from "./auth";

/** Un corredor ve sus leads y los que aún no tienen corredor asignado; el resto, todos. */
export function leadScope(user: CurrentUser): Prisma.LeadWhereInput {
  return seesOnlyOwnProperties(user.role)
    ? { tenantId: user.tenantId, OR: [{ brokerId: user.id }, { brokerId: null }] }
    : { tenantId: user.tenantId };
}

export const DAY = 86_400_000;
export const since = (days: number) => new Date(Date.now() - days * DAY);
