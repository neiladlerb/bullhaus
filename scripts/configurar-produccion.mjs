// Configura producción en un solo paso: pide los datos de Supabase en la terminal,
// los guarda en Vercel, crea los buckets privados, aplica las migraciones y crea el
// administrador. Nunca imprime los valores. Uso:
//   node scripts/configurar-produccion.mjs admin@empresa.cl
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SUPABASE_URL = "https://jdxxbwhhqlgzityzpgez.supabase.co";
const ADMIN_EMAIL = process.argv[2];
const NODE_DIR = dirname(process.execPath);
const isWin = process.platform === "win32";
const bin = (name) => join(NODE_DIR, isWin ? `${name}.cmd` : name);

if (!ADMIN_EMAIL || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ADMIN_EMAIL)) {
  console.error("Indica el email del administrador: node scripts/configurar-produccion.mjs admin@empresa.cl");
  process.exit(1);
}

/** Pide un valor sin mostrarlo en pantalla. */
function ask(question) {
  return new Promise((resolve) => {
    stdout.write(question);
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write(` (${value.length} caracteres)\n`);
          resolve(value.trim());
          return;
        }
        if (ch === "\u0003") process.exit(130);
        if (ch === "\u0008" || ch === "\u007f") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function checkDbUrl(name, url, port) {
  if (!/^postgres(ql)?:\/\//.test(url)) fail(`${name} debe empezar con postgresql://`);
  if (url.includes("[YOUR-PASSWORD]") || url.includes("YOUR-PASSWORD")) fail(`${name}: reemplaza [YOUR-PASSWORD] por la contraseña de la base de datos`);
  if (!url.includes(`:${port}/`)) fail(`${name} debe usar el puerto ${port}. ¿Copiaste la línea correcta?`);
  if (!url.includes("jdxxbwhhqlgzityzpgez")) fail(`${name} no es del proyecto de Supabase de Bull Haus`);
}

function withPoolerParams(url) {
  const u = new URL(url);
  u.searchParams.set("pgbouncer", "true");
  u.searchParams.set("connection_limit", "1");
  return u.toString();
}

function run(cmd, args, opts = {}) {
  // pnpm y npx llaman a "node": aseguramos que el Node portátil esté en el PATH del proceso hijo.
  const baseEnv = opts.env ?? process.env;
  const pathKey = Object.keys(baseEnv).find((k) => k.toLowerCase() === "path") ?? "PATH";
  const env = { ...baseEnv, [pathKey]: `${NODE_DIR}${isWin ? ";" : ":"}${baseEnv[pathKey] ?? ""}` };
  const res = spawnSync(cmd, args, { cwd: ROOT, shell: isWin, encoding: "utf8", ...opts, env });
  return { ok: res.status === 0, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function vercelEnv(name, value, sensitive) {
  for (const env of ["production", "preview"]) {
    const args = ["--yes", "vercel@latest", "env", "add", name, env, "--force"];
    if (sensitive) args.push("--sensitive");
    const res = run(bin("npx"), args, { input: value });
    if (!res.ok) fail(`No se pudo guardar ${name} (${env}) en Vercel`);
  }
  console.log(`  ✓ ${name} guardada en Vercel`);
}

async function createBucket(key, id) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ id, name: id, public: false }),
  });
  if (res.ok) return console.log(`  ✓ bucket privado "${id}" creado`);
  const body = await res.text();
  if (/already exists|Duplicate/i.test(body)) return console.log(`  ✓ bucket "${id}" ya existía`);
  fail(`No se pudo crear el bucket ${id} (estado ${res.status}). ¿Copiaste la clave secreta completa (sb_secret_…)?`);
}

// Direcciones que muestra Supabase en Connect → ORM → Prisma (no son secretas; falta la contraseña).
const POOLED_TEMPLATE = "postgresql://postgres.jdxxbwhhqlgzityzpgez:[YOUR-PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true";
const DIRECT_TEMPLATE = "postgresql://postgres.jdxxbwhhqlgzityzpgez:[YOUR-PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres";

console.log("\nConfiguración de producción de Bull Haus");
console.log("Lo que pegues no se muestra en pantalla. Pega con Ctrl+V y pulsa Enter.\n");

const dbPassword = await ask("1/2 Contraseña de la base de datos (la que elegiste al crear el proyecto en Supabase): ");
if (!dbPassword) fail("La contraseña de la base de datos no puede quedar vacía");
const encoded = encodeURIComponent(dbPassword);
const pooled = POOLED_TEMPLATE.replace("[YOUR-PASSWORD]", encoded);
const direct = DIRECT_TEMPLATE.replace("[YOUR-PASSWORD]", encoded);
checkDbUrl("DATABASE_URL", pooled, 6543);
checkDbUrl("DIRECT_URL", direct, 5432);

console.log("\nSupabase → Project Settings → API Keys → service_role → Reveal → copiar.\n");
const serviceKey = await ask("2/2 Clave secreta (sb_secret_…): ");
if (serviceKey.length < 30) fail("Esa clave es demasiado corta: usa el ícono de copiar de Secret keys");

const databaseUrl = withPoolerParams(pooled);

console.log("\nComprobando la clave con Supabase…");
await createBucket(serviceKey, "fotos");
await createBucket(serviceKey, "documentos");

const dbEnv = { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: direct };

console.log("\nCreando las tablas…");
const migrate = run(bin("pnpm"), ["--filter", "@bullhaus/db", "migrate:deploy"], { env: dbEnv });
if (!migrate.ok) {
  // Muestra el motivo sin secretos: oculta URLs de conexión, la contraseña y la clave.
  const clean = migrate.out
    .replaceAll(dbPassword, "***")
    .replaceAll(encoded, "***")
    .replaceAll(serviceKey, "***")
    .replace(/postgres(ql)?:\/\/\S+/g, "postgresql://***");
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const reason = lines.filter((l) => /P\d{4}|error|failed|authentication|can't reach|timed out|tenant/i.test(l));
  console.error((reason.length ? reason : lines.slice(-8)).slice(0, 8).join("\n"));
  fail("No se pudieron crear las tablas. ¿La contraseña de la base de datos es correcta? No se guardó nada en Vercel.");
}
console.log("  ✓ tablas creadas");

// Solo se guarda en Vercel cuando la contraseña y la clave ya se comprobaron.
console.log("\nGuardando en Vercel…");
vercelEnv("DATABASE_URL", databaseUrl, true);
vercelEnv("DIRECT_URL", direct, true);
vercelEnv("SUPABASE_SERVICE_ROLE_KEY", serviceKey, true);

const password = randomBytes(15).toString("base64url");
console.log("\nCreando el administrador…");
const seed = run(bin("pnpm"), ["--filter", "@bullhaus/db", "seed:env"], {
  env: { ...dbEnv, SEED_ADMIN_EMAIL: ADMIN_EMAIL, SEED_ADMIN_PASSWORD: password },
});
if (!seed.ok) fail("No se pudo crear el administrador.");
const existed = seed.out.includes("ya existe");
if (existed) {
  console.log(`  ✓ ${ADMIN_EMAIL} ya existía: su contraseña no cambió`);
} else {
  const file = join(ROOT, ".env.produccion-admin");
  writeFileSync(file, `# Acceso al back office en Vercel. No subir a git ni compartir.\nEMAIL=${ADMIN_EMAIL}\nPASSWORD=${password}\n`);
  console.log(`  ✓ ${ADMIN_EMAIL} creado. Su contraseña temporal está en ${file}`);
  console.log("    Al entrar por primera vez, el sistema te pedirá elegir una propia.");
}

console.log("\nListo. Vuelve al chat y escribe: listo\n");
