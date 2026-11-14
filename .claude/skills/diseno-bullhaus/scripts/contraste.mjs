#!/usr/bin/env node
// Revisa el contraste WCAG de los colores de marca de una corredora contra los neutros del sistema.
// Uso:
//   node contraste.mjs <brand> <brandDark> <ink>      ej: node contraste.mjs "#EA2B94" "#C8177A" "#3F3F3E"
//   node contraste.mjs --par <texto> <fondo>          ej: node contraste.mjs --par "#5C636B" "#EBF1F5"
// Sin dependencias. Sale con código 1 si algún uso obligatorio no pasa.

const HEX = /^#[0-9a-fA-F]{6}$/;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function check(hex, name) {
  if (!HEX.test(hex ?? "")) {
    console.error(`Color inválido para ${name}: "${hex}". Usa el formato #RRGGBB.`);
    process.exit(2);
  }
}

const fmt = (n) => n.toFixed(2).replace(".", ",");
const args = process.argv.slice(2);

if (args[0] === "--par") {
  const [, fg, bg] = args;
  check(fg, "texto");
  check(bg, "fondo");
  const r = ratio(fg, bg);
  const nivel = r >= 4.5 ? "pasa AA para todo texto" : r >= 3 ? "solo texto grande (≥ 18,66 px negrita) o bordes de controles" : "no pasa: no usar";
  console.log(`${fg} sobre ${bg}: ${fmt(r)} a 1, ${nivel}`);
  process.exit(r >= 3 ? 0 : 1);
}

const [brand, brandDark, ink] = args;
check(brand, "brand");
check(brandDark, "brandDark");
check(ink, "ink");

const WHITE = "#FFFFFF";
const PAPER = "#EBF1F5";

// [descripción, texto, fondo, mínimo, obligatorio]
const usos = [
  ["Botón principal: blanco sobre brandDark", WHITE, brandDark, 4.5, true],
  ["Enlaces y acentos: brandDark sobre blanco", brandDark, WHITE, 4.5, true],
  ["Enlaces sobre fondo: brandDark sobre paper", brandDark, PAPER, 4.5, true],
  ["Texto principal: ink sobre blanco", ink, WHITE, 4.5, true],
  ["Menú oscuro: blanco sobre ink", WHITE, ink, 4.5, true],
  ["Relleno con texto grande: blanco sobre brand", WHITE, brand, 3, false],
  ["Anillo de foco: brand sobre blanco", brand, WHITE, 3, false],
  ["brand sobre ink (no se usa si no pasa)", brand, ink, 3, false],
];

let falla = false;
for (const [desc, fg, bg, min, obligatorio] of usos) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok && obligatorio) falla = true;
  const marca = ok ? "ok   " : obligatorio ? "FALLA" : "evitar";
  console.log(`${marca}  ${fmt(r).padStart(5)}  (mín. ${fmt(min)})  ${desc}`);
}

if (falla) {
  console.log("\nAlgún uso obligatorio no pasa. Oscurece brandDark o ink en la ficha de marca antes de publicar.");
  process.exit(1);
}
console.log("\nTodos los usos obligatorios pasan. Los marcados 'evitar' no se usan en la interfaz de esta corredora.");
