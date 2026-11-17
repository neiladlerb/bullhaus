import { describe, expect, it } from "vitest";
import {
  DEFAULT_AVAILABILITY,
  formatTime,
  formatWhen,
  freeSlots,
  isSlotFree,
  localDayKey,
  milestoneRows,
  nextMilestone,
  normalizeAvailability,
  parseRange,
  visitConfirmationText,
  weekStartKey,
  zonedToUtc,
} from "./agenda";

// Martes 18/11/2026 08:00 en Santiago (horario de verano, UTC-3) = 11:00 UTC.
const now = new Date("2026-11-18T11:00:00Z");
const base = { now, availability: DEFAULT_AVAILABILITY, durationMin: 45, minNoticeHours: 3, busy: [] };

describe("agenda: zona horaria de Santiago", () => {
  it("convierte hora chilena a UTC en verano (UTC-3) y en invierno (UTC-4)", () => {
    expect(zonedToUtc(2026, 11, 20, 11 * 60).toISOString()).toBe("2026-11-20T14:00:00.000Z");
    expect(zonedToUtc(2026, 6, 15, 11 * 60).toISOString()).toBe("2026-06-15T15:00:00.000Z");
  });

  it("muestra la hora y el día en Santiago", () => {
    const d = new Date("2026-11-20T14:00:00Z");
    expect(formatTime(d)).toBe("11:00");
    expect(formatWhen(d)).toBe("viernes 20/11/2026 a las 11:00");
    expect(localDayKey(new Date("2026-11-21T02:30:00Z"))).toBe("2026-11-20");
  });

  it("la semana parte el lunes", () => {
    expect(weekStartKey("2026-11-20")).toBe("2026-11-16");
    expect(weekStartKey("2026-11-22")).toBe("2026-11-16");
    expect(weekStartKey("2026-11-16")).toBe("2026-11-16");
  });
});

describe("agenda: disponibilidad", () => {
  it("lee tramos válidos y descarta los que no sirven", () => {
    expect(parseRange("10:00-13:00")).toEqual([600, 780]);
    expect(parseRange("13:00-10:00")).toBeNull();
    expect(parseRange("10-13")).toBeNull();
    const a = normalizeAvailability({ "1": ["09:00-12:00", "malo"], "0": [] });
    expect(a["1"]).toEqual(["09:00-12:00"]);
    expect(a["2"]).toEqual(DEFAULT_AVAILABILITY["2"]);
    expect(normalizeAvailability(null)).toBe(DEFAULT_AVAILABILITY);
  });
});

describe("agenda: horarios libres", () => {
  it("respeta la antelación mínima: hoy a las 08:00 con 3 h, el primer horario es a las 11:00", () => {
    const days = freeSlots(base);
    expect(days[0]!.day).toBe("2026-11-18");
    expect(formatTime(days[0]!.slots[0]!)).toBe("11:00");
  });

  it("no ofrece domingos ni horarios que no caben en el tramo", () => {
    const days = freeSlots(base);
    expect(days.some((d) => d.day === "2026-11-22")).toBe(false);
    const viernes = days.find((d) => d.day === "2026-11-20")!;
    // 15:00-18:00 con 45 min cada 60: 15, 16 y 17 (17:45 cabe), no 18.
    expect(viernes.slots.map(formatTime)).toEqual(["10:00", "11:00", "12:00", "15:00", "16:00", "17:00"]);
  });

  it("una cita ocupada bloquea su horario y el margen de traslado", () => {
    const busy = [{ start: zonedToUtc(2026, 11, 20, 11 * 60), end: zonedToUtc(2026, 11, 20, 11 * 60 + 45) }];
    const viernes = freeSlots({ ...base, busy }).find((d) => d.day === "2026-11-20")!;
    // 11:00 queda tomada; 10:00 (termina 10:45 + 15 de margen) y 12:00 (parte justo al terminar el margen) siguen libres.
    expect(viernes.slots.map(formatTime)).toEqual(["10:00", "12:00", "15:00", "16:00", "17:00"]);
  });

  it("comprueba al guardar que el horario siga libre", () => {
    const slot = zonedToUtc(2026, 11, 20, 15 * 60);
    expect(isSlotFree(slot, base)).toBe(true);
    expect(isSlotFree(slot, { ...base, busy: [{ start: slot, end: new Date(slot.getTime() + 45 * 60_000) }] })).toBe(false);
    expect(isSlotFree(zonedToUtc(2026, 11, 20, 15 * 60 + 30), base)).toBe(false);
  });
});

describe("agenda: confirmación por WhatsApp", () => {
  it("incluye la dirección solo cuando se confirma, con el primer nombre", () => {
    const t = visitConfirmationText({ contactName: "Ana María Pérez", when: new Date("2026-11-20T14:00:00Z"), propertyCode: "BH-1", address: "Av. Ejemplo 1234", brokerName: "Pedro", brandName: "Bull Haus" });
    expect(t).toContain("Hola Ana,");
    expect(t).toContain("viernes 20/11/2026 a las 11:00");
    expect(t).toContain("Dirección: Av. Ejemplo 1234.");
  });
});

describe("agenda: hitos de la propiedad", () => {
  const facts = { hasMandate: true, hasCertificates: false, photoCount: 3, publishedOnWeb: false, doneVisits: 0 };

  it("marca solos los hitos que salen de los datos y deja el resto pendiente", () => {
    const rows = milestoneRows("venta", [{ key: "tasacion", doneAt: new Date("2026-11-01"), dueAt: null }], facts, now);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.tasacion!.doneAt).not.toBeNull();
    expect(byKey.mandato!.doneAt).not.toBeNull();
    expect(byKey.fotos!.doneAt).not.toBeNull();
    expect(byKey.certificados!.doneAt).toBeNull();
    expect(nextMilestone(rows)!.key).toBe("certificados");
  });

  it("un hito automático no se marca a mano si los datos dicen lo contrario", () => {
    const rows = milestoneRows("arriendo", [{ key: "publicada_web", doneAt: new Date(), dueAt: null }], facts, now);
    expect(rows.find((r) => r.key === "publicada_web")!.doneAt).toBeNull();
    expect(rows.at(-1)!.key).toBe("entrega");
  });
});
