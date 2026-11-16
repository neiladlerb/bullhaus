// Trinquete del sistema de diseño: ninguna regla del auditor de diseno-bullhaus puede subir respecto de la
// línea base. Si una mejora baja cifras, se actualiza la base con:
//   node .claude/skills/diseno-bullhaus/scripts/auditar.mjs --escribir-base docs/ux/auditoria-base.json
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { auditar, contar, subidas } from "../.claude/skills/diseno-bullhaus/scripts/auditar.mjs";

const raiz = fileURLToPath(new URL("..", import.meta.url));

describe("sistema de diseño", () => {
  it("ninguna regla del auditor sube respecto de docs/ux/auditoria-base.json", () => {
    const base = JSON.parse(readFileSync(new URL("../docs/ux/auditoria-base.json", import.meta.url), "utf8"));
    const actual = contar(auditar(raiz));
    expect(subidas(actual, base)).toEqual([]);
  });

  it("los botones de acción principal no usan texto blanco sobre brand", () => {
    const actual = contar(auditar(raiz));
    expect(actual["magenta-con-texto-blanco"]).toBe(0);
  });
});
