import { describe, expect, it } from "vitest";
import { CONTACT_TEMPLATES, dueState, formatDateTimeCl, mailtoLink, renderMessage, santiagoToDate, sourceForChannel, waLink, waPhone } from "./outreach";

describe("mensajes prearmados", () => {
  it("rellena variables y quita las frases sin datos", () => {
    const t = CONTACT_TEMPLATES.find((x) => x.key === "primer_contacto")!;
    expect(renderMessage(t.body, { nombre: "Camila Rojas", corredor: "Sandra Cáceres", propiedad: "109912" })).toBe(
      "Hola Camila, soy Sandra Cáceres de Bull Haus. Recibimos tu consulta por 109912 y quería ponerme a tu disposición. ¿Te acomoda que conversemos hoy o mañana?",
    );
    expect(renderMessage(t.body, { nombre: "Camila", corredor: "Sandra" })).toBe("Hola Camila, soy Sandra de Bull Haus. Recibimos tu consulta y quería ponerme a tu disposición. ¿Te acomoda que conversemos hoy o mañana?");
  });
  it("ningún mensaje pide documentos ni habla de crédito o descuentos", () => {
    for (const t of CONTACT_TEMPLATES) expect(`${t.subject} ${t.body}`, t.key).not.toMatch(/document|carnet|cédula|crédito|descuento|rebaja/i);
  });
  it("el mensaje para retomar ofrece la baja", () => {
    expect(CONTACT_TEMPLATES.find((t) => t.key === "sin_respuesta")!.body).toContain("BAJA");
  });
});

describe("enlaces", () => {
  it("normaliza celulares chilenos y arma wa.me y mailto", () => {
    expect(waPhone("+56 9 9200 0211")).toBe("56992000211");
    expect(waPhone("9 9200 0211")).toBe("56992000211");
    expect(waPhone("123")).toBeNull();
    expect(waLink("Hola a todos", "+56 9 9200 0211")).toBe("https://wa.me/56992000211?text=Hola%20a%20todos");
    expect(waLink("Hola")).toBe("https://wa.me/?text=Hola");
    expect(mailtoLink("a@b.cl", "Asunto", "Hola")).toBe("mailto:a%40b.cl?subject=Asunto&body=Hola");
  });
  it("asigna la fuente del lead según el canal", () => {
    expect(sourceForChannel("whatsapp")).toBe("whatsapp");
    expect(sourceForChannel("enlace")).toBe("web");
    expect(sourceForChannel(null)).toBe("web");
  });
});

describe("fechas en hora de Santiago", () => {
  it("convierte y formatea en 24 h", () => {
    const d = santiagoToDate("2026-11-12", "15:30");
    expect(formatDateTimeCl(d)).toBe("12/11/2026 15:30");
    expect(formatDateTimeCl(santiagoToDate("2026-07-01", "09:05"))).toBe("01/07/2026 09:05");
  });
  it("marca vencido, hoy y próximo", () => {
    const now = santiagoToDate("2026-11-12", "12:00");
    expect(dueState(santiagoToDate("2026-11-12", "10:00"), now)).toBe("vencido");
    expect(dueState(santiagoToDate("2026-11-12", "18:00"), now)).toBe("hoy");
    expect(dueState(santiagoToDate("2026-11-13", "09:00"), now)).toBe("proximo");
  });
});
