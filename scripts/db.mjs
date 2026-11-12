// Levanta un PostgreSQL local sin Docker ni permisos de administrador.
// Datos en .data/pg. Ctrl+C para detenerlo.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// PG_DATA y PG_PORT permiten levantar otra instancia si la habitual quedó bloqueada.
const dataDir = resolve(process.env.PG_DATA ?? ".data/pg");
const port = Number(process.env.PG_PORT ?? 5433);
const firstRun = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "bullhaus",
  password: "bullhaus",
  port,
  persistent: true,
  // UTF-8 como Supabase; en Windows initdb usaría WIN1252 y rechazaría caracteres válidos.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (firstRun) await pg.initialise();
await pg.start();
if (firstRun) await pg.createDatabase("bullhaus");
console.log(`PostgreSQL listo en postgresql://bullhaus:bullhaus@localhost:${port}/bullhaus`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
