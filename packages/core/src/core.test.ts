import { describe, expect, it } from "vitest";
import {
  can,
  canEditProperty,
  daysUntil,
  formatDate,
  formatPrice,
  formatRut,
  isValidRut,
  parseChileanDate,
  parseChileanNumber,
  validateSheetRows,
} from "./index";
import { hashPassword, verifyPassword } from "./server";

describe("permisos", () => {
  it("solo admin gestiona usuarios y ve la auditoría", () => {
    expect(can("admin", "users.manage")).toBe(true);
    expect(can("corredor", "users.manage")).toBe(false);
    expect(can("marketing", "audit.read")).toBe(false);
  });

  it("marketing, finanzas y cumplimiento no editan propiedades", () => {
    for (const role of ["marketing", "finanzas", "cumplimiento"] as const) {
      expect(can(role, "properties.read")).toBe(true);
      expect(can(role, "properties.write")).toBe(false);
    }
  });

  it("un corredor solo edita sus propiedades", () => {
    expect(canEditProperty({ id: "a", role: "corredor" }, { brokerId: "a" })).toBe(true);
    expect(canEditProperty({ id: "a", role: "corredor" }, { brokerId: "b" })).toBe(false);
    expect(canEditProperty({ id: "a", role: "admin" }, { brokerId: "b" })).toBe(true);
  });
});

describe("contraseñas", () => {
  it("verifica la correcta y rechaza otra", async () => {
    const h = await hashPassword("una-clave-larga-123");
    expect(await verifyPassword("una-clave-larga-123", h)).toBe(true);
    expect(await verifyPassword("otra", h)).toBe(false);
    expect(await verifyPassword("x", "basura")).toBe(false);
  });
});

describe("formatos chilenos", () => {
  it("formatea precios en UF y pesos", () => {
    expect(formatPrice(18500, "UF")).toBe("UF 18.500");
    expect(formatPrice(1450000, "CLP")).toBe("$1.450.000");
    expect(formatPrice(3250.5, "UF")).toBe("UF 3.250,5");
  });

  it("lee números escritos a la chilena", () => {
    expect(parseChileanNumber("18.500")).toBe(18500);
    expect(parseChileanNumber("1.450.000")).toBe(1450000);
    expect(parseChileanNumber("18.500,5")).toBe(18500.5);
    expect(parseChileanNumber("2,5")).toBe(2.5);
    expect(parseChileanNumber("UF 9.800")).toBe(9800);
    expect(parseChileanNumber(" ")).toBeNull();
    expect(parseChileanNumber("abc")).toBeNull();
  });

  it("lee y escribe fechas dd/mm/aaaa", () => {
    const d = parseChileanDate("01/12/2026");
    expect(d && formatDate(d)).toBe("01/12/2026");
    expect(parseChileanDate("31/02/2026")).toBeNull();
    expect(parseChileanDate("2026-12-01")).toBeNull();
  });

  it("cuenta días hasta una fecha", () => {
    expect(daysUntil(new Date(Date.UTC(2026, 10, 26)), new Date(Date.UTC(2026, 10, 11, 15)))).toBe(15);
  });
});

describe("RUT", () => {
  it("valida el dígito verificador", () => {
    expect(isValidRut("11.111.111-1")).toBe(true);
    expect(isValidRut("76.086.428-5")).toBe(true);
    expect(isValidRut("76.086.428-4")).toBe(false);
    expect(formatRut("760864285")).toBe("76.086.428-5");
  });
});

describe("planilla de propiedades", () => {
  const brokers = new Set(["ana@bullhaus.cl"]);
  const base = {
    codigo: "mk-001",
    operacion: "Venta",
    tipo: "Casa",
    comuna: "Lo Barnechea",
    precio: "18.500",
    moneda: "uf",
    corredor: "ANA@bullhaus.cl",
  };

  it("acepta una fila correcta y normaliza valores", () => {
    const { valid, errors } = validateSheetRows([{ ...base, dormitorios: "4", "Baños": 3, mascotas: "Sí", disponible_desde: "01/12/2026" }], { knownBrokerEmails: brokers });
    expect(errors).toEqual([]);
    expect(valid[0]?.data).toMatchObject({ code: "MK-001", operation: "venta", type: "casa", price: 18500, currency: "UF", bedrooms: 4, bathrooms: 3, pets: "si", status: "borrador", brokerEmail: "ana@bullhaus.cl" });
  });

  it("informa todos los errores de una fila mal formada", () => {
    const { valid, errors } = validateSheetRows([{ ...base, operacion: "permuta", precio: "mucho", dormitorios: "2,5" }], { knownBrokerEmails: brokers });
    expect(valid).toEqual([]);
    expect(errors[0]?.row).toBe(2);
    expect(errors[0]?.messages.join(" | ")).toMatch(/Operación/);
    expect(errors[0]?.messages.join(" | ")).toMatch(/Precio/);
    expect(errors[0]?.messages.join(" | ")).toMatch(/Dormitorios: debe ser un número entero/);
  });

  it("rechaza corredores desconocidos y códigos repetidos", () => {
    const { valid, errors } = validateSheetRows(
      [base, { ...base }, { ...base, codigo: "MK-002", corredor: "otro@bullhaus.cl" }],
      { knownBrokerEmails: brokers },
    );
    expect(valid).toHaveLength(1);
    expect(errors.map((e) => e.row)).toEqual([3, 4]);
    expect(errors[0]?.messages[0]).toMatch(/repetido/);
    expect(errors[1]?.messages[0]).toMatch(/no es un usuario activo/);
  });

  it("ignora filas vacías", () => {
    const { valid, errors } = validateSheetRows([{ codigo: "", comuna: " " }], { knownBrokerEmails: brokers });
    expect(valid).toEqual([]);
    expect(errors).toEqual([]);
  });
});
