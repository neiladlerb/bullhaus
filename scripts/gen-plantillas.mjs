// Copia las plantillas de docs/contratos/*.md a packages/core para que el back office las use
// sin leer archivos en tiempo de ejecución. Ejecutar tras editar una plantilla:
//   node scripts/gen-plantillas.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = { orden_corretaje: "orden-corretaje.md", carta_oferta: "carta-oferta.md", contrato_arriendo: "contrato-arriendo.md", minuta_promesa: "minuta-promesa.md" };
const out = ["// Generado por scripts/gen-plantillas.mjs desde docs/contratos. No editar a mano.", ""];
out.push("export const CONTRACT_TEMPLATE_SOURCES = {");
for (const [kind, file] of Object.entries(FILES)) {
  const body = readFileSync(join(ROOT, "docs/contratos", file), "utf8").replace(/\r\n/g, "\n");
  const version = /Versión:\s*([^\n]+)/.exec(body)?.[1]?.trim() ?? "0.1";
  out.push(`  ${kind}: { version: ${JSON.stringify(version)}, body: ${JSON.stringify(body)} },`);
}
out.push("} as const;", "");
writeFileSync(join(ROOT, "packages/core/src/contract-templates.generated.ts"), out.join("\n"));
console.log("Plantillas copiadas a packages/core/src/contract-templates.generated.ts");
