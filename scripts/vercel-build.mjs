// Build del back office en Vercel. En producción aplica antes las migraciones pendientes
// con las variables que Vercel ya tiene (DIRECT_URL), así nadie tiene que manejar la
// contraseña de la base de datos. Las vistas previas no migran.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DIRECT_URL) {
    console.error("Falta DIRECT_URL: no se pueden aplicar las migraciones");
    process.exit(1);
  }
  console.log("Aplicando migraciones pendientes…");
  run("pnpm", ["--filter", "@bullhaus/db", "migrate:deploy"], root);
}

run("pnpm", ["exec", "next", "build"], join(root, "apps", "backoffice"));
