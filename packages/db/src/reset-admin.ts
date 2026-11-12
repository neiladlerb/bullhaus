// Restablece la contraseña de un administrador cuando nadie puede entrar al back office.
// Genera una temporal, cierra sus sesiones y la escribe en RESET_OUTPUT_FILE (nunca en pantalla).
import { writeFileSync } from "node:fs";
import { generateTemporaryPassword, hashPassword } from "@bullhaus/core/server";
import { prisma } from "./index";

const email = process.env.RESET_ADMIN_EMAIL?.trim().toLowerCase();
const outFile = process.env.RESET_OUTPUT_FILE;
if (!email || !outFile) {
  console.error("Faltan RESET_ADMIN_EMAIL y RESET_OUTPUT_FILE.");
  process.exit(1);
}

const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { email: true } });
const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, role: "admin" } });
if (!user) {
  console.error(`No hay un administrador con ese email. Administradores: ${admins.map((a) => a.email).join(", ") || "ninguno"}`);
  process.exit(2);
}

const temporary = generateTemporaryPassword();
await prisma.$transaction([
  prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(temporary), mustChangePassword: true, passwordChangedAt: new Date(), active: true },
  }),
  prisma.session.deleteMany({ where: { userId: user.id } }),
  prisma.auditLog.create({ data: { tenantId: user.tenantId, actorId: null, action: "user.password.reset", entity: "user", entityId: user.id, payload: { email: user.email, via: "script" } } }),
]);
writeFileSync(outFile, `# Acceso al back office. Borra este archivo después de entrar.\nEMAIL=${user.email}\nPASSWORD=${temporary}\n`);
console.log(`Contraseña de ${user.email} restablecida.`);
await prisma.$disconnect();
