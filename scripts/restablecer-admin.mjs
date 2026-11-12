// Restablece la contraseña de un administrador de producción cuando nadie puede entrar.
// Lee la contraseña de la base de datos desde .env.produccion (llenado en el Bloc de notas),
// deja la contraseña temporal en .env.produccion-admin y borra .env.produccion. Nunca imprime secretos.
// Uso: node scripts/restablecer-admin.mjs admin@empresa.cl
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SECRETS_FILE = join(ROOT, ".env.produccion");
const OUT_FILE = join(ROOT, ".env.produccion-admin");
const EMAIL = process.argv[2];
const NODE_DIR = dirname(process.execPath);
const isWin = process.platform === "win32";
const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

if (!EMAIL) fail("Indica el email: node scripts/restablecer-admin.mjs admin@empresa.cl");
if (!existsSync(SECRETS_FILE)) fail("No existe .env.produccion. Ábrelo en el Bloc de notas y escribe CONTRASENA_BASE_DE_DATOS=...");

const values = Object.fromEntries(
  readFileSync(SECRETS_FILE, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"(.*)"$/, "$1")]),
);
const dbPassword = values.CONTRASENA_BASE_DE_DATOS ?? "";
if (!dbPassword) fail("Falta CONTRASENA_BASE_DE_DATOS en .env.produccion");

const encoded = encodeURIComponent(dbPassword);
const host = "postgres.jdxxbwhhqlgzityzpgez:" + encoded + "@aws-0-eu-west-3.pooler.supabase.com";
const env = {
  ...process.env,
  DATABASE_URL: `postgresql://${host}:6543/postgres?pgbouncer=true&connection_limit=1`,
  DIRECT_URL: `postgresql://${host}:5432/postgres`,
  RESET_ADMIN_EMAIL: EMAIL,
  RESET_OUTPUT_FILE: OUT_FILE,
};
const pathKey = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "PATH";
env[pathKey] = `${NODE_DIR}${isWin ? ";" : ":"}${env[pathKey] ?? ""}`;

const res = spawnSync(join(NODE_DIR, isWin ? "pnpm.cmd" : "pnpm"), ["--filter", "@bullhaus/db", "reset-admin"], { cwd: ROOT, shell: isWin, encoding: "utf8", env });
const out = `${res.stdout ?? ""}${res.stderr ?? ""}`.replaceAll(dbPassword, "***").replaceAll(encoded, "***").replace(/postgres(ql)?:\/\/\S+/g, "postgresql://***");
rmSync(SECRETS_FILE);
console.log("  ✓ .env.produccion borrado");
if (res.status !== 0) {
  const lines = out.split("\n").map((l) => l.trim()).filter((l) => /administrador|P\d{4}|authentication|can't reach|error/i.test(l));
  console.error(lines.slice(0, 6).join("\n"));
  fail("No se pudo restablecer. ¿La contraseña de la base de datos es correcta?");
}
console.log(`  ✓ Contraseña temporal guardada en ${OUT_FILE}`);

// Si la contraseña de la base se cambió en Supabase, Vercel queda al día (si no cambió, no pasa nada).
for (const [name, value] of [["DATABASE_URL", env.DATABASE_URL], ["DIRECT_URL", env.DIRECT_URL]]) {
  for (const target of ["production", "preview"]) {
    const r = spawnSync(join(NODE_DIR, isWin ? "npx.cmd" : "npx"), ["--yes", "vercel@latest", "env", "add", name, target, "--force", "--sensitive"], { cwd: ROOT, shell: isWin, encoding: "utf8", env, input: value });
    if (r.status !== 0) fail(`La contraseña se restableció, pero no se pudo actualizar ${name} en Vercel`);
  }
}
console.log("  ✓ Conexión a la base actualizada en Vercel");
console.log("\nListo. Vuelve al chat y escribe: listo\n");
