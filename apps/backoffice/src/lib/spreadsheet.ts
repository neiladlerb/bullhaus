import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { SHEET_COLUMNS, type SheetRow } from "@bullhaus/core";

/** Lee un .xlsx o .csv y devuelve filas como objetos con los encabezados de la primera fila. */
export async function readSpreadsheet(fileName: string, data: Buffer): Promise<SheetRow[]> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = data.toString("utf8").replace(/^﻿/, "");
    const parsed = Papa.parse<SheetRow>(text, { header: true, skipEmptyLines: true, delimiter: "" });
    return parsed.data;
  }
  if (!lower.endsWith(".xlsx")) throw new Error("Formato no soportado. Sube un archivo .xlsx o .csv");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data as unknown as ArrayBuffer);
  const ws = wb.getWorksheet("Propiedades") ?? wb.worksheets[0];
  if (!ws) return [];

  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.text ?? "").trim();
  });

  const rows: SheetRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj: SheetRow = {};
    headers.forEach((h, col) => {
      if (!h) return;
      const v = row.getCell(col).value;
      obj[h] = cellValue(v);
    });
    rows.push(obj);
  }
  return rows;
}

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return undefined;
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  if (typeof v === "object") {
    if ("result" in v) return cellValue(v.result as ExcelJS.CellValue);
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("hyperlink" in v && typeof v.hyperlink === "string") return v.hyperlink;
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    return undefined;
  }
  return v;
}

/** Planilla modelo descargable con encabezados, una fila de ejemplo e instrucciones. */
export async function buildTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bull Haus back office";
  const ws = wb.addWorksheet("Propiedades");
  ws.columns = SHEET_COLUMNS.map((c) => ({ header: c.key, key: c.key, width: Math.max(14, c.key.length + 4) }));
  ws.addRow(Object.fromEntries(SHEET_COLUMNS.map((c) => [c.key, c.example])));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3F3F3E" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.getColumn("codigo").numFmt = "@";

  const help = wb.addWorksheet("Instrucciones");
  help.columns = [
    { header: "Columna", key: "col", width: 22 },
    { header: "Obligatoria", key: "req", width: 12 },
    { header: "Cómo llenarla", key: "help", width: 70 },
  ];
  help.getRow(1).font = { bold: true };
  for (const c of SHEET_COLUMNS) help.addRow({ col: c.key, req: c.required ? "Sí" : "No", help: c.help });
  help.addRow({});
  help.addRow({ col: "Notas", help: "Una fila por propiedad. Si el código ya existe, la fila actualiza esa propiedad. Borra la fila de ejemplo antes de subir." });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
