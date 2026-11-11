// Levanta un PostgreSQL local sin Docker ni permisos de administrador.
// Datos en .data/pg. Ctrl+C para detenerlo.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const dataDir = resolve(".data/pg");
const firstRun = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "bullhaus",
  password: "bullhaus",
  port: 5433,
  persistent: true,
});

if (firstRun) await pg.initialise();
await pg.start();
if (firstRun) await pg.createDatabase("bullhaus");
console.log("PostgreSQL listo en postgresql://make:make@localhost:5433/make");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
