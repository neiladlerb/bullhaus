#!/usr/bin/env node
// Auditor estático del sistema de diseño: busca en el código de apps/web y apps/backoffice los rasgos de la
// lista "Nunca" de SKILL.md y los usos de color o tamaño que tokens.md prohíbe. No reemplaza la revisión en el
// navegador (contraste real, táctil, foco), pero da una cifra comparable entre revisiones y evita retrocesos.
//
// Uso (desde la raíz del repo):
//   node .claude/skills/diseno-bullhaus/scripts/auditar.mjs                  informe por regla, con archivo:línea
//   node .claude/skills/diseno-bullhaus/scripts/auditar.mjs --resumen        solo el conteo por regla
//   node .claude/skills/diseno-bullhaus/scripts/auditar.mjs --base docs/ux/auditoria-base.json
//        compara con la línea base y sale con código 1 si alguna regla subió (lo usa el test de pnpm test)
//   node .claude/skills/diseno-bullhaus/scripts/auditar.mjs --escribir-base docs/ux/auditoria-base.json
//        guarda los conteos actuales como nueva línea base (solo después de bajar cifras, nunca para tapar una subida)
//
// Una línea con el comentario "diseno-ok: <motivo>" queda fuera del conteo. Úsalo solo con motivo real
// (por ejemplo, el verde de la marca WhatsApp en su ícono). Sin dependencias.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PALETA = "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";

/** @type {{ id: string, nivel: "bloquea" | "molesta" | "pulido", regla: string, patron: RegExp, archivos: RegExp, cuando?: (linea: string) => boolean }[]} */
export const REGLAS = [
  {
    id: "texto-chico",
    nivel: "molesta",
    regla: "Texto bajo 13 px (tokens.md, Tipografía)",
    patron: /text-\[(?:[0-9]|1[0-2])(?:\.\d+)?px\]/,
    archivos: /\.tsx$/,
  },
  {
    id: "magenta-con-texto-blanco",
    nivel: "bloquea",
    regla: "Texto blanco sobre brand (3,98): usa brand-dark (tokens.md, Contraste)",
    patron: /\bbg-brand(?![-\w])/,
    archivos: /\.(tsx|css)$/,
    cuando: (l) => /text-white/.test(l) || /@apply/.test(l),
  },
  {
    id: "color-tailwind-suelto",
    nivel: "molesta",
    regla: "Color de la paleta de Tailwind para un estado: usa success, warning, danger o info (tokens.md, Semánticos)",
    patron: new RegExp(`\\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide)-(?:${PALETA})-\\d{2,3}\\b`),
    archivos: /\.tsx$/,
  },
  {
    id: "hex-en-componente",
    nivel: "molesta",
    regla: "Color hex escrito en un componente: usa un token (tokens.md)",
    patron: /(?<![&\w])#[0-9a-fA-F]{6}\b|(?<![&\w])#[0-9a-fA-F]{3}\b(?![\w-])/,
    archivos: /\.tsx$/,
  },
  {
    id: "eyebrow",
    nivel: "pulido",
    regla: "Etiqueta en mayúsculas espaciadas sobre el título (Nunca)",
    patron: /\beyebrow\b|uppercase[^"'`]*tracking-|tracking-[^"'`]*uppercase/,
    archivos: /\.tsx$/,
  },
  {
    id: "puntos-medios",
    nivel: "pulido",
    regla: "Datos unidos con puntos medios: usa jerarquía (Nunca)",
    patron: / · |\{" · "\}|join\(" · "\)/,
    archivos: /\.tsx$/,
  },
  {
    id: "fondo-crema",
    nivel: "pulido",
    regla: "Fondo crema sand: usa paper (Nunca)",
    patron: /\b(?:bg|from|to|via)-sand\b|--color-sand|#f6f3ef|#f4f1ea/i,
    archivos: /\.(tsx|css)$/,
  },
  {
    id: "zoom-o-levitacion",
    nivel: "pulido",
    regla: "Zoom de imagen o tarjeta que sube al pasar el mouse (Nunca)",
    patron: /hover:scale-|hover:-translate-y/,
    archivos: /\.tsx$/,
  },
  {
    id: "flecha-pegada",
    nivel: "pulido",
    regla: "Flecha → pegada al texto (Nunca)",
    patron: /→/,
    archivos: /\.tsx$/,
  },
  {
    id: "transicion-sin-reduced-motion",
    nivel: "pulido",
    regla: "Animación fuera de motion-safe (tokens.md, Movimiento)",
    patron: /\banimate-(?!none)[\w-]+/,
    archivos: /\.tsx$/,
    cuando: (l) => !/motion-safe:animate-/.test(l),
  },
];

const IGNORAR_DIR = new Set(["node_modules", ".next", "dist", "build", "coverage", "generated"]);

function* recorrer(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR_DIR.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* recorrer(p);
    else if (/\.(tsx|css)$/.test(e.name) && !/\.test\./.test(e.name)) yield p;
  }
}

