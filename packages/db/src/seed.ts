// Crea el tenant de Bull Haus y un administrador inicial. Idempotente.
import { hashPassword } from "@bullhaus/core/server";
import { BrandSchema } from "@bullhaus/core";
import { prisma } from "./index";
import { BULLHAUS_BRAND } from "./marcas/bullhaus";

const email = process.env.SEED_ADMIN_EMAIL ?? "admin@bullhaus.local";
const password = process.env.SEED_ADMIN_PASSWORD;

if (!password || password.length < 12) {
  console.error("Define SEED_ADMIN_PASSWORD (mínimo 12 caracteres) en .env antes de ejecutar el seed.");
  process.exit(1);
}

const tenant = await prisma.tenant.upsert({
  where: { slug: "bullhaus" },
  update: {},
  create: { name: "Bull Haus Intermediación y Gestión Inmobiliaria", slug: "bullhaus" },
});

// Ficha de marca: solo se crea si no existe, para no pisar lo que se editó en el back office.
await prisma.tenantBrand.upsert({
  where: { tenantId: tenant.id },
  update: {},
  create: { tenantId: tenant.id, data: BrandSchema.parse(BULLHAUS_BRAND) },
});

const existing = await prisma.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } });
if (existing) {
  console.log(`El administrador ${email} ya existe.`);
} else {
  await prisma.user.create({
    data: { tenantId: tenant.id, name: "Administrador", email, role: "admin", passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  console.log(`Administrador ${email} creado.`);
}

await prisma.$disconnect();