/** Comentarios y líneas de import no cuentan (un "·" en un comentario no es interfaz). */
function esCodigo(linea) {
  const t = linea.trim();
  return !(t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("import ") || t.startsWith("{/*"));
}

/**
 * Recorre apps/web/src, apps/backoffice/src y packages/ui (si existe) y devuelve los hallazgos.
 * @param {string} raiz raíz del repo
 */
export function auditar(raiz) {
  const dirs = ["apps/web/src", "apps/backoffice/src", "packages/ui"].map((d) => join(raiz, d));
  /** @type {{ regla: string, archivo: string, linea: number, texto: string }[]} */
  const hallazgos = [];
  for (const dir of dirs) {
    for (const archivo of recorrer(dir)) {
      const rel = relative(raiz, archivo).split(sep).join("/");
      const lineas = readFileSync(archivo, "utf8").split(/\r?\n/);
      lineas.forEach((l, i) => {
        if (!esCodigo(l) || /diseno-ok:/.test(l)) return;
        for (const r of REGLAS) {
          if (!r.archivos.test(archivo)) continue;
          if (r.patron.test(l) && (!r.cuando || r.cuando(l))) {
            hallazgos.push({ regla: r.id, archivo: rel, linea: i + 1, texto: l.trim().slice(0, 140) });
          }
        }
      });
    }
  }
  return hallazgos;
}

/** Conteo por regla, con todas las reglas presentes (cero incluido) para comparar entre revisiones. */
export function contar(hallazgos) {
  const c = Object.fromEntries(REGLAS.map((r) => [r.id, 0]));
  for (const h of hallazgos) c[h.regla] += 1;
  return c;
}

/** Reglas cuyo conteo subió respecto de la base. */
export function subidas(actual, base) {
  return REGLAS.map((r) => r.id).filter((id) => (actual[id] ?? 0) > (base[id] ?? 0)).map((id) => ({ id, base: base[id] ?? 0, actual: actual[id] }));
}

function main() {
  const raiz = process.cwd();
  const args = process.argv.slice(2);
  const hallazgos = auditar(raiz);
  const conteo = contar(hallazgos);

  const iBase = args.indexOf("--base");
  const iEscribir = args.indexOf("--escribir-base");

  if (iEscribir >= 0) {
    const destino = args[iEscribir + 1];
    writeFileSync(join(raiz, destino), JSON.stringify(conteo, null, 2) + "\n");
    console.log(`Línea base guardada en ${destino}.`);
    return;
  }

  if (iBase >= 0) {
    const base = JSON.parse(readFileSync(join(raiz, args[iBase + 1]), "utf8"));
    const s = subidas(conteo, base);
    for (const r of REGLAS) {
      const b = base[r.id] ?? 0;
      const a = conteo[r.id];
      const marca = a > b ? "SUBIÓ" : a < b ? "bajó " : "igual";
      console.log(`${marca}  ${String(b).padStart(4)} → ${String(a).padStart(4)}  ${r.id}`);
    }
    if (s.length) {
      console.log("\nAlguna regla subió. Corrige el código nuevo; no actualices la base para taparlo.");
      process.exit(1);
    }
    return;
  }

  const total = hallazgos.length;
  for (const r of REGLAS) {
    const propios = hallazgos.filter((h) => h.regla === r.id);
    console.log(`\n[${r.nivel}] ${r.id}: ${propios.length}  ${r.regla}`);
    if (args.includes("--resumen")) continue;
    for (const h of propios.slice(0, 40)) console.log(`  ${h.archivo}:${h.linea}  ${h.texto}`);
    if (propios.length > 40) console.log(`  … y ${propios.length - 40} más`);
  }
  console.log(`\nTotal: ${total} hallazgos.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
